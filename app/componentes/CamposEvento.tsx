import type { Evento } from "@/lib/tipos";
import { aInputLocal } from "@/lib/formato";

/** Campos compartidos por el formulario de crear y editar evento. */
export default function CamposEvento({ evento }: { evento?: Evento }) {
  return (
    <>
      <div className="campo">
        <label htmlFor="nombre">Nombre del evento</label>
        <input id="nombre" name="nombre" required defaultValue={evento?.nombre} placeholder="Ej. LOST Halloween" />
      </div>
      <div className="fila">
        <div className="fila">
          <div className="campo">
            <label htmlFor="fecha_dia">Fecha de la fiesta</label>
            <input id="fecha_dia" name="fecha_dia" type="date" required defaultValue={evento ? aInputLocal(evento.fecha).slice(0, 10) : undefined} />
          </div>
          <div className="campo">
            <label htmlFor="fecha_hora">Hora</label>
            <input id="fecha_hora" name="fecha_hora" type="time" required defaultValue={evento ? aInputLocal(evento.fecha).slice(11, 16) : "22:00"} />
          </div>
        </div>
        <div className="campo">
          <label htmlFor="lugar">Lugar</label>
          <input id="lugar" name="lugar" defaultValue={evento?.lugar} placeholder="Dirección o nombre del local" />
        </div>
      </div>
      <div className="fila">
        <div className="campo">
          <label htmlFor="acceso_desde">Plataforma activa desde</label>
          <input id="acceso_desde" name="acceso_desde" type="date" required defaultValue={evento?.acceso_desde} />
        </div>
        <div className="campo">
          <label htmlFor="acceso_hasta">Plataforma activa hasta</label>
          <input id="acceso_hasta" name="acceso_hasta" type="date" required defaultValue={evento?.acceso_hasta} />
        </div>
      </div>
      <div className="fila">
        <div className="campo">
          <label htmlFor="precio_preventa">Precio preventa (USD)</label>
          <input id="precio_preventa" name="precio_preventa" type="number" min="0" step="0.01" defaultValue={evento?.precio_preventa ?? 0} />
        </div>
        <div className="fila">
          <div className="campo">
            <label htmlFor="color_primario">Color 1</label>
            <input id="color_primario" name="color_primario" type="color" defaultValue={evento?.color_primario ?? "#e8452c"} style={{ height: 46, padding: 4 }} />
          </div>
          <div className="campo">
            <label htmlFor="color_secundario">Color 2</label>
            <input id="color_secundario" name="color_secundario" type="color" defaultValue={evento?.color_secundario ?? "#ff9d1c"} style={{ height: 46, padding: 4 }} />
          </div>
        </div>
      </div>
    </>
  );
}
