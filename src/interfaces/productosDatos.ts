export interface CrearActualizarProductoDatos {
  nombre: string;
  descripcion?: string | null;
  precio_compra: number;
  precio_venta: number;
  precio_promocion?: number | null;
  precio_descuento?: number | null;
  stock_actual?: number; 
  id_negocio: number; 
  id_tipo_producto: number; 
  imagenes?: Express.Multer.File[];
}

export interface ProductoData {
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

