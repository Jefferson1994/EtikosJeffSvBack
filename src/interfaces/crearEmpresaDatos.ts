
export interface ContactoUbicacionDatos {
  telefono_contacto?: string | null;
  email_contacto?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  pais?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}


export interface CrearEmpresaDatos {
  nombre: string;
  ruc: string; // Obligatorio
  
  descripcion?: string | null;
  activo?: number; // 0 o 1, por defecto 1 en la entidad
  id_tipo_empresa: number; // Obligatorio
  direccion?: string | null;
  horario_apertura: string; // Obligatorio
  horario_cierre: string; // Obligatorio
  id_administrador: number; // Se asigna desde el token
  datos_contacto?: ContactoUbicacionDatos;
  imagenes?: Express.Multer.File[];
}


export interface EstadisticasInventario {
  valorTotalInventario: number;
  totalProductos: number;
  productosConPocoStock: number;
  gananciaPotencial: number;
}
export interface NegocioData {
  nombre: string;
  ruc: string;
  descripcion?: string | null;
  activo?: number;
  id_tipo_empresa: number;
  direccion?: string | null;
  horario_apertura: string;
  horario_cierre: string;
  id_administrador: number;
}
