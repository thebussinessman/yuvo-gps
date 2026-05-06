
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DbService implements OnModuleDestroy {
  private pool: Pool;

  constructor() {
    const password = process.env.DB_PASS;
    if (typeof password !== 'string') {
      throw new Error('DB_PASS is not set or not a string');
    }

    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER,
      password,
      database: process.env.DB_NAME,
      max: 10,
    });
  }

  query(text: string, params?: any[]): Promise<QueryResult> {
    return this.pool.query(text, params);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}


