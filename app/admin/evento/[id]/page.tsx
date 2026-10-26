import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, BadgeCheck, CalendarDays, House, MapPin, Pencil, Receipt, RotateCcw, ScanLine, Trash2, UserPlus, Users } from "lucide-react";
import { requireRol, usuarioDesdeCorreo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cobroEvento, dinero, fechaChip, fechaLarga, iniciales } from "@/lib/formato";
import type { Evento, Perfil } from "@/lib/tipos";
import Barra from "@/app/componentes/Barra";
import Avisos from "@/app/componentes/Avisos";
import Hoja from "@/app/componentes/Hoja";
import Confirmar from "@/app/componentes/Confirmar";
import Enviar from "@/app/componentes/Enviar";
import CamposEvento from "@/app/componentes/CamposEvento";
import EtiquetaEstado from "@/app/componentes/EtiquetaEstado";
import { actualizarEvento, borrarCuentaEvento, cambiarEstado, crearCuentaEvento, marcarCobrado } from "../../actions";
import AccionesEvento from "../../AccionesEvento";

type Miembro = Perfil & { usuario: string | null };

export const metadata = { title: "Administrar evento" };

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
          <Link href="/admin" className="volver"><ArrowLeft size={16} /> Eventos</Link>
          <div className="franja" style={{ background: `linear-gradient(90deg, ${evento.color_primario}, ${evento.color_secundario})`, marginTop: 8 }} aria-hidden />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <h1>{evento.nombre}</h1>
            <AccionesEvento id={id} nombre={evento.nombre} archivado={archivado} cobrado={!!evento.cobrado} />
          </div>
          <div className="datos">
            <span className="dato"><CalendarDays size={16} /> {fechaLarga(evento.fecha)}</span>
            {evento.lugar && <span className="dato"><MapPin size={16} /> {evento.lugar}</span>}
            <EtiquetaEstado evento={evento} />
          </div>
        </div>

        <div className="bloque pastel naranja">
          <div className="bloque-cab" style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="insignia"><Receipt size={20} /></span>
              <h2>Cobro al organizador</h2>
            </div>
            <span className="cifra" style={{ fontSize: 28 }}>{dinero(cobroEvento(n))}</span>
          </div>
          <p className="tenue chico">
            Tarifa fija por evento. {n} {n === 1 ? "entrada emitida" : "entradas emitidas"}, {dentro ?? 0} {dentro === 1 ? "persona ingresó" : "personas ingresaron"}.
          </p>
          <form action={marcarCobrado.bind(null, id, !evento.cobrado, undefined)} style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            {evento.cobrado ? (
              <>
                <span className="chip ok">Cobrado{evento.cobrado_en ? ` el ${fechaChip(evento.cobrado_en)}` : ""}</span>
                <Enviar clase="boton chico contorno" pendiente="Guardando…">Deshacer</Enviar>
              </>
            ) : (
              <Enviar clase="boton ancho" pendiente="Guardando…"><BadgeCheck size={18} /> Marcar como cobrado</Enviar>
            )}
          </form>
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

        <div>
          {archivado ? (
            <Confirmar
              accion={cambiarEstado.bind(null, id, "activo", undefined)}
              titulo="Reactivar evento"
              mensaje="El organizador podrá volver a editar su lista y la puerta podrá escanear dentro de las fechas configuradas."
              confirmar="Reactivar"
              peligro={false}
              claseBoton="boton contorno ancho"
            >
              <RotateCcw size={18} /> Reactivar evento
            </Confirmar>
          ) : (
            <Confirmar
              accion={cambiarEstado.bind(null, id, "archivado", undefined)}
              titulo="Finalizar evento"
              mensaje="Hazlo cuando el evento haya terminado. Quedará archivado en solo lectura: nadie podrá modificar la lista ni escanear, y las entradas dejarán de mostrarse. Puedes reactivarlo después."
              confirmar="Finalizar y archivar"
              claseBoton="boton peligro ancho"
            >
              <Archive size={18} /> Finalizar y archivar
            </Confirmar>
          )}
        </div>
      </main>

      <nav className="nav-inferior" aria-label="Navegación">
        <Link href="/admin" className="nav-item" aria-label="Todos los eventos" title="Eventos"><House size={24} /></Link>
        <Link href={`/evento/${id}`} className="nav-item" aria-label="Ver invitados" title="Invitados"><Users size={24} /></Link>
        <Link href={`/puerta/${id}`} className="nav-item" aria-label="Abrir escáner" title="Escáner"><ScanLine size={24} /></Link>
        <Hoja titulo="Editar evento" claseBoton="nav-item" etiqueta="Editar evento" boton={<Pencil size={22} />}>
          <form action={actualizarEvento.bind(null, id)}>
            <CamposEvento evento={evento} />
            <div style={{ marginTop: 20 }}><Enviar>Guardar cambios</Enviar></div>
          </form>
        </Hoja>
      </nav>
    </>
  );
}
