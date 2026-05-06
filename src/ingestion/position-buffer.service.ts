import { Injectable } from '@nestjs/common';

export type Position = {
  imei: string;
  time: Date;
  lat: number;
  lon: number;
  speedKph: number;
  course: number;
  satellites?: number;
  rawProtocol?: number;
};

@Injectable()
export class PositionBufferService {
  private latest = new Map<string, Position>();
  private queue: Position[] = [];

  add(pos: Position) {
    this.latest.set(pos.imei, pos);
    this.queue.push(pos);

    // Safety cap (avoid memory blowups during dev)
    if (this.queue.length > 200_000) {
      this.queue.splice(0, this.queue.length - 200_000);
    }
  }

  getLatest(imei: string): Position | undefined {
    return this.latest.get(imei);
  }

  getLatestAll(): Position[] {
    return Array.from(this.latest.values());
  }

  drain(max = 1000): Position[] {
    if (this.queue.length === 0) return [];
    const n = Math.min(max, this.queue.length);
    return this.queue.splice(0, n);
  }

  queuedCount(): number {
    return this.queue.length;
  }
}

