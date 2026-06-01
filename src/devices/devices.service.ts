import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DbService } from '../ingestion/db.service';

@Injectable()
export class DevicesService {
  constructor(private readonly db: DbService) {}

  // GET /api/devices — return all registered devices
  async getAll() {
    const result = await this.db.query(
      `SELECT imei, label, sim_card AS "simCard", vehicle_type AS "vehicleType",
              notes, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM devices
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  // GET /api/devices/:imei
  async getOne(imei) {
    const result = await this.db.query(
      `SELECT imei, label, sim_card AS "simCard", vehicle_type AS "vehicleType",
              notes, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM devices
       WHERE imei = $1`,
      [imei]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException(`Device ${imei} not found`);
    }
    return result.rows[0];
  }

  // POST /api/devices
  async create(body) {
    const { imei, label = '', simCard = '', vehicleType = '', notes = '' } = body;

    if (!imei) {
      return { error: 'imei is required' };
    }

    // Check for duplicate
    const existing = await this.db.query(
      'SELECT imei FROM devices WHERE imei = $1',
      [imei]
    );
    if (existing.rows.length > 0) {
      throw new ConflictException(`Device with IMEI ${imei} already exists`);
    }

    const result = await this.db.query(
      `INSERT INTO devices (imei, label, sim_card, vehicle_type, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING imei, label, sim_card AS "simCard", vehicle_type AS "vehicleType",
                 notes, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [imei, label, simCard, vehicleType, notes]
    );
    return result.rows[0];
  }

  // PUT /api/devices/:imei
  async update(imei, body) {
    const { label, simCard, vehicleType, notes } = body;

    // Make sure device exists first
    await this.getOne(imei);

    const result = await this.db.query(
      `UPDATE devices
       SET label        = COALESCE($2, label),
           sim_card     = COALESCE($3, sim_card),
           vehicle_type = COALESCE($4, vehicle_type),
           notes        = COALESCE($5, notes),
           updated_at   = NOW()
       WHERE imei = $1
       RETURNING imei, label, sim_card AS "simCard", vehicle_type AS "vehicleType",
                 notes, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [imei, label ?? null, simCard ?? null, vehicleType ?? null, notes ?? null]
    );
    return result.rows[0];
  }

  // DELETE /api/devices/:imei
  async remove(imei) {
    await this.getOne(imei);
    await this.db.query('DELETE FROM devices WHERE imei = $1', [imei]);
    return { success: true };
  }
}