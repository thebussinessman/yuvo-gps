import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Position } from './position-buffer.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/live',
})
export class LiveGateway {
  @WebSocketServer()
  server: Server;

  emitLocation(pos: Position) {
    this.server.emit('location', {
      imei:       pos.imei,
      time:       pos.time,
      lat:        pos.lat,
      lon:        pos.lon,
      speedKph:   pos.speedKph,
      course:     pos.course,
      satellites: pos.satellites,
    });
  }
}
