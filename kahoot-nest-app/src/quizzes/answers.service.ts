import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAnswerDto } from './dto/create-answer.dto.js';
import { UpdateAnswerDto } from './dto/update-answer.dto.js';
import { Answer } from './entities/answer.entity.js';
import { Question } from './entities/question.entity.js';
import { Quiz } from './entities/quiz.entity.js';

@Injectable()
export class AnswersService {
  constructor(
    @InjectRepository(Answer)
    private readonly answersRepository: Repository<Answer>,
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
    @InjectRepository(Quiz)
    private readonly quizzesRepository: Repository<Quiz>,
  ) {}

  async create(
    creatorId: number,
    quizId: number,
    questionId: number,
    dto: CreateAnswerDto,
  ): Promise<Answer> {
    await this.ensureOwnedQuestion(creatorId, quizId, questionId);
    const answer = this.answersRepository.create({
      text: dto.text,
      isCorrect: dto.isCorrect,
      position: dto.position,
      questionId,
      question: { id: questionId },
    });
    return this.answersRepository.save(answer);
  }

  async findAll(
    creatorId: number,
    quizId: number,
    questionId: number,
  ): Promise<Answer[]> {
    await this.ensureOwnedQuestion(creatorId, quizId, questionId);
    return this.answersRepository.find({
      where: { questionId },
      order: { position: 'ASC' },
    });
  }

  async findOne(
    creatorId: number,
    quizId: number,
    questionId: number,
    id: number,
  ): Promise<Answer> {
    await this.ensureOwnedQuestion(creatorId, quizId, questionId);
    const answer = await this.answersRepository.findOneBy({ id, questionId });
    if (!answer) {
      throw new NotFoundException('Answer not found');
    }
    return answer;
  }

  async update(
    creatorId: number,
    quizId: number,
    questionId: number,
    id: number,
    dto: UpdateAnswerDto,
  ): Promise<Answer> {
    const answer = await this.findOne(creatorId, quizId, questionId, id);
    Object.assign(answer, dto);
    return this.answersRepository.save(answer);
  }

  async remove(
    creatorId: number,
    quizId: number,
    questionId: number,
    id: number,
  ): Promise<void> {
    const answer = await this.findOne(creatorId, quizId, questionId, id);
    await this.answersRepository.remove(answer);
  }

  private async ensureOwnedQuestion(
    creatorId: number,
    quizId: number,
    questionId: number,
  ): Promise<void> {
    const quiz = await this.quizzesRepository.findOneBy({
      id: quizId,
      creatorId,
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const question = await this.questionsRepository.findOneBy({
      id: questionId,
      quizId,
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }
  }
}