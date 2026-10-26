import { dia, hoy } from "@/lib/formato";
import type { Evento } from "@/lib/tipos";

export default function EtiquetaEstado({ evento }: { evento: Evento }) {
  if (evento.estado === "archivado") return <span className="tag neu">Archivado</span>;
  const h = hoy();
  if (h < evento.acceso_desde) return <span className="tag warn">Abre {dia(evento.acceso_desde)}</span>;
  if (h > evento.acceso_hasta) return <span className="tag bad">Cerrado</span>;
  return <span className="tag ok">Activo</span>;
}

export function eventoAbierto(evento: Evento) {
  const h = hoy();
  return evento.estado === "activo" && h >= evento.acceso_desde && h <= evento.acceso_hasta;
}
