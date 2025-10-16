
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('clientes_no_registrados')
export class ClienteNoRegistrado {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 20, nullable: false, unique: true })
    identificacion!: string;

    @Column({ type: 'varchar', length: 5, name: 'tipo_identificacion', nullable: false }) 
    tipoIdentificacion!: string;

    @Column({ type: 'varchar', length: 255, name: 'nombre_completo' })
    nombreCompleto!: string;

    @Column({ type: 'varchar', length: 150 })
    nombres!: string;

    @Column({ type: 'varchar', length: 150 })
    apellidos!: string;

    @Column({ type: 'varchar', length: 50, name: 'fecha_defuncion', nullable: true })
    fechaDefuncion!: string | null;
    
    @CreateDateColumn({ type: 'datetime2', name: 'fecha_guardado' })
    fechaGuardado!: Date;
}