import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PositionBufferService } from './position-buffer.service';
import { DbService } from './db.service';

@Injectable()
export class PositionWriterService
  implements OnModuleInit, OnModuleDestroy
{
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly buffer: PositionBufferService,
    private readonly db: DbService,
  ) {}

  onModuleInit() {
    // Flush buffer to DB every 500ms
    this.timer = setInterval(() => {
      this.flush().catch(err => {
        console.error('❌ POSITION WRITER ERROR:', err.message);
        console.error(err);
      });
    }, 500);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async flush() {
    const batch = this.buffer.drain(500);

    console.log(
      '📝 Writer flush tick | batch size:',
      batch.length,
    );

    if (batch.length === 0) return;

    // Ensure devices exist
    const imeis = Array.from(new Set(batch.map(p => p.imei)));

    await this.db.query(
      `
      INSERT INTO devices (imei)
      SELECT UNNEST($1::text[])
      ON CONFLICT (imei) DO NOTHING
      `,
      [imeis],
    );

    // Build bulk insert
    const values: any[] = [];
    const rows = batch.map((p, i) => {
      const base = i * 7;
      values.push(
        p.time,          // Date object (pg handles this)
        p.imei,
        p.lat,
        p.lon,
        Math.round(p.speedKph),
        Math.round(p.course),
        p.satellites ?? null,
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4},
               $${base + 5}, $${base + 6}, $${base + 7})`;
    });

    await this.db.query(
      `
      INSERT INTO positions
        (time, imei, lat, lon, speed_kph, course, satellites)
      VALUES ${rows.join(',')}
      `,
      values,
    );

    console.log('💾 Written positions:', batch.length);
  }
}

