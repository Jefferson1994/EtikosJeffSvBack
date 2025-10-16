
export interface AbrirCajaDatos {
  id_colaborador: number; // ID del colaborador que abre la caja (obtenido del token JWT)
  id_negocio: number;  // ID del negocio al que pertenece la caja (obtenido del token JWT/contexto)
  total_inicial_efectivo?: number; // Monto con el que se abre la caja, opcional.
  observaciones?: string | null; // Alguna observación al abrir la caja.
}

export interface RegistrarMovimientoCajaDatos {
  id_venta:number;
  id_caja: number;                      // ID de la caja activa donde se registra el movimiento.
  monto: number;                        // Cantidad del movimiento (ej. 15.00).
  tipo: number;                         // [EXISTENTE] Tipo de movimiento (solo 'ingreso' o 'egreso').
  id_metodo_pago: number;               // ID del método de pago asociado al movimiento.
  id_factura: number;                   // [EXISTENTE] ID de la factura asociada al movimiento.
  detalle?: string | null;              // Descripción adicional del movimiento.
  id_colaborador: number;               // ID del colaborador que realiza el movimiento.
  id_tipo_movimiento_caja?: number;      // [NUEVO] ID del tipo de movimiento (ej. ID de 'INGRESO' o 'EGRESO').
  id_referencia_venta?: number | null;   // [NUEVO] Opcional: ID de la Venta (o Factura) asociada si aplica.

}
export interface CerrarCajaDatos {
  id_caja: number;
  total_final_efectivo: number;
  observaciones?: string;
  id_colaborador?: number; 
  id_negocio?: number;     
}


export interface ItemFacturaDatos {
  id_producto?: number | null;   // ID del producto 
  id_servicio?: number | null;   // ID del servicio 
  cantidad: number;              // Cantidad del ítem
  precio_unitario: number;       // Precio unitario del ítem 
  descripcion_adicional?: string | null; // Descripción personalizada ados
}

export interface ItemVentaDatos {
  id_producto?: number | null; // ID del producto (opcional, si es un producto).
  id_servicio?: number | null;// ID del servicio (opcional, si es un servicio).
  cantidad: number; // Cantidad del ítem.
  precio_unitario: number;  // Precio unitario del ítem al momento de la venta.
  descripcion_adicional?: string | null; // Descripción personalizada para el ítem en el detalle de venta.
}

/**
 * @interface RegistrarVenta
 * @description Define la estructura de los datos necesarios para registrar una venta completa.
 */
export interface RegistrarVenta {
  id_caja: number;   // ID de la caja activa donde se registra la venta.
  id_metodo_pago_principal: number;  // ID del método de pago principal de la venta.
  id_colaborador: number; // ID del colaborador que realiza la venta.
  id_cliente?: number | null; // Opcional: ID del cliente asociado a la venta.
  observaciones_venta?: string | null; // Observaciones generales para esta venta.
  requiere_factura_formal?: boolean; // Indica si la venta debe generar una factura formal (true) o solo un registro interno (false/undefined).
  items: ItemVentaDatos[];  // Lista de los productos y/o servicios vendidos.
}

export interface RegistrarVenta{
  id_caja: number;                     // ID de la caja activa donde se registra la venta.
  id_metodo_pago_principal: number;    // ID del método de pago principal de la venta.
  id_colaborador: number;              // ID del colaborador que realiza la venta.
  id_cliente?: number | null;          // Opcional: ID del cliente asociado a la venta.
  observaciones_venta?: string | null; // Observaciones generales para esta venta.
  requiere_factura_formal?: boolean;   // Indica si la venta debe generar una factura formal (true) o solo un registro interno (false/undefined).
  items: ItemFacturaDatos[];           // Lista de los productos y/o servicios vendidos.
}



