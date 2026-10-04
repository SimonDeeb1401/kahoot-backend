import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@Controller()
@ApiTags('Health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Check that the API is running' })
  @ApiOkResponse({ description: 'Health check response', type: String })
  getHello(): string {
    return this.appService.getHello();
  }
}
