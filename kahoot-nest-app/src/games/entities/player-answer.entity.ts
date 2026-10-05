import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Answer } from '../../quizzes/entities/answer.entity.js';
import { Question } from '../../quizzes/entities/question.entity.js';
import { GamePlayer } from './game-player.entity.js';
import { GameSession } from './game-session.entity.js';

@Entity({ name: 'player_answers' })
@Index('IDX_player_answers_session_id', ['sessionId'])
@Index('IDX_player_answers_player_id', ['playerId'])
@Index(
  'UQ_player_answers_session_player_question',
  ['sessionId', 'playerId', 'questionId'],
  { unique: true },
)
export class PlayerAnswer {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'session_id', type: 'int' })
  sessionId!: number;

  @ManyToOne(() => GameSession, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: GameSession;

  @Column({ name: 'player_id', type: 'int' })
  playerId!: number;

  @ManyToOne(() => GamePlayer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player!: GamePlayer;

  @Column({ name: 'question_id', type: 'int' })
  questionId!: number;

  @ManyToOne(() => Question, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ name: 'answer_id', type: 'int' })
  answerId!: number;

  @ManyToOne(() => Answer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'answer_id' })
  answer!: Answer;

  @Column({ name: 'response_time_ms', type: 'int' })
  responseTimeMs!: number;

  @Column({ name: 'is_correct', type: 'boolean' })
  isCorrect!: boolean;
}