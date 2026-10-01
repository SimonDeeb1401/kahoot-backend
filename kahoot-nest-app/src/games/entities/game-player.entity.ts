import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity.js';
import { GameSession } from './game-session.entity.js';

@Entity({ name: 'game_players' })
@Index('IDX_game_players_session_id', ['sessionId'])
export class GamePlayer {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'session_id', type: 'int' })
  sessionId!: number;

  @ManyToOne(() => GameSession, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: GameSession;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId!: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ type: 'varchar', length: 32 })
  nickname!: string;

  @Column({ type: 'int', default: 0 })
  score!: number;
}