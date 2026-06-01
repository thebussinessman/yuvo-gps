import { Controller, Get, Post, Put, Delete, Param, Body, Inject } from '@nestjs/common';
import { DevicesService } from './devices.service';

@Controller('api/devices')
export class DevicesController {
  constructor(@Inject(DevicesService) private devicesService: DevicesService) {}

  // GET /api/devices
  @Get()
  getAll() {
    return this.devicesService.getAll();
  }

  // GET /api/devices/:imei
  @Get(':imei')
  getOne(@Param('imei') imei) {
    return this.devicesService.getOne(imei);
  }

  // POST /api/devices
  @Post()
  create(@Body() body) {
    return this.devicesService.create(body);
  }

  // PUT /api/devices/:imei
  @Put(':imei')
  update(@Param('imei') imei, @Body() body) {
    return this.devicesService.update(imei, body);
  }

  // DELETE /api/devices/:imei
  @Delete(':imei')
  remove(@Param('imei') imei) {
    return this.devicesService.remove(imei);
  }
}