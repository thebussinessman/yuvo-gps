import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlaybackService } from './playback.service';

@Controller('api')
export class PlaybackController {
  constructor(private readonly playbackService: PlaybackService) {}

  @Get('latest')
  getLatestPositions() {
    return this.playbackService.getLatestAll();
  }

  @Get('latest/:imei')
  getLatestByImei(@Param('imei') imei: string) {
    return this.playbackService.getLatestByImei(imei);
  }

  @Get('playback')
  getPlayback(
    @Query('imei') imei: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.playbackService.getPlayback(imei, from, to);
  }
}