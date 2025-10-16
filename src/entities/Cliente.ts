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

import { Usuario } from './Usuario'; // Importamos la entidad Usuario

@Entity('clientes')
export class Cliente {
 @PrimaryGeneratedColumn()
 id!: number;

 // Quitamos 'nombre', 'correo' e 'identificacion' porque ya están en Usuario
 // Puedes dejar los campos que son específicos del cliente, como 'direccion'.
 @Column({ type: 'text', nullable: true })
 direccion!: string;

 // --- Relación con Usuario (Nueva) ---
 @OneToOne(() => Usuario, (usuario) => usuario.cliente)
 @JoinColumn({ name: 'id_usuario' }) // La columna 'id_usuario' será la FK
 usuario!: Usuario;

 @Column({ type: 'int', unique: true, nullable: false })
 id_usuario!: number;

 // --- Relaciones existentes ---

}