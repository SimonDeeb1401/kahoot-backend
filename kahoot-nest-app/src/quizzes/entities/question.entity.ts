import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Quiz } from './quiz.entity.js';

@Entity({ name: 'questions' })
@Index('IDX_questions_quizId_position', ['quizId', 'position'])
export class Question {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'int' })
  quizId!: number;

  @ManyToOne(() => Quiz, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz!: Quiz;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'int' })
  position!: number;

  @Column({ type: 'int' })
  timeLimit!: number;

  @Column({ type: 'int' })
  points!: number;
}