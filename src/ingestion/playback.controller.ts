import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlaybackService } from './playback.service';

@Controller('api')
export class PlaybackController {
  constructor(private readonly playback: PlaybackService) {}

  // GET /api/latest
  @Get('latest')
  getLatestAll() {
    return this.playback.getLatestAll();
  }

  // GET /api/latest/:imei
  @Get('latest/:imei')
  getLatestOne(@Param('imei') imei: string) {
    return this.playback.getLatestByImei(imei);
  }

  // GET /api/playback?imei=...&from=...&to=...
  @Get('playback')
  getPlayback(
    @Query('imei') imei: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!imei || !from || !to) {
      return {
        error: 'imei, from, and to query params are required',
      };
    }
    return this.playback.getPlayback(imei, from, to);
  }
}

