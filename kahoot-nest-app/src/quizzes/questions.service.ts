import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { Question } from './entities/question.entity.js';
import { Quiz } from './entities/quiz.entity.js';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
    @InjectRepository(Quiz)
    private readonly quizzesRepository: Repository<Quiz>,
  ) {}

  async create(
    creatorId: number,
    quizId: number,
    dto: CreateQuestionDto,
  ): Promise<Question> {
    await this.ensureQuizOwner(creatorId, quizId);
    const question = this.questionsRepository.create({
      text: dto.text,
      position: dto.position,
      timeLimit: dto.timeLimit,
      points: dto.points,
      quizId,
      quiz: { id: quizId },
    });
    return this.questionsRepository.save(question);
  }

  async findAll(creatorId: number, quizId: number): Promise<Question[]> {
    await this.ensureQuizOwner(creatorId, quizId);
    return this.questionsRepository.find({
      where: { quizId },
      order: { position: 'ASC' },
    });
  }

  async findOne(
    creatorId: number,
    quizId: number,
    id: number,
  ): Promise<Question> {
    await this.ensureQuizOwner(creatorId, quizId);
    const question = await this.questionsRepository.findOneBy({ id, quizId });
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    return question;
  }

  async update(
    creatorId: number,
    quizId: number,
    id: number,
    dto: UpdateQuestionDto,
  ): Promise<Question> {
    const question = await this.findOne(creatorId, quizId, id);
    Object.assign(question, dto);
    return this.questionsRepository.save(question);
  }

  async remove(creatorId: number, quizId: number, id: number): Promise<void> {
    const question = await this.findOne(creatorId, quizId, id);
    await this.questionsRepository.remove(question);
  }

  private async ensureQuizOwner(
    creatorId: number,
    quizId: number,
  ): Promise<void> {
    const quiz = await this.quizzesRepository.findOneBy({
      id: quizId,
      creatorId,
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
  }
}