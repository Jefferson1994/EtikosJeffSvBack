// Importaciones necesarias de TypeORM
/*import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Factura } from './Facturas'; // Importar Factura 
import { Reserva } from './Reserva';
@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nombre!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  identificacion!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  correo!: string;

  @Column({ type: 'text', nullable: true })
  direccion!: string;

  // Relaciones
  @OneToMany(() => Factura, (factura) => factura.cliente)
  facturas!: Factura[];

  @OneToMany(() => Reserva, (reserva) => reserva.cliente)
  reservas!: Reserva[];
}*/

// src/entities/Cliente.ts

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