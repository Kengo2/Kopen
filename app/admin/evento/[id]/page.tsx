import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fechaLarga } from "@/lib/formato";
import type { Evento, Perfil } from "@/lib/tipos";
import Barra from "@/app/componentes/Barra";
import Avisos from "@/app/componentes/Avisos";
import CamposEvento from "@/app/componentes/CamposEvento";
import EtiquetaEstado from "@/app/componentes/EtiquetaEstado";
import { actualizarEvento, borrarCuentaEvento, cambiarEstado, crearCuentaEvento } from "../../actions";

type Miembro = Perfil & { usuario: string | null };

export default async function AdminEvento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const perfil = await requireRol("admin");
  const { id } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();

  const { data: ev } = await supabase.from("eventos").select("*").eq("id", id).single();
  if (!ev) notFound();
  const evento = ev as Evento;

  const { data: eq } = await supabase
    .from("perfiles")
    .select("id, nombre, usuario, rol, evento_id")
    .eq("evento_id", id)
    .order("rol");
  const equipo = (eq ?? []) as Miembro[];

  const { count: totalInv } = await supabase
    .from("invitados")
    .select("id", { count: "exact", head: true })
    .eq("evento_id", id);

  return (
    <main>
      <Barra nombre={perfil.nombre} inicio="/admin" />
      <p><Link href="/admin" className="mut">← Eventos</Link></p>
      <h1>{evento.nombre}</h1>
      <p className="mut">
        {fechaLarga(evento.fecha)} · {evento.lugar || "Sin lugar"} · <EtiquetaEstado evento={evento} />
      </p>
      <Avisos ok={ok} error={error} />

      <div className="tabs">
        <Link href={`/evento/${id}`}>Invitados ({totalInv ?? 0})</Link>
        <Link href={`/puerta/${id}`}>Escáner</Link>
      </div>

      <div className="card">
        <h2>Equipo del evento</h2>
        {equipo.length === 0 ? (
          <p className="mut">Sin cuentas todavía. Crea la del organizador.</p>
        ) : (
          <ul className="lista">
            {equipo.map((m) => (
              <li key={m.id} className="item">
                <div className="info">
                  <b>{m.nombre}</b>
                  <small>{m.rol === "organizador" ? "Organizador" : "Puerta"} · usuario: {m.usuario}</small>
                </div>
                <form action={borrarCuentaEvento.bind(null, id, m.id)} className="acciones">
                  <button className="btn peligro sm">Eliminar</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <details style={{ marginTop: 10 }} open={equipo.length === 0}>
          <summary>+ Nueva cuenta</summary>
          <form action={crearCuentaEvento.bind(null, id)}>
            <div className="fila">
              <div className="campo">
                <label htmlFor="c-nombre">Nombre</label>
                <input id="c-nombre" name="nombre" required placeholder="Ej. Andrés" />
              </div>
              <div className="campo">
                <label htmlFor="c-rol">Rol</label>
                <select id="c-rol" name="rol" defaultValue="organizador">
                  <option value="organizador">Organizador</option>
                  <option value="puerta">Puerta</option>
                </select>
              </div>
            </div>
            <div className="fila">
              <div className="campo">
                <label htmlFor="c-usuario">Usuario o correo</label>
                <input id="c-usuario" name="usuario" required autoCapitalize="none" placeholder="Ej. andres.lost" />
              </div>
              <div className="campo">
                <label htmlFor="c-clave">Contraseña</label>
                <input id="c-clave" name="clave" required minLength={6} placeholder="Mínimo 6 caracteres" />
              </div>
            </div>
            <p className="mut">Anota el usuario y la contraseña para entregárselos.</p>
            <button className="btn ancho">Crear cuenta</button>
          </form>
        </details>
      </div>

      <div className="card">
        <details>
          <summary>Editar evento</summary>
          <form action={actualizarEvento.bind(null, id)}>
            <CamposEvento evento={evento} />
            <button className="btn ancho">Guardar cambios</button>
          </form>
        </details>
      </div>

      <div className="card">
        {evento.estado === "archivado" ? (
          <form action={cambiarEstado.bind(null, id, "activo")}>
            <p className="mut">El evento está archivado: nadie puede modificarlo ni escanear.</p>
            <button className="btn sec">Reactivar evento</button>
          </form>
        ) : (
          <form action={cambiarEstado.bind(null, id, "archivado")}>
            <p className="mut">Al terminar la fiesta, archiva el evento. Queda guardado en solo lectura.</p>
            <button className="btn peligro">Archivar evento</button>
          </form>
        )}
      </div>
    </main>
  );
}
