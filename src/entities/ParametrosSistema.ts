// Importaciones necesarias de TypeORM
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('parametros_sistema')
export class ParametroSistema {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 100, unique: true, nullable: false })
  nombre!: string; // Nombre único del parámetro (ej: 'IVA', 'TasaDescuento')

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  valor_desarrollo!: string | null; // Valor del parámetro en entorno de desarrollo

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  valor_produccion!: string | null; // Valor del parámetro en entorno de producción

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  descripcion!: string | null; // Descripción detallada del parámetro

  @Column({ type: 'int', default: 0, nullable: false })
  activo!: number;

  @CreateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  creado_en!: Date; // Fecha de creación del registro

  @UpdateDateColumn({ type: 'datetime2', default: () => 'GETDATE()', onUpdate: 'GETDATE()' })
  actualizado_en!: Date; // Fecha de la última actualización del registro
}
