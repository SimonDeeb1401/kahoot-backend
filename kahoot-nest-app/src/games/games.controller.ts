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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { JwtPayload } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateGamePlayerDto } from './dto/create-game-player.dto.js';
import { JoinGameSessionDto } from './dto/join-game-session.dto.js';
import { UpdateGamePlayerDto } from './dto/update-game-player.dto.js';
import { CreateGameSessionDto } from './dto/create-game-session.dto.js';
import { UpdateGameSessionDto } from './dto/update-game-session.dto.js';
import { CreatePlayerAnswerDto } from './dto/create-player-answer.dto.js';
import { UpdatePlayerAnswerDto } from './dto/update-player-answer.dto.js';
import { GamePlayerResponseDto } from './dto/game-player-response.dto.js';
import { GameSessionResponseDto } from './dto/game-session-response.dto.js';
import {
  JoinedRoomPlayerResponseDto,
  JoinedRoomSummaryResponseDto,
} from './dto/joined-room-response.dto.js';
import { PlayerAnswerResponseDto } from './dto/player-answer-response.dto.js';
import { GamesService } from './games.service.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('game-sessions')
@UseGuards(JwtAuthGuard)
@ApiTags('Game sessions')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a game session' })
  @ApiCreatedResponse({ type: GameSessionResponseDto })
  @ApiResponse({ status: 400, description: 'Request validation failed' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  createSession(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateGameSessionDto,
  ) {
    return this.gamesService.createSession(request.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List game sessions hosted by the authenticated user' })
  @ApiOkResponse({ type: GameSessionResponseDto, isArray: true })
  findSessions(@Req() request: AuthenticatedRequest) {
    return this.gamesService.findSessions(request.user.sub);
  }

  @Get('joined')
  @ApiOperation({ summary: 'List rooms joined by the authenticated user' })
  @ApiOkResponse({ type: JoinedRoomSummaryResponseDto, isArray: true })
  findJoinedRooms(@Req() request: AuthenticatedRequest) {
    return this.gamesService.findJoinedRooms(request.user.sub);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join an open game room' })
  @ApiCreatedResponse({ type: JoinedRoomPlayerResponseDto })
  @ApiResponse({ status: 400, description: 'Request validation failed' })
  @ApiResponse({ status: 404, description: 'Room code is invalid or room is closed' })
  joinRoom(
    @Req() request: AuthenticatedRequest,
    @Body() dto: JoinGameSessionDto,
  ) {
    return this.gamesService.joinRoom(request.user.sub, dto);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get a game session by ID' })
  @ApiParam({ name: 'sessionId', type: Number, example: 1 })
  @ApiOkResponse({ type: GameSessionResponseDto })
  @ApiResponse({ status: 400, description: 'sessionId must be an integer' })
  @ApiResponse({ status: 404, description: 'Game session not found' })
  findSession(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.gamesService.findSession(request.user.sub, sessionId);
  }

  @Patch(':sessionId')
  @ApiOperation({ summary: 'Update a game session' })
  @ApiParam({ name: 'sessionId', type: Number, example: 1 })
  @ApiOkResponse({ type: GameSessionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid sessionId or request body' })
  @ApiResponse({ status: 404, description: 'Game session not found' })
  updateSession(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: UpdateGameSessionDto,
  ) {
    return this.gamesService.updateSession(request.user.sub, sessionId, dto);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a game session' })
  @ApiParam({ name: 'sessionId', type: Number, example: 1 })
  @ApiNoContentResponse({ description: 'Game session deleted' })
  @ApiResponse({ status: 400, description: 'sessionId must be an integer' })
  @ApiResponse({ status: 404, description: 'Game session not found' })
  removeSession(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ): Promise<void> {
    return this.gamesService.removeSession(request.user.sub, sessionId);
  }

  @Post(':sessionId/players')
  @ApiOperation({ summary: 'Add a player to a game session' })
  @ApiParam({ name: 'sessionId', type: Number, example: 1 })
  @ApiCreatedResponse({ type: GamePlayerResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid sessionId or request body' })
  @ApiResponse({ status: 404, description: 'Game session not found' })
  createPlayer(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: CreateGamePlayerDto,
  ) {
    return this.gamesService.createPlayer(request.user.sub, sessionId, dto);
  }

  @Get(':sessionId/players')
  @ApiOperation({ summary: 'List players in a game session' })
  @ApiParam({ name: 'sessionId', type: Number, example: 1 })
  @ApiOkResponse({ type: GamePlayerResponseDto, isArray: true })
  @ApiResponse({ status: 400, description: 'sessionId must be an integer' })
  @ApiResponse({ status: 404, description: 'Game session not found' })
  findPlayers(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.gamesService.findPlayers(request.user.sub, sessionId);
  }

  @Get(':sessionId/players/:playerId')
  @ApiOperation({ summary: 'Get a player in a game session' })
  @ApiParam({ name: 'sessionId', type: Number, example: 1 })
  @ApiParam({ name: 'playerId', type: Number, example: 1 })
  @ApiOkResponse({ type: GamePlayerResponseDto })
  @ApiResponse({ status: 400, description: 'Path IDs must be integers' })
  @ApiResponse({ status: 404, description: 'Game session or player not found' })
  findPlayer(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('playerId', ParseIntPipe) playerId: number,
  ) {
    return this.gamesService.findPlayer(request.user.sub, sessionId, playerId);
  }

  @Patch(':sessionId/players/:playerId')
  @ApiOperation({ summary: 'Update a player in a game session' })
  @ApiParam({ name: 'sessionId', type: Number, example: 1 })
  @ApiParam({ name: 'playerId', type: Number, example: 1 })
  @ApiOkResponse({ type: GamePlayerResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid path IDs or request body' })
  @ApiResponse({ status: 404, description: 'Game session or player not found' })
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
  @ApiOperation({ summary: 'Remove a player from a game session' })
  @ApiParam({ name: 'sessionId', type: Number, example: 1 })
  @ApiParam({ name: 'playerId', type: Number, example: 1 })
  @ApiNoContentResponse({ description: 'Player removed' })
  @ApiResponse({ status: 400, description: 'Path IDs must be integers' })
  @ApiResponse({ status: 404, description: 'Game session or player not found' })
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
  @ApiOperation({ summary: 'Record a player answer' })
  @ApiParam({ name: 'sessionId', type: Number, example: 1 })
  @ApiCreatedResponse({ type: PlayerAnswerResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid sessionId or request body' })
  @ApiResponse({ status: 404, description: 'Game session, player, question, or answer not found' })
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
  @ApiOperation({ summary: 'List recorded answers in a game session' })
  @ApiParam({ name: 'sessionId', type: Number, example: 1 })
  @ApiOkResponse({ type: PlayerAnswerResponseDto, isArray: true })
  @ApiResponse({ status: 400, description: 'sessionId must be an integer' })
  @ApiResponse({ status: 404, description: 'Game session not found' })
  findPlayerAnswers(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.gamesService.findPlayerAnswers(request.user.sub, sessionId);
  }

  @Get(':sessionId/player-answers/:playerAnswerId')
  @ApiOperation({ summary: 'Get a recorded player answer' })
  @ApiParam({ name: 'sessionId', type: Number, example: 1 })
  @ApiParam({ name: 'playerAnswerId', type: Number, example: 1 })
  @ApiOkResponse({ type: PlayerAnswerResponseDto })
  @ApiResponse({ status: 400, description: 'Path IDs must be integers' })
  @ApiResponse({ status: 404, description: 'Game session or player answer not found' })
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
  @ApiOperation({ summary: 'Update a recorded player answer' })
  @ApiParam({ name: 'sessionId', type: Number, example: 1 })
  @ApiParam({ name: 'playerAnswerId', type: Number, example: 1 })
  @ApiOkResponse({ type: PlayerAnswerResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid path IDs or request body' })
  @ApiResponse({ status: 404, description: 'Game session or player answer not found' })
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
  @ApiOperation({ summary: 'Delete a recorded player answer' })
  @ApiParam({ name: 'sessionId', type: Number, example: 1 })
  @ApiParam({ name: 'playerAnswerId', type: Number, example: 1 })
  @ApiNoContentResponse({ description: 'Player answer deleted' })
  @ApiResponse({ status: 400, description: 'Path IDs must be integers' })
  @ApiResponse({ status: 404, description: 'Game session or player answer not found' })
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