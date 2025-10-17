import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { Usuario } from './Usuario'; // Importar la entidad Usuario
import { TipoOtp } from './TipoOtp'; // ¡Importar la nueva entidad TipoOtp!

@Entity('otps') // Nombre de la tabla en la base de datos
export class Otp {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: false })
  id_usuario!: number; // Clave foránea al usuario asociado al OTP

  // CAMBIO: Ahora referencia a la nueva entidad TipoOtp
  @Column({ type: 'int', nullable: false })
  id_tipo_otp!: number; // Clave foránea al tipo de OTP

  @Column({ type: 'varchar', length: 10, nullable: false })
  codigo!: string; // El código OTP generado (ej. "123456")

  @Column({ type: 'datetime2', nullable: false })
  expira_en!: Date; // Fecha y hora en que expira el OTP



  @Column({ type: 'bit', default: false, nullable: false })
  usado!: boolean; // Indica si el OTP ya fue utilizado (0 = no, 1 = sí)

  //@CreateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  //creado_en!: Date;

  @Column({ type: 'datetime' })
    creado_en!: Date;
  
  @BeforeInsert()
    setTimestamp1() {
      this.creado_en = new Date(); // new Date() usa la hora local del servidor
  }

  // Relación ManyToOne con Usuario
  @ManyToOne(() => Usuario, (usuario) => usuario.otps)
  @JoinColumn({ name: 'id_usuario' })
  usuario!: Usuario;

  // NUEVA RELACIÓN: ManyToOne con TipoOtp
  // Esto permite a TypeORM cargar el objeto TipoOtp completo cuando se carga un Otp.
  @ManyToOne(() => TipoOtp, (tipoOtp) => tipoOtp.otps)
  @JoinColumn({ name: 'id_tipo_otp' })
  tipoOtp!: TipoOtp;
}
