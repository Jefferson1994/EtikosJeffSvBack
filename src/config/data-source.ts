import { DataSource } from 'typeorm';
import { Usuario } from '../entities/Usuario';
import { Cliente  } from '../entities/Cliente';
import { Rol } from '../entities/Rol';
import { Otp } from '../entities/Otp';
import { TipoOtp } from '../entities/TipoOtp';
import {ParametroSistema } from '../entities/ParametrosSistema'
import { ActionType } from '../entities/action_types';
import { AuditLog } from '../entities/audit_logs';


//cadeana local
/*export const AppDataSource = new DataSource({
  type: 'mssql',
  host: 'localhost', 
  port: 1433,
  username: 'sa',
  password: 'admin',
  database: 'BdAppControlFinancieroBaberia',
  synchronize:  true,
  logging:  false,
   entities: [
    Usuario,
    Cliente,
    Rol,
    Otp,
    TipoOtp,
    ParametroSistema,
    ActionType,
    AuditLog
  ],
  options: {
    encrypt: false,
    enableArithAbort: true,
  },
});*/


export const AppDataSource = new DataSource({
  // --- Credenciales de Conexión ---
  type: 'mssql',
  host: 'SQL1002.site4now.net',
  port: 1433,
  username: 'db_abf790_bdappjeffetikos_admin',
  password: 'J3FF1994jsv1',
  database: 'db_abf790_bdappjeffetikos',

  // --- Entidades y Sincronización ---
  entities: [
    Usuario,
    Cliente,
    Rol,
    Otp,
    TipoOtp,
    ParametroSistema,
    ActionType,
    AuditLog
  ],
  synchronize: true, // ¡PRECAUCIÓN!, puede borrar datos en producción.
  logging: false,    // 'true' para depurar consultas SQL.

  
  options: {
    encrypt: true, 
    trustServerCertificate: true, 
  },
});
