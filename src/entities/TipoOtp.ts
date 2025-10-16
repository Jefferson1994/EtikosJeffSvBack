import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Otp } from './Otp'; // Importar la entidad Otp

@Entity('tipos_otp') // Nombre de la tabla en la base de datos
export class TipoOtp {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  nombre!: string; // Ej: 'VERIFICACION_CUENTA', 'RECUPERACION_CONTRASENA', 'APERTURA_CAJA'

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null; // Descripción del tipo de OTP

  // CAMPO 'ACTIVO' AÑADIDO
  // tinyint para almacenar 0 o 1, por defecto 1 (activo)
  @Column({ type: 'tinyint', default: 1, nullable: false })
  activo!: number; 

  @OneToMany(() => Otp, (otp) => otp.tipoOtp)
  otps!: Otp[]; // Relación OneToMany con Otp
}