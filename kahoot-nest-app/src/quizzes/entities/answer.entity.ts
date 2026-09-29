import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Question } from './question.entity.js';

@Entity({ name: 'answers' })
@Index('IDX_answers_questionId_position', ['questionId', 'position'])
export class Answer {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'int' })
  questionId!: number;

  @ManyToOne(() => Question, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question!: Question;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'boolean', default: false })
  isCorrect!: boolean;

  @Column({ type: 'int' })
  position!: number;
}