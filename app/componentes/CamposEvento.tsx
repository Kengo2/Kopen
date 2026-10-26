import type { Evento } from "@/lib/tipos";
import { aInputLocal, hoy } from "@/lib/formato";

/** Campos compartidos por el formulario de crear y editar evento. */
export default function CamposEvento({ evento }: { evento?: Evento }) {
  const local = evento ? aInputLocal(evento.fecha) : null;
  return (
    <>
      <label className="campo">
        <span>Nombre del evento</span>
        <input name="nombre" required defaultValue={evento?.nombre} placeholder="Ej. LOST Halloween" />
      </label>
      <label className="campo">
        <span>Lugar</span>
        <input name="lugar" defaultValue={evento?.lugar} placeholder="Dirección o nombre del local" />
      </label>
      <div className="fila">
        <label className="campo">
          <span>Fecha del evento</span>
          <input name="fecha_dia" type="date" required defaultValue={local?.slice(0, 10)} />
        </label>
        <label className="campo">
          <span>Hora</span>
          <input name="fecha_hora" type="time" required defaultValue={local?.slice(11, 16) ?? "22:00"} />
        </label>
      </div>
      <div className="fila">
        <label className="campo">
          <span>Plataforma abierta desde</span>
          <input name="acceso_desde" type="date" required defaultValue={evento?.acceso_desde ?? hoy()} />
        </label>
        <label className="campo">
          <span>Hasta</span>
          <input name="acceso_hasta" type="date" required defaultValue={evento?.acceso_hasta} />
        </label>
      </div>
      <p className="tenue chico" style={{ marginTop: 6 }}>
        Fuera de esas fechas el organizador solo puede ver su lista, y la puerta no escanea.
      </p>
      <div className="fila apila" style={{ marginTop: 14 }}>
        <label className="campo">
          <span>Precio de preventa (USD)</span>
          <input name="precio_preventa" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={evento?.precio_preventa ?? 0} />
        </label>
        <div className="fila">
          <label className="campo">
            <span>Color 1</span>
            <input name="color_primario" type="color" defaultValue={evento?.color_primario ?? "#6d3cff"} />
          </label>
          <label className="campo">
            <span>Color 2</span>
            <input name="color_secundario" type="color" defaultValue={evento?.color_secundario ?? "#ff4fa3"} />
          </label>
        </div>
      </div>
      <p className="tenue chico" style={{ marginTop: 6 }}>Los colores se usan en la entrada que recibe cada invitado.</p>
    </>
  );
}
