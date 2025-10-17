import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne, 
  JoinColumn,
  CreateDateColumn,
  OneToOne // Importamos OneToOne
} from 'typeorm';

import { Rol } from './Rol';
import { Otp } from './Otp';
import { Cliente } from './Cliente'; // Importamos la entidad Cliente

@Entity('usuarios')
export class Usuario {
 @PrimaryGeneratedColumn()
 id!: number;
 @Column({ type: 'varchar', length: 255, nullable: false })
 nombre!: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  correo!: string;

  @Column({ type: 'text', nullable: false })
  contrasena!: string;

  @Column({ type: 'int', nullable: false })
  id_rol!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  numero_telefono!: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  numero_identificacion!: string;

  @CreateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  creado_en!: Date;

  @Column({ type: 'tinyint', default: 1, nullable: false })
  activo!: number;

  @Column({ type: 'tinyint', default: 0, nullable: false })
  esta_verificado!: number;

  @Column({ type: 'tinyint', default: 0, nullable: false })
  autenticacion_dos_pasos_activa!: number;

  // --- Relaciones ---
  // Relación OneToOne con la entidad Cliente (¡la nueva!)
  @OneToOne(() => Cliente, (cliente) => cliente.usuario)
  cliente!: Cliente;

  @ManyToOne(() => Rol, (rol) => rol.usuarios)
  @JoinColumn({ name: 'id_rol' })
  rol!: Rol;

  
  @OneToMany(() => Otp, (otp) => otp.usuario)
  otps!: Otp[];
  
    // Esta propiedad 'empleados' se ve como un remanente, puedes eliminarla o actualizarla
    // si es parte de otra relación.
  empleados: any;
}
