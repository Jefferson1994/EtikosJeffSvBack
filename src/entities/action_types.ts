import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { AuditLog } from './audit_logs'; 

@Entity('action_types') 
export class ActionType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true, 
    nullable: false,
  })
  nombre!: string; 

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true, 
  })
  descripcion!: string; 

  @Column({ type: 'tinyint', default: 1, nullable: false })
  activo!: number;


  @OneToMany(() => AuditLog, (log) => log.actionType)
  logs!: AuditLog[];
}