import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { TcpGateway } from './tcp.gateway';
import { LiveGateway } from './live.gateway';
import { PositionBufferService } from './position-buffer.service';
import { PositionWriterService } from './position-writer.service';
import { PlaybackController } from './playback.controller';
import { PlaybackService } from './playback.service';
import { DbService } from './db.service';

@Module({
  controllers: [PlaybackController],
  providers: [
    IngestionService,
    TcpGateway,
    LiveGateway,
    PositionBufferService,
    PositionWriterService,
    PlaybackService,
    DbService,
  ],
  exports: [PlaybackService],
})
export class IngestionModule {}