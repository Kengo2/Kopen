export type Rol = "admin" | "organizador" | "puerta";
export type EstadoEvento = "borrador" | "activo" | "archivado";
export type TipoEntrada = "especial" | "preventa";
export type EstadoPago = "no_aplica" | "pendiente" | "confirmado";
export type MetodoPago = "transferencia" | "efectivo";

export interface Perfil {
  id: string;
  nombre: string;
  rol: Rol;
  evento_id: string | null;
}

export interface Evento {
  id: string;
  nombre: string;
  fecha: string;
  lugar: string;
  flyer_url: string | null;
  color_primario: string;
  color_secundario: string;
  precio_preventa: number;
  estado: EstadoEvento;
  acceso_desde: string;
  acceso_hasta: string;
}

export interface Invitado {
  id: string;
  evento_id: string;
  nombre: string;
  telefono: string | null;
  tipo: TipoEntrada;
  estado_pago: EstadoPago;
  metodo_pago: MetodoPago | null;
  monto: number;
  codigo: string | null;
  creado_en: string;
  ingreso_en: string | null;
}

export interface EntradaPublica {
  codigo: string;
  nombre: string;
  tipo: TipoEntrada;
  evento: string;
  fecha: string;
  lugar: string;
  flyer_url: string | null;
  color_primario: string;
  color_secundario: string;
  usada: boolean;
}

export interface ResultadoValidacion {
  resultado: "valido" | "usado" | "invalido";
  nombre: string | null;
  tipo: TipoEntrada | null;
  ingreso_en: string | null;
  ingreso_por: string | null;
}
