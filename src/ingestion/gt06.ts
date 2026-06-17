// src/ingestion/gt06.ts
// GT06 (a.k.a. Concox/GT06) basics: short frames start with 0x7878 and end with 0x0D0A.
// CRC is CRC-16/X-25 (often called "CRC-ITU" in GT06 docs), which is the REFLECTED variant:
// poly 0x8408 (bit-reverse of 0x1021), init 0xFFFF, final XOR 0xFFFF, lsb-first.

export type Gt06Frame = {
  raw: Buffer;        // full frame: 0x7878 ... 0x0D0A
  length: number;     // length byte value
  protocol: number;   // protocol number (e.g., 0x01 login)
  payload: Buffer;    // protocol-specific info content (excluding serial+crc)
  serial: number;     // 2-byte serial number
};

const START = Buffer.from([0x78, 0x78]);
const STOP = Buffer.from([0x0d, 0x0a]);

export function crc16_itu(buf: Buffer): number {
  // CRC-16/X-25: reflected, poly 0x8408 (reverse of 0x1021), init 0xffff, final XOR 0xffff
  let crc = 0xffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let b = 0; b < 8; b++) {
      if (crc & 0x0001) crc = (crc >> 1) ^ 0x8408;
      else crc = crc >> 1;
    }
  }
  return (~crc) & 0xffff;
}

/**
 * Extract as many complete 0x7878 ... 0x0D0A frames as possible from a rolling buffer.
 * Returns [frames, restBuffer].
 */
export function extractGt06Frames(buffer: Buffer): [Buffer[], Buffer] {
  const frames: Buffer[] = [];
  let buf = buffer;

  while (true) {
    const startIdx = buf.indexOf(START);
    if (startIdx < 0) return [frames, Buffer.alloc(0)];

    // drop junk before start
    if (startIdx > 0) buf = buf.subarray(startIdx);

    const stopIdx = buf.indexOf(STOP, 2);
    if (stopIdx < 0) {
      // incomplete frame
      return [frames, buf];
    }

    const frame = buf.subarray(0, stopIdx + STOP.length);
    frames.push(frame);

    buf = buf.subarray(stopIdx + STOP.length);
    if (buf.length === 0) return [frames, Buffer.alloc(0)];
  }
}

/**
 * Parse a short GT06 frame (0x7878).
 * Frame format (short):
 *  [0-1]  0x78 0x78
 *  [2]    length (L)
 *  [3]    protocol
 *  [4..]  info (L - 5 bytes)  // because protocol(1) + serial(2) + crc(2) = 5
 *  [..]   serial (2 bytes)
 *  [..]   crc (2 bytes)
 *  [end]  0x0D 0x0A
 */
export function parseGt06ShortFrame(frame: Buffer): Gt06Frame | null {
  if (frame.length < 10) return null;
  if (frame[0] !== 0x78 || frame[1] !== 0x78) return null;
  if (frame[frame.length - 2] !== 0x0d || frame[frame.length - 1] !== 0x0a) return null;

  const length = frame[2];
  const protocol = frame[3];

  // Data without start(2) and stop(2): [length .. crc] should be (1 + length) bytes
  // Total frame = 2(start) + 1(length) + length + 2(stop) = length + 5
  // Some devices are strict; others may vary slightly. We'll do a sanity check only:
  if (frame.length !== length + 5) {
    // Still attempt parse, but beware mismatches
  }

  const dataStart = 2;                       // points at length
  const dataEndExclusive = frame.length - 2; // exclude stop
  const data = frame.subarray(dataStart, dataEndExclusive); // [length..crc]

  // data layout: length(1), protocol(1), info(...), serial(2), crc(2)
  if (data.length < 1 + 1 + 2 + 2) return null;

  const infoLen = Math.max(0, data.length - (1 + 1 + 2 + 2));
  const infoStart = 2; // within data: after length+protocol
  const info = data.subarray(infoStart, infoStart + infoLen);

  const serialOffset = infoStart + infoLen;
  const serial = data.readUInt16BE(serialOffset);

  const crcOffset = serialOffset + 2;
  const crcRecv = data.readUInt16BE(crcOffset);

  // CRC is calculated over: length + protocol + info + serial (i.e., data without the crc itself)
  const crcInput = data.subarray(0, crcOffset); // from length to end of serial
  const crcCalc = crc16_itu(crcInput);

  if (crcCalc !== crcRecv) {
    // CRC mismatch: could be different CRC variant on some clones, but most GT06 uses this.
    return null;
  }

  return {
    raw: frame,
    length,
    protocol,
    payload: info,
    serial,
  };
}

/** Login payload contains IMEI in BCD (8 bytes) for most GT06 devices. */
export function decodeImeiFromBcd8(payload: Buffer): string | null {
  if (payload.length < 8) return null;
  const bcd = payload.subarray(0, 8);
  let out = '';
  for (const byte of bcd) {
    const hi = (byte >> 4) & 0x0f;
    const lo = byte & 0x0f;
    out += hi.toString(10);
    out += lo.toString(10);
  }
  // Some devices pad with leading zero; keep last 15 digits if 16 digits produced.
  if (out.length >= 15) out = out.slice(out.length - 15);
  return out;
}

/**
 * Build ACK for a given protocol+serial:
 *  0x7878 0x05 <protocol> <serial:2> <crc:2> 0x0D0A
 * CRC computed over: <length> + <protocol> + <serial:2>
 */
export function buildAck(protocol: number, serial: number): Buffer {
  const length = 0x05;
  const body = Buffer.alloc(1 + 1 + 2); // length + protocol + serial(2)
  body[0] = length;
  body[1] = protocol;
  body.writeUInt16BE(serial & 0xffff, 2);

  const crc = crc16_itu(body); // length+protocol+serial
  const out = Buffer.alloc(2 + body.length + 2 + 2); // start + body + crc + stop
  out[0] = 0x78; out[1] = 0x78;
  body.copy(out, 2);
  out.writeUInt16BE(crc, 2 + body.length);
  out[out.length - 2] = 0x0d;
  out[out.length - 1] = 0x0a;
  return out;
}
export type Gt06PositionDecoded = {
  time: Date;
  lat: number;
  lon: number;
  speedKph: number;
  course: number;
  satellites?: number;
};

/**
 * Decode GT06 Location packet payload for protocol 0x12 (core fields).
 * Payload typical start:
 *  - DateTime 6 bytes: YY MM DD hh mm ss
 *  - GPS info 1 byte: low nibble often = satellites
 *  - Latitude 4 bytes (BE)  / 1800000
 *  - Longitude 4 bytes (BE) / 1800000
 *  - Speed 1 byte (kph)
 *  - Course/Status 2 bytes (BE)
 *
 * Note: Many devices append LBS data after this; we ignore it for now.
 */
export function decodeGt06LocationPayload(payload: Buffer): Gt06PositionDecoded | null {
  // Minimum core length: 6 + 1 + 4 + 4 + 1 + 2 = 18
  if (payload.length < 18) return null;

  const yy = payload[0];
  const mm = payload[1];
  const dd = payload[2];
  const hh = payload[3];
  const mi = payload[4];
  const ss = payload[5];

  const gpsInfo = payload[6];
  const satellites = gpsInfo & 0x0f;

  const latRaw = payload.readUInt32BE(7);
  const lonRaw = payload.readUInt32BE(11);
  const speedKph = payload[15];

  const cs = payload.readUInt16BE(16);
  const course = cs & 0x03ff;

  // Common GT06 bit meaning (varies on clones, but this works for most):
  // bit14: 1 = South, 0 = North — NOT reliable on this device, so we ignore it and force the sign below
  // bit13: 1 = West,  0 = East  — reliable on this device, kept as-is
  const isWest = (cs & 0x2000) !== 0;

  let lat = -Math.abs(latRaw / 1800000); // Zambia is always southern hemisphere — force the sign instead of trusting the South bit
  let lon = lonRaw / 1800000;
  if (isWest) lon = -lon;

  // Convert YY into a full year (assume 2000–2099 for trackers)
  const year = 2000 + yy;
  const time = new Date(Date.UTC(year, mm - 1, dd, hh, mi, ss));

  return { time, lat, lon, speedKph, course, satellites };
}