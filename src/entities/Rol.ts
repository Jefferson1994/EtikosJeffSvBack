import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Usuario } from './Usuario'; // Importar Usuario para la relación

@Entity('roles') // Nombre de la tabla para los roles
export class Rol {
  @PrimaryGeneratedColumn()
  id!: number; // ID autoincremental del rol

  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  nombre!: string; // Nombre del rol (ej. 'Administrador', 'Colaborador')

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null; // Nueva columna: Descripción del rol

  // Indica si el rol está activo (0) o inactivo (1), según tu convención.
  @Column({ type: 'int', default: 0, nullable: false })
  activo!: number;

  @Column({ type: 'int', default: 1, nullable: false })
  visible_registro!: number;

 

  // Relación: Un Rol puede tener muchos Usuarios
  @OneToMany(() => Usuario, (usuario) => usuario.rol)
  usuarios!: Usuario[]; // Usuarios asociados a este rol
}