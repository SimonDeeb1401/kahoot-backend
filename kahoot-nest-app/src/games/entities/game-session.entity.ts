import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity.js';
import { Quiz } from '../../quizzes/entities/quiz.entity.js';

@Entity({ name: 'game_sessions' })
@Index('IDX_game_sessions_quiz_id', ['quizId'])
@Index('UQ_game_sessions_room_code', ['roomCode'], { unique: true })
export class GameSession {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'quiz_id', type: 'int' })
  quizId!: number;

  @ManyToOne(() => Quiz, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz!: Quiz;

  @Column({ name: 'host_id', type: 'int' })
  hostId!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_id' })
  host!: User;

  @Column({ name: 'room_code', type: 'varchar', length: 16 })
  roomCode!: string;

  @Column({ type: 'varchar', length: 32, default: 'waiting' })
  status!: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ name: 'current_question_index', type: 'int', default: 0 })
  currentQuestionIndex!: number;

  @Column({ name: 'current_question_started_at', type: 'timestamptz', nullable: true })
  currentQuestionStartedAt!: Date | null;
}