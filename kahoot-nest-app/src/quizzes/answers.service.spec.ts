import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Answer } from './entities/answer.entity.js';
import { Question } from './entities/question.entity.js';
import { Quiz } from './entities/quiz.entity.js';
import { AnswersService } from './answers.service.js';

describe('AnswersService', () => {
  const answersRepository = {
    create: vi.fn((answer) => answer),
    save: vi.fn(async (answer) => answer),
    find: vi.fn(),
    findOneBy: vi.fn(),
    remove: vi.fn(),
  };
  const questionsRepository = { findOneBy: vi.fn() };
  const quizzesRepository = { findOneBy: vi.fn() };
  let answersService: AnswersService;

  beforeEach(() => {
    vi.clearAllMocks();
    answersService = new AnswersService(
      answersRepository as unknown as Repository<Answer>,
      questionsRepository as unknown as Repository<Question>,
      quizzesRepository as unknown as Repository<Quiz>,
    );
  });

  it('rejects an answer when its question is not in the supplied quiz', async () => {
    quizzesRepository.findOneBy.mockResolvedValue({ id: 3, creatorId: 17 });
    questionsRepository.findOneBy.mockResolvedValue(null);

    await expect(
      answersService.create(17, 3, 8, {
        text: 'Four',
        isCorrect: true,
        position: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(answersRepository.save).not.toHaveBeenCalled();
  });

  it('creates an answer with its question relationship', async () => {
    quizzesRepository.findOneBy.mockResolvedValue({ id: 3, creatorId: 17 });
    questionsRepository.findOneBy.mockResolvedValue({ id: 8, quizId: 3 });

    await answersService.create(17, 3, 8, {
      text: 'Four',
      isCorrect: true,
      position: 1,
    });

    expect(answersRepository.create).toHaveBeenCalledWith({
      text: 'Four',
      isCorrect: true,
      position: 1,
      questionId: 8,
      question: { id: 8 },
    });
    expect(answersRepository.save).toHaveBeenCalled();
  });
});