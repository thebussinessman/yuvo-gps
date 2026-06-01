import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IngestionModule } from './ingestion/ingestion.module';
import { DevicesModule } from './devices/devices.module';

@Module({
  imports: [IngestionModule, DevicesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}