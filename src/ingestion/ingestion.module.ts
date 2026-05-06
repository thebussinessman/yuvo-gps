import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { TcpGateway } from './tcp.gateway';
import { PositionBufferService } from './position-buffer.service';
import { DbService } from './db.service';
import { PositionWriterService } from './position-writer.service';
import { PlaybackService } from './playback.service';
import { PlaybackController } from './playback.controller';
import { LiveGateway } from './live.gateway';

@Module({
  providers: [
    IngestionService,
    TcpGateway,
    PositionBufferService,
    DbService,
    PositionWriterService,
    PlaybackService,
    LiveGateway,
  ],
  controllers: [PlaybackController],
})
export class IngestionModule {}
