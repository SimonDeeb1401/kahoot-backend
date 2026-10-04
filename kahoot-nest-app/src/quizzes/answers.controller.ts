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
import { CreateAnswerDto } from './dto/create-answer.dto.js';
import { AnswerResponseDto } from './dto/answer-response.dto.js';
import { UpdateAnswerDto } from './dto/update-answer.dto.js';
import { AnswersService } from './answers.service.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('quizzes/:quizId/questions/:questionId/answers')
@UseGuards(JwtAuthGuard)
@ApiTags('Answers')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an answer for a question' })
  @ApiParam({ name: 'quizId', type: Number, example: 1 })
  @ApiParam({ name: 'questionId', type: Number, example: 1 })
  @ApiCreatedResponse({ type: AnswerResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid path IDs or request body' })
  @ApiResponse({ status: 404, description: 'Quiz or question not found' })
  create(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: CreateAnswerDto,
  ) {
    return this.answersService.create(
      request.user.sub,
      quizId,
      questionId,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List answers for a question' })
  @ApiParam({ name: 'quizId', type: Number, example: 1 })
  @ApiParam({ name: 'questionId', type: Number, example: 1 })
  @ApiOkResponse({ type: AnswerResponseDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Path IDs must be integers' })
  @ApiResponse({ status: 404, description: 'Quiz or question not found' })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    return this.answersService.findAll(
      request.user.sub,
      quizId,
      questionId,
    );
  }

  @Get(':answerId')
  @ApiOperation({ summary: 'Get an answer by ID' })
  @ApiParam({ name: 'quizId', type: Number, example: 1 })
  @ApiParam({ name: 'questionId', type: Number, example: 1 })
  @ApiParam({ name: 'answerId', type: Number, example: 1 })
  @ApiOkResponse({ type: AnswerResponseDto })
  @ApiResponse({ status: 400, description: 'Path IDs must be integers' })
  @ApiResponse({ status: 404, description: 'Quiz, question, or answer not found' })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Param('answerId', ParseIntPipe) answerId: number,
  ) {
    return this.answersService.findOne(
      request.user.sub,
      quizId,
      questionId,
      answerId,
    );
  }

  @Patch(':answerId')
  @ApiOperation({ summary: 'Update an answer' })
  @ApiParam({ name: 'quizId', type: Number, example: 1 })
  @ApiParam({ name: 'questionId', type: Number, example: 1 })
  @ApiParam({ name: 'answerId', type: Number, example: 1 })
  @ApiOkResponse({ type: AnswerResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid path IDs or request body' })
  @ApiResponse({ status: 404, description: 'Quiz, question, or answer not found' })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Param('answerId', ParseIntPipe) answerId: number,
    @Body() dto: UpdateAnswerDto,
  ) {
    return this.answersService.update(
      request.user.sub,
      quizId,
      questionId,
      answerId,
      dto,
    );
  }

  @Delete(':answerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an answer' })
  @ApiParam({ name: 'quizId', type: Number, example: 1 })
  @ApiParam({ name: 'questionId', type: Number, example: 1 })
  @ApiParam({ name: 'answerId', type: Number, example: 1 })
  @ApiNoContentResponse({ description: 'Answer deleted' })
  @ApiResponse({ status: 400, description: 'Path IDs must be integers' })
  @ApiResponse({ status: 404, description: 'Quiz, question, or answer not found' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Param('answerId', ParseIntPipe) answerId: number,
  ): Promise<void> {
    return this.answersService.remove(
      request.user.sub,
      quizId,
      questionId,
      answerId,
    );
  }
}