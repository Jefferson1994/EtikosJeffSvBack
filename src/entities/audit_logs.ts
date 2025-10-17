import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { ActionType } from './action_types';

// Enum para estandarizar los estados de las acciones
export enum ActionStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ActionType, (actionType) => actionType.logs)
  @JoinColumn({ name: 'id_accion' })
  actionType!: ActionType;

  @Column({ type: 'int', name: 'id_accion' })
  id_accion!: number;

  @Column({ type: 'int', nullable: true })
  id_usuario!: number | null;

  // --- NUEVOS CAMPOS RECOMENDADOS ---

  @Column({
    type: 'varchar',
    enum: ActionStatus,
    default: ActionStatus.SUCCESS, // Por defecto, asumimos que la acción fue exitosa
  })
  status!: ActionStatus; // ¿La acción tuvo éxito o falló?

  @Column({
    name: 'target_user_id',
    type: 'int',
    nullable: true, // Será nulo si la acción no tiene un usuario objetivo (ej. un login)
  })
  target_user_id!: number | null; // ¿A quién se le aplicó la acción?

  // --- CAMPOS EXISTENTES ---

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address!: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent!: string | null;

  @Column({ type: 'text', nullable: true })
  details!: string | null;

  @Column({ type: 'datetime' })
  timestamp!: Date;

  @BeforeInsert()
  setTimestamp() {
    this.timestamp = new Date(); // new Date() usa la hora local del servidor
  }
}