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
import { CreateQuizDto } from './dto/create-quiz.dto.js';
import { QuizResponseDto } from './dto/quiz-response.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { QuizzesService } from './quizzes.service.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('quizzes')
@UseGuards(JwtAuthGuard)
@ApiTags('Quizzes')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a quiz' })
  @ApiCreatedResponse({ type: QuizResponseDto })
  @ApiResponse({ status: 400, description: 'Request validation failed' })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateQuizDto,
  ) {
    return this.quizzesService.create(request.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List quizzes owned by the authenticated user' })
  @ApiOkResponse({ type: QuizResponseDto, isArray: true })
  findAll(@Req() request: AuthenticatedRequest) {
    return this.quizzesService.findAll(request.user.sub);
  }

  @Get(':quizId')
  @ApiOperation({ summary: 'Get a quiz by ID' })
  @ApiParam({ name: 'quizId', type: Number, example: 1 })
  @ApiOkResponse({ type: QuizResponseDto })
  @ApiResponse({ status: 400, description: 'quizId must be an integer' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
  ) {
    return this.quizzesService.findOne(request.user.sub, quizId);
  }

  @Patch(':quizId')
  @ApiOperation({ summary: 'Update a quiz' })
  @ApiParam({ name: 'quizId', type: Number, example: 1 })
  @ApiOkResponse({ type: QuizResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid ID or request body' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: UpdateQuizDto,
  ) {
    return this.quizzesService.update(request.user.sub, quizId, dto);
  }

  @Delete(':quizId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a quiz' })
  @ApiParam({ name: 'quizId', type: Number, example: 1 })
  @ApiNoContentResponse({ description: 'Quiz deleted' })
  @ApiResponse({ status: 400, description: 'quizId must be an integer' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
  ): Promise<void> {
    return this.quizzesService.remove(request.user.sub, quizId);
  }
}