import { dia, hoy } from "@/lib/formato";
import type { Evento } from "@/lib/tipos";

export function estadoEvento(evento: Evento): { clase: string; texto: string } {
  if (evento.estado === "archivado") return { clase: "neutro", texto: "Finalizado" };
  const h = hoy();
  if (h < evento.acceso_desde) return { clase: "usado", texto: `Se abre el ${dia(evento.acceso_desde)}` };
  if (h > evento.acceso_hasta) return { clase: "mal", texto: "Cerrado" };
  return { clase: "ok", texto: "Activo" };
}

export default function EtiquetaEstado({ evento }: { evento: Evento }) {
  const e = estadoEvento(evento);
  return <span className={`chip ${e.clase}`}>{e.texto}</span>;
}

export function eventoAbierto(evento: Evento) {
  const h = hoy();
  return evento.estado === "activo" && h >= evento.acceso_desde && h <= evento.acceso_hasta;
}
