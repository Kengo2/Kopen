import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, CalendarDays, MapPin, Pencil, RotateCcw, ScanLine, Trash2, UserPlus, Users } from "lucide-react";
import { requireRol, usuarioDesdeCorreo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cobroEvento, dinero, fechaLarga, iniciales, MINIMO_POR_EVENTO, TARIFA_POR_ENTRADA } from "@/lib/formato";
import type { Evento, Perfil } from "@/lib/tipos";
import Barra from "@/app/componentes/Barra";
import Avisos from "@/app/componentes/Avisos";
import Hoja from "@/app/componentes/Hoja";
import Confirmar from "@/app/componentes/Confirmar";
import Enviar from "@/app/componentes/Enviar";
import CamposEvento from "@/app/componentes/CamposEvento";
import EtiquetaEstado from "@/app/componentes/EtiquetaEstado";
import { actualizarEvento, borrarCuentaEvento, cambiarEstado, crearCuentaEvento } from "../../actions";

type Miembro = Perfil & { usuario: string | null };

export const metadata = { title: "Administrar fiesta" };

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

  const [{ data: ev }, { data: eq }, { count: entradas }, { count: dentro }] = await Promise.all([
    supabase.from("eventos").select("*").eq("id", id).single(),
    supabase.from("perfiles").select("id, nombre, usuario, rol, evento_id").eq("evento_id", id).order("rol").order("creado_en"),
    supabase.from("invitados").select("id", { count: "exact", head: true }).eq("evento_id", id).not("codigo", "is", null),
    supabase.from("invitados").select("id", { count: "exact", head: true }).eq("evento_id", id).not("ingreso_en", "is", null),
  ]);
  if (!ev) notFound();
  const evento = ev as Evento;
  const equipo = (eq ?? []) as Miembro[];
  const n = entradas ?? 0;
  const archivado = evento.estado === "archivado";

  return (
    <>
      <Barra nombre={perfil.nombre} rol="Administrador" inicio="/admin" />
      <main className="pagina pila">
        <Avisos ok={ok} error={error} />

        <div className="evento-cab">
          <Link href="/admin" className="volver"><ArrowLeft size={16} /> Fiestas</Link>
          <div className="franja" style={{ background: `linear-gradient(90deg, ${evento.color_primario}, ${evento.color_secundario})`, marginTop: 8 }} aria-hidden />
          <h1>{evento.nombre}</h1>
          <div className="datos">
            <span className="dato"><CalendarDays size={16} /> {fechaLarga(evento.fecha)}</span>
            {evento.lugar && <span className="dato"><MapPin size={16} /> {evento.lugar}</span>}
            <EtiquetaEstado evento={evento} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link href={`/evento/${id}`} className="boton"><Users size={18} /> Ver invitados</Link>
          <Link href={`/puerta/${id}`} className="boton suave"><ScanLine size={18} /> Escáner</Link>
        </div>

        <div className="bloque">
          <div className="bloque-cab" style={{ marginBottom: 6 }}>
            <h2>Cobro al organizador</h2>
            <span className="cifra" style={{ fontSize: 28, color: "var(--pulsera)" }}>{dinero(cobroEvento(n))}</span>
          </div>
          <p className="tenue chico">
            {n} {n === 1 ? "entrada emitida" : "entradas emitidas"} a {dinero(TARIFA_POR_ENTRADA)} cada una
            {n * TARIFA_POR_ENTRADA < MINIMO_POR_EVENTO ? `, se aplica el mínimo de ${dinero(MINIMO_POR_EVENTO)}` : ""}. {dentro ?? 0} personas entraron.
          </p>
        </div>

        <div className="bloque">
          <div className="bloque-cab">
            <h2>Accesos</h2>
            {!archivado && (
              <Hoja titulo="Nuevo acceso" claseBoton="boton chico suave" boton={<><UserPlus size={16} /> Agregar</>}>
                <form action={crearCuentaEvento.bind(null, id)}>
                  <div className="campo">
                    <span>Rol</span>
                    <div className="opciones">
                      <label><input type="radio" name="rol" value="organizador" defaultChecked={!equipo.some((m) => m.rol === "organizador")} /><span>Organizador</span></label>
                      <label><input type="radio" name="rol" value="puerta" defaultChecked={equipo.some((m) => m.rol === "organizador")} /><span>Puerta</span></label>
                    </div>
                  </div>
                  <label className="campo">
                    <span>Nombre</span>
                    <input name="nombre" required placeholder="Ej. Andrés" />
                  </label>
                  <div className="fila">
                    <label className="campo">
                      <span>Usuario o correo</span>
                      <input name="usuario" required autoCapitalize="none" autoCorrect="off" placeholder="andres.lost" />
                    </label>
                    <label className="campo">
                      <span>Contraseña</span>
                      <input name="clave" required minLength={6} autoComplete="new-password" placeholder="6 o más" />
                    </label>
                  </div>
                  <p className="tenue chico" style={{ margin: "10px 0 16px" }}>Anota el usuario y la contraseña para entregárselos.</p>
                  <Enviar>Crear acceso</Enviar>
                </form>
              </Hoja>
            )}
          </div>
          {equipo.length === 0 ? (
            <p className="tenue">Nadie tiene acceso todavía. Crea el del organizador para que pueda armar su lista.</p>
          ) : (
            <ul className="talones">
              {equipo.map((m) => (
                <li key={m.id} className="talon">
                  <span className="avatar" aria-hidden>{iniciales(m.nombre)}</span>
                  <div className="talon-info">
                    <strong>{m.nombre}</strong>
                    <div className="linea2">
                      <span className={`chip ${m.rol === "organizador" ? "lista" : "neutro"}`}>{m.rol === "organizador" ? "Organizador" : "Puerta"}</span>
                      <span>{usuarioDesdeCorreo(m.usuario ?? "")}</span>
                    </div>
                  </div>
                  <Confirmar
                    accion={borrarCuentaEvento.bind(null, id, m.id)}
                    titulo="Eliminar acceso"
                    mensaje={`${m.nombre} ya no podrá iniciar sesión.`}
                    confirmar="Eliminar acceso"
                    claseBoton="icono-boton"
                    etiqueta={`Eliminar acceso de ${m.nombre}`}
                  >
                    <Trash2 size={18} />
                  </Confirmar>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Hoja titulo="Editar fiesta" claseBoton="boton contorno" boton={<><Pencil size={18} /> Editar</>}>
            <form action={actualizarEvento.bind(null, id)}>
              <CamposEvento evento={evento} />
              <div style={{ marginTop: 20 }}><Enviar>Guardar cambios</Enviar></div>
            </form>
          </Hoja>
          {archivado ? (
            <Confirmar
              accion={cambiarEstado.bind(null, id, "activo")}
              titulo="Reactivar fiesta"
              mensaje="El organizador podrá volver a editar su lista y la puerta podrá escanear dentro de las fechas configuradas."
              confirmar="Reactivar"
              peligro={false}
            >
              <RotateCcw size={18} /> Reactivar
            </Confirmar>
          ) : (
            <Confirmar
              accion={cambiarEstado.bind(null, id, "archivado")}
              titulo="Archivar fiesta"
              mensaje="Hazlo cuando la fiesta haya terminado. Nadie podrá modificar la lista ni escanear, y las entradas dejarán de mostrarse. Puedes reactivarla después."
              confirmar="Archivar fiesta"
              claseBoton="boton peligro"
            >
              <Archive size={18} /> Archivar
            </Confirmar>
          )}
        </div>
      </main>
    </>
  );
}
