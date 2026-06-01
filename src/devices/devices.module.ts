
import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DbService } from '../ingestion/db.service';

@Module({
  controllers: [DevicesController],
  providers: [DevicesService, DbService],
})
export class DevicesModule {}