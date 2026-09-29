import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { Question } from './entities/question.entity.js';
import { Quiz } from './entities/quiz.entity.js';
import { QuestionsService } from './questions.service.js';

describe('QuestionsService', () => {
  const questionsRepository = {
    create: vi.fn((question) => question),
    save: vi.fn(async (question) => question),
    find: vi.fn(),
    findOneBy: vi.fn(),
    remove: vi.fn(),
  };
  const quizzesRepository = { findOneBy: vi.fn() };
  let questionsService: QuestionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    questionsService = new QuestionsService(
      questionsRepository as unknown as Repository<Question>,
      quizzesRepository as unknown as Repository<Quiz>,
    );
  });

  it('creates a question under a quiz owned by the authenticated creator', async () => {
    quizzesRepository.findOneBy.mockResolvedValue({ id: 3, creatorId: 17 });
    const dto: CreateQuestionDto = {
      text: 'What is 2 + 2?',
      position: 1,
      timeLimit: 20,
      points: 1000,
    };

    await questionsService.create(17, 3, dto);

    expect(questionsRepository.create).toHaveBeenCalledWith({
      text: dto.text,
      position: dto.position,
      timeLimit: dto.timeLimit,
      points: dto.points,
      quizId: 3,
      quiz: { id: 3 },
    });
    expect(questionsRepository.save).toHaveBeenCalled();
  });

  it('rejects creating a question under a quiz owned by someone else', async () => {
    quizzesRepository.findOneBy.mockResolvedValue(null);

    await expect(
      questionsService.create(17, 3, {
        text: 'Question',
        position: 1,
        timeLimit: 20,
        points: 1000,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(questionsRepository.save).not.toHaveBeenCalled();
  });
});