import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateQuizDto } from './dto/create-quiz.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { Quiz } from './entities/quiz.entity.js';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizzesRepository: Repository<Quiz>,
  ) {}

  create(creatorId: number, dto: CreateQuizDto): Promise<Quiz> {
    const quiz = this.quizzesRepository.create({
      title: dto.title,
      description: dto.description,
      creatorId,
      creator: { id: creatorId },
    });
    return this.quizzesRepository.save(quiz);
  }

  findAll(creatorId: number): Promise<Quiz[]> {
    return this.quizzesRepository.find({
      where: { creatorId },
      order: { createdAt: 'DESC' },
    });
  }

  findOne(creatorId: number, id: number): Promise<Quiz> {
    return this.findOwnedQuiz(creatorId, id);
  }

  async update(
    creatorId: number,
    id: number,
    dto: UpdateQuizDto,
  ): Promise<Quiz> {
    const quiz = await this.findOwnedQuiz(creatorId, id);
    Object.assign(quiz, dto);
    return this.quizzesRepository.save(quiz);
  }

  async remove(creatorId: number, id: number): Promise<void> {
    const quiz = await this.findOwnedQuiz(creatorId, id);
    await this.quizzesRepository.remove(quiz);
  }

  private async findOwnedQuiz(creatorId: number, id: number): Promise<Quiz> {
    const quiz = await this.quizzesRepository.findOneBy({ id, creatorId });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    return quiz;
  }
}