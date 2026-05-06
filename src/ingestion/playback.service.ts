import { Injectable } from '@nestjs/common';
import { DbService } from './db.service';

@Injectable()
export class PlaybackService {
  constructor(private readonly db: DbService) {}

  // Latest position per device
  async getLatestAll() {
    const res = await this.db.query(`
      SELECT DISTINCT ON (imei)
        imei, time, lat, lon, speed_kph, course, satellites
      FROM positions
      ORDER BY imei, time DESC
    `);
    return res.rows;
  }

  // Latest position for one device
  async getLatestByImei(imei: string) {
    const res = await this.db.query(
      `
      SELECT imei, time, lat, lon, speed_kph, course, satellites
      FROM positions
      WHERE imei = $1
      ORDER BY time DESC
      LIMIT 1
      `,
      [imei],
    );
    return res.rows[0] ?? null;
  }

  // Playback history
  async getPlayback(imei: string, from: string, to: string) {
    const res = await this.db.query(
      `
      SELECT imei, time, lat, lon, speed_kph, course, satellites
      FROM positions
      WHERE imei = $1
        AND time BETWEEN $2 AND $3
      ORDER BY time ASC
      `,
      [imei, from, to],
    );
    return res.rows;
  }
}
