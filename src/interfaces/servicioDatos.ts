export interface CrearActualizarServicioDatos {
  nombre: string;
  descripcion?: string | null;
  precio: number;
  precio_descuento?: number | null; 
  porcentaje_descuento?: number | null; 
  porcentaje_comision_colaborador: number;
  activo?: number; 
  id_negocio: number; 
  id_tipo_servicio: number; 
  duracion_minutos: number;
  imagenes?: Express.Multer.File[];
}

export interface ServicioData {
  nombre: string;
  descripcion?: string | null;
  precio_compra: number;
  precio_venta: number;
  precio_promocion?: number | null;
  precio_descuento?: number | null;
  stock_actual?: number; 
  id_negocio: number; 
  id_tipo_producto: number; 
}