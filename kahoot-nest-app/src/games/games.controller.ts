import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateGamePlayerDto } from './dto/create-game-player.dto.js';
import { UpdateGamePlayerDto } from './dto/update-game-player.dto.js';
import { CreateGameSessionDto } from './dto/create-game-session.dto.js';
import { UpdateGameSessionDto } from './dto/update-game-session.dto.js';
import { CreatePlayerAnswerDto } from './dto/create-player-answer.dto.js';
import { UpdatePlayerAnswerDto } from './dto/update-player-answer.dto.js';
import { GamesService } from './games.service.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('game-sessions')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  createSession(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateGameSessionDto,
  ) {
    return this.gamesService.createSession(request.user.sub, dto);
  }

  @Get()
  findSessions(@Req() request: AuthenticatedRequest) {
    return this.gamesService.findSessions(request.user.sub);
  }

  @Get('available')
  findJoinableRooms() {
    return this.gamesService.findJoinableRooms();
  }

  @Get('available/:sessionId')
  findJoinableRoom(
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.gamesService.findJoinableRoom(sessionId);
  }

  @Get(':sessionId')
  findSession(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.gamesService.findSession(request.user.sub, sessionId);
  }

  @Patch(':sessionId')
  updateSession(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: UpdateGameSessionDto,
  ) {
    return this.gamesService.updateSession(request.user.sub, sessionId, dto);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSession(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ): Promise<void> {
    return this.gamesService.removeSession(request.user.sub, sessionId);
  }

  @Post(':sessionId/players')
  createPlayer(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: CreateGamePlayerDto,
  ) {
    return this.gamesService.createPlayer(request.user.sub, sessionId, dto);
  }

  @Get(':sessionId/players')
  findPlayers(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.gamesService.findPlayers(request.user.sub, sessionId);
  }

  @Get(':sessionId/players/:playerId')
  findPlayer(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('playerId', ParseIntPipe) playerId: number,
  ) {
    return this.gamesService.findPlayer(request.user.sub, sessionId, playerId);
  }

  @Patch(':sessionId/players/:playerId')
  updatePlayer(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('playerId', ParseIntPipe) playerId: number,
    @Body() dto: UpdateGamePlayerDto,
  ) {
    return this.gamesService.updatePlayer(
      request.user.sub,
      sessionId,
      playerId,
      dto,
    );
  }

  @Delete(':sessionId/players/:playerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePlayer(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('playerId', ParseIntPipe) playerId: number,
  ): Promise<void> {
    return this.gamesService.removePlayer(
      request.user.sub,
      sessionId,
      playerId,
    );
  }

  @Post(':sessionId/player-answers')
  createPlayerAnswer(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: CreatePlayerAnswerDto,
  ) {
    return this.gamesService.createPlayerAnswer(
      request.user.sub,
      sessionId,
      dto,
    );
  }

  @Get(':sessionId/player-answers')
  findPlayerAnswers(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.gamesService.findPlayerAnswers(request.user.sub, sessionId);
  }

  @Get(':sessionId/player-answers/:playerAnswerId')
  findPlayerAnswer(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('playerAnswerId', ParseIntPipe) playerAnswerId: number,
  ) {
    return this.gamesService.findPlayerAnswer(
      request.user.sub,
      sessionId,
      playerAnswerId,
    );
  }

  @Patch(':sessionId/player-answers/:playerAnswerId')
  updatePlayerAnswer(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('playerAnswerId', ParseIntPipe) playerAnswerId: number,
    @Body() dto: UpdatePlayerAnswerDto,
  ) {
    return this.gamesService.updatePlayerAnswer(
      request.user.sub,
      sessionId,
      playerAnswerId,
      dto,
    );
  }

  @Delete(':sessionId/player-answers/:playerAnswerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePlayerAnswer(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('playerAnswerId', ParseIntPipe) playerAnswerId: number,
  ): Promise<void> {
    return this.gamesService.removePlayerAnswer(
      request.user.sub,
      sessionId,
      playerAnswerId,
    );
  }
}