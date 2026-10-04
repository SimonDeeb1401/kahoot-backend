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
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { QuestionResponseDto } from './dto/question-response.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { QuestionsService } from './questions.service.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('quizzes/:quizId/questions')
@UseGuards(JwtAuthGuard)
@ApiTags('Questions')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a question in a quiz' })
  @ApiParam({ name: 'quizId', type: Number, example: 1 })
  @ApiCreatedResponse({ type: QuestionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid quizId or request body' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  create(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.questionsService.create(request.user.sub, quizId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List questions in a quiz' })
  @ApiParam({ name: 'quizId', type: Number, example: 1 })
  @ApiOkResponse({ type: QuestionResponseDto, isArray: true })
  @ApiResponse({ status: 400, description: 'quizId must be an integer' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
  ) {
    return this.questionsService.findAll(request.user.sub, quizId);
  }

  @Get(':questionId')
  @ApiOperation({ summary: 'Get a question by ID' })
  @ApiParam({ name: 'quizId', type: Number, example: 1 })
  @ApiParam({ name: 'questionId', type: Number, example: 1 })
  @ApiOkResponse({ type: QuestionResponseDto })
  @ApiResponse({ status: 400, description: 'Path IDs must be integers' })
  @ApiResponse({ status: 404, description: 'Quiz or question not found' })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    return this.questionsService.findOne(request.user.sub, quizId, questionId);
  }

  @Patch(':questionId')
  @ApiOperation({ summary: 'Update a question' })
  @ApiParam({ name: 'quizId', type: Number, example: 1 })
  @ApiParam({ name: 'questionId', type: Number, example: 1 })
  @ApiOkResponse({ type: QuestionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid path IDs or request body' })
  @ApiResponse({ status: 404, description: 'Quiz or question not found' })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(
      request.user.sub,
      quizId,
      questionId,
      dto,
    );
  }

  @Delete(':questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a question' })
  @ApiParam({ name: 'quizId', type: Number, example: 1 })
  @ApiParam({ name: 'questionId', type: Number, example: 1 })
  @ApiNoContentResponse({ description: 'Question deleted' })
  @ApiResponse({ status: 400, description: 'Path IDs must be integers' })
  @ApiResponse({ status: 404, description: 'Quiz or question not found' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ): Promise<void> {
    return this.questionsService.remove(request.user.sub, quizId, questionId);
  }
}