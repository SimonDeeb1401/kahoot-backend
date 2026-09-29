import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity.js';
import { QuizzesService } from './quizzes.service.js';

describe('QuizzesService', () => {
  const quizzesRepository = {
    create: vi.fn((quiz) => quiz),
    save: vi.fn(async (quiz) => quiz),
    find: vi.fn(),
    findOneBy: vi.fn(),
    remove: vi.fn(),
  };
  let quizzesService: QuizzesService;

  beforeEach(() => {
    vi.clearAllMocks();
    quizzesService = new QuizzesService(
      quizzesRepository as unknown as Repository<Quiz>,
    );
  });

  it('assigns the authenticated creator when creating a quiz', async () => {
    await quizzesService.create(17, { title: 'Fractions' });

    expect(quizzesRepository.create).toHaveBeenCalledWith({
      title: 'Fractions',
      creatorId: 17,
      creator: { id: 17 },
    });
    expect(quizzesRepository.save).toHaveBeenCalled();
  });

  it('lists only quizzes owned by the authenticated creator', async () => {
    quizzesRepository.find.mockResolvedValue([]);

    await quizzesService.findAll(17);

    expect(quizzesRepository.find).toHaveBeenCalledWith({
      where: { creatorId: 17 },
      order: { createdAt: 'DESC' },
    });
  });

  it('does not expose a quiz owned by another creator', async () => {
    quizzesRepository.findOneBy.mockResolvedValue(null);

    await expect(quizzesService.findOne(17, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});