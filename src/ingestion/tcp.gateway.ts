import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as net from 'net';
import {
  buildAck,
  decodeImeiFromBcd8,
  extractGt06Frames,
  parseGt06ShortFrame,
  decodeGt06LocationPayload,
} from './gt06';
import { PositionBufferService } from './position-buffer.service';
import { LiveGateway } from './live.gateway';

type SocketState = {
  buffer: Buffer;
  imei?: string;
};

@Injectable()
export class TcpGateway implements OnModuleInit, OnModuleDestroy {
  private server!: net.Server;
  private readonly sockets = new Map<net.Socket, SocketState>();

  constructor(
    private readonly posBuffer: PositionBufferService,
    private readonly liveGateway: LiveGateway,
  ) {}

  onModuleInit() {
    this.server = net.createServer((socket) => {
      this.sockets.set(socket, { buffer: Buffer.alloc(0) });

      console.log('📡 Device connected:', socket.remoteAddress);

      socket.on('data', (chunk: Buffer) => {
        const state = this.sockets.get(socket);
        if (!state) return;

        state.buffer = Buffer.concat([state.buffer, chunk]);

        const [frames, rest] = extractGt06Frames(state.buffer);
        state.buffer = rest;

        for (const rawFrame of frames) {
          const parsed = parseGt06ShortFrame(rawFrame);
          if (!parsed) {
            console.log('⚠️ Dropped frame (CRC or format mismatch):', rawFrame.toString('hex'));
            continue;
          }

          const { protocol, payload, serial } = parsed;

          // 0x01 = LOGIN
          if (protocol === 0x01) {
            const imei = decodeImeiFromBcd8(payload);
            state.imei = imei ?? 'unknown';
            console.log(`✅ GT06 LOGIN imei=${state.imei} serial=${serial}`);
            const ack = buildAck(protocol, serial);
            socket.write(ack);
            console.log('↩️ Sent LOGIN ACK:', ack.toString('hex'));
            continue;
          }

          const imei = state.imei ?? 'unauthed';

          // 0x13 = HEARTBEAT
          if (protocol === 0x13) {
            const ack = buildAck(protocol, serial);
            socket.write(ack);
            console.log(`💓 HEARTBEAT imei=${imei} serial=${serial}`);
            continue;
          }

          // 0x12 = GPS LOCATION
          if (protocol === 0x12) {
            const decoded = decodeGt06LocationPayload(payload);
            const ack = buildAck(protocol, serial);
            socket.write(ack);

            if (!decoded) {
              console.log(`⚠️ LOCATION parse failed imei=${imei} payload=${payload.toString('hex')}`);
              continue;
            }

            const pos = {
              imei,
              time:       decoded.time,
              lat:        decoded.lat,
              lon:        decoded.lon,
              speedKph:   decoded.speedKph,
              course:     decoded.course,
              satellites: decoded.satellites,
              rawProtocol: protocol,
            };

            this.posBuffer.add(pos);
            this.liveGateway.emitLocation(pos);

            console.log(
              `🛰️ LOCATION imei=${imei} lat=${decoded.lat.toFixed(6)} lon=${decoded.lon.toFixed(6)} speed=${decoded.speedKph}kph`,
            );
            continue;
          }

          console.log(
            `📦 GT06 frame protocol=0x${protocol.toString(16).padStart(2, '0')} serial=${serial} imei=${imei}`,
          );
        }
      });

      socket.on('close', () => {
        console.log('❌ Device disconnected:', this.sockets.get(socket)?.imei ?? '');
        this.sockets.delete(socket);
      });

      socket.on('error', (err) => {
        console.error('⚠️ Socket error:', err.message);
        this.sockets.delete(socket);
      });
    });

    this.server.listen(5000, () => {
      console.log('🚀 TCP Server listening on port 5000');
    });
  }

  onModuleDestroy() {
    console.log('🛑 Closing TCP server...');
    this.server?.close();
    for (const s of this.sockets.keys()) {
      try { s.destroy(); } catch {}
    }
    this.sockets.clear();
  }
}
