import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPerfil, puedeVerEvento } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dinero, fechaLarga, siteUrl } from "@/lib/formato";
import type { Evento, Invitado, Perfil } from "@/lib/tipos";
import Barra from "@/app/componentes/Barra";
import Avisos from "@/app/componentes/Avisos";
import EtiquetaEstado, { eventoAbierto } from "@/app/componentes/EtiquetaEstado";
import FormInvitado from "./FormInvitado";
import ListaInvitados from "./ListaInvitados";
import { borrarCuentaPuerta, crearCuentaPuerta } from "./actions";

export default async function PanelEvento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const perfil = await getPerfil();
  if (!perfil) redirect("/login");
  if (perfil.rol === "puerta") redirect(`/puerta/${perfil.evento_id}`);
  if (!puedeVerEvento(perfil, id)) redirect("/");

  const supabase = await createClient();
  const { data: ev } = await supabase.from("eventos").select("*").eq("id", id).single();
  if (!ev) notFound();
  const evento = ev as Evento;
  const abierto = eventoAbierto(evento);

  const { data: inv } = await supabase
    .from("invitados")
    .select("*")
    .eq("evento_id", id)
    .order("creado_en", { ascending: false });
  const invitados = (inv ?? []) as Invitado[];

  const { data: pu } = await supabase
    .from("perfiles")
    .select("id, nombre, usuario, rol, evento_id")
    .eq("evento_id", id)
    .eq("rol", "puerta");
  const puerta = (pu ?? []) as (Perfil & { usuario: string | null })[];

  const entraron = invitados.filter((i) => i.ingreso_en).length;
  const especiales = invitados.filter((i) => i.tipo === "especial").length;
  const confirmados = invitados.filter((i) => i.tipo === "preventa" && i.estado_pago === "confirmado");
  const pendientes = invitados.filter((i) => i.tipo === "preventa" && i.estado_pago === "pendiente").length;
  const recaudado = confirmados.reduce((s, i) => s + Number(i.monto), 0);

  const inicio = perfil.rol === "admin" ? `/admin/evento/${id}` : `/evento/${id}`;

  return (
    <main style={{ ["--pri" as string]: evento.color_primario, ["--pri2" as string]: evento.color_secundario }}>
      <Barra nombre={perfil.nombre} inicio={inicio} />
      {perfil.rol === "admin" && <p><Link href={`/admin/evento/${id}`} className="mut">← Administración del evento</Link></p>}
      <h1 className="grad">{evento.nombre}</h1>
      <p className="mut">
        {fechaLarga(evento.fecha)} · {evento.lugar || "Sin lugar"} · <EtiquetaEstado evento={evento} />
      </p>
      <Avisos ok={ok} error={error} />
      {!abierto && (
        <div className="aviso error">
          La plataforma no está activa hoy para este evento. Puedes ver los datos, pero no hacer cambios.
        </div>
      )}

      <div className="stats">
        <div className="stat"><b>{invitados.length}</b><span>Invitados</span></div>
        <div className="stat"><b>{entraron}</b><span>Entraron</span></div>
        <div className="stat"><b>{pendientes}</b><span>Pagos pendientes</span></div>
        <div className="stat"><b>{dinero(recaudado)}</b><span>Recaudado</span></div>
      </div>
      <p className="mut" style={{ marginTop: -4 }}>
        {especiales} especiales · {confirmados.length} preventa confirmadas
      </p>

      <div className="tabs">
        <Link href={`/puerta/${id}`}>Abrir escáner de puerta</Link>
      </div>

      {abierto && (
        <div className="card">
          <FormInvitado eventoId={id} precio={Number(evento.precio_preventa)} />
        </div>
      )}

      <div className="card">
        <ListaInvitados
          eventoId={id}
          invitados={invitados}
          abierto={abierto}
          eventoNombre={evento.nombre}
          base={siteUrl()}
        />
      </div>

      <div className="card">
        <h2>Equipo de puerta</h2>
        <p className="mut">Cada persona escanea desde su celular con su propio usuario.</p>
        {puerta.length > 0 && (
          <ul className="lista">
            {puerta.map((m) => (
              <li key={m.id} className="item">
                <div className="info">
                  <b>{m.nombre}</b>
                  <small>usuario: {m.usuario}</small>
                </div>
                {abierto && (
                  <form action={borrarCuentaPuerta.bind(null, id, m.id)} className="acciones">
                    <button className="btn peligro sm">Eliminar</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {abierto && (
          <details style={{ marginTop: 10 }}>
            <summary>+ Agregar persona de puerta</summary>
            <form action={crearCuentaPuerta.bind(null, id)}>
              <div className="campo">
                <label htmlFor="p-nombre">Nombre</label>
                <input id="p-nombre" name="nombre" required placeholder="Ej. Carlos" />
              </div>
              <div className="fila">
                <div className="campo">
                  <label htmlFor="p-usuario">Usuario</label>
                  <input id="p-usuario" name="usuario" required autoCapitalize="none" placeholder="Ej. carlos.puerta" />
                </div>
                <div className="campo">
                  <label htmlFor="p-clave">Contraseña</label>
                  <input id="p-clave" name="clave" required minLength={6} placeholder="Mínimo 6 caracteres" />
                </div>
              </div>
              <button className="btn ancho">Crear cuenta de puerta</button>
            </form>
          </details>
        )}
      </div>
    </main>
  );
}
