import { AppDataSource } from "../config/data-source";
import { ParametroSistema } from "../entities/ParametrosSistema"; 

const configCache = new Map<string, string | null>();

const env = process.env.NODE_ENV || 'development';

export class ConfigService {

  /**
   * Carga TODOS los parámetros activos de la DB a la caché en memoria.
  */
  static async loadConfig(): Promise<void> {
    try {
      console.log(`--- [ConfigService] Cargando configuración para el entorno: [${env}] ---`);
      
      const parametroRepo = AppDataSource.getRepository(ParametroSistema);
      const parametros = await parametroRepo.find({ where: { activo: 1 } }); // Carga solo los activos

      configCache.clear(); // Limpia la caché por si acaso

      for (const param of parametros) {
        // Lógica clave: Elige el valor correcto basado en el entorno
        const valor = (env === 'production') 
                      ? param.valor_produccion 
                      : param.valor_desarrollo;
        
        // Guarda el valor en la caché
        configCache.set(param.nombre, valor);
      }
      
      console.log(`--- [ConfigService] Configuración cargada: ${configCache.size} parámetros. ---`);

    } catch (error) {
      console.error("Error CRÍTICO al cargar la configuración desde la DB:", (error as Error).message);
      // Detiene la app si no puede cargar la config. Es más seguro.
      throw new Error("No se pudo cargar la configuración inicial. Saliendo.");
    }
  }


  static get(key: string, defaultValue: string = ''): string {
    const value = configCache.get(key);
    // Devuelve el valor si existe y no es nulo, de lo contrario usa el default
    return value ?? defaultValue; 
  }


  static getNumber(key: string, defaultValue: number = 0): number {
    const value = configCache.get(key);
    if (value === undefined || value === null) {
      return defaultValue;
    }
    // Convierte el string a número. 
    return parseInt(value, 10) || defaultValue;
  }
}