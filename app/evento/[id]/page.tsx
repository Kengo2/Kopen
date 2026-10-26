import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Info, MapPin, ScanLine, Trash2, UserPlus, Users } from "lucide-react";
import { getPerfil, puedeVerEvento, usuarioDesdeCorreo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dinero, fechaLarga, siteUrl } from "@/lib/formato";
import type { Evento, Invitado, Perfil } from "@/lib/tipos";
import Barra from "@/app/componentes/Barra";
import Avisos from "@/app/componentes/Avisos";
import Hoja from "@/app/componentes/Hoja";
import Confirmar from "@/app/componentes/Confirmar";
import Enviar from "@/app/componentes/Enviar";
import EtiquetaEstado, { estadoEvento, eventoAbierto } from "@/app/componentes/EtiquetaEstado";
import FormInvitado from "./FormInvitado";
import ListaInvitados from "./ListaInvitados";
import { borrarCuentaPuerta, crearCuentaPuerta } from "./actions";

export const metadata = { title: "Invitados" };

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
  const [{ data: ev }, { data: inv }, { data: pu }] = await Promise.all([
    supabase.from("eventos").select("*").eq("id", id).single(),
    supabase.from("invitados").select("*").eq("evento_id", id).order("creado_en", { ascending: false }),
    supabase.from("perfiles").select("id, nombre, usuario, rol, evento_id").eq("evento_id", id).eq("rol", "puerta").order("creado_en"),
  ]);
  if (!ev) notFound();
  const evento = ev as Evento;
  const invitados = (inv ?? []) as Invitado[];
  const puerta = (pu ?? []) as (Perfil & { usuario: string | null })[];
  const abierto = eventoAbierto(evento);

  const conEntrada = invitados.filter((i) => i.codigo);
  const dentro = invitados.filter((i) => i.ingreso_en).length;
  const porCobrar = invitados.filter((i) => !i.codigo);
  const pagados = invitados.filter((i) => i.tipo === "preventa" && i.codigo);
  const total = (lista: Invitado[]) => lista.reduce((s, i) => s + Number(i.monto), 0);
  const recaudado = total(pagados);
  const enTransferencia = total(pagados.filter((i) => i.metodo_pago === "transferencia"));
  const enEfectivo = total(pagados.filter((i) => i.metodo_pago === "efectivo"));
  const porcentaje = conEntrada.length ? Math.round((dentro / conEntrada.length) * 100) : 0;
  const esAdmin = perfil.rol === "admin";

  return (
    <>
      <Barra nombre={perfil.nombre} rol={esAdmin ? "Administrador" : "Organizador"} inicio={esAdmin ? "/admin" : `/evento/${id}`} />
      <main className="pagina pila">
        <Avisos ok={ok} error={error} />

        <div className="evento-cab">
          {esAdmin && (
            <Link href={`/admin/evento/${id}`} className="volver"><ArrowLeft size={16} /> Administración de la fiesta</Link>
          )}
          <div className="franja" style={{ background: `linear-gradient(90deg, ${evento.color_primario}, ${evento.color_secundario})`, marginTop: 8 }} aria-hidden />
          <h1>{evento.nombre}</h1>
          <div className="datos">
            <span className="dato"><CalendarDays size={16} /> {fechaLarga(evento.fecha)}</span>
            {evento.lugar && <span className="dato"><MapPin size={16} /> {evento.lugar}</span>}
            <EtiquetaEstado evento={evento} />
          </div>
        </div>

        {!abierto && (
          <div className="nota alerta">
            <Info size={18} />
            <span>
              {estadoEvento(evento).texto}. Puedes ver tu lista, pero agregar invitados, cobrar y escanear solo funciona mientras la plataforma está abierta para esta fiesta.
            </span>
          </div>
        )}

        <div className="asistencia">
          <div className="bloque">
            <div className="tenue chico">En la fiesta</div>
            <div className="puerta-num" style={{ marginTop: 6 }}>
              <span className="cifra">{dentro}</span>
              <span className="tenue">de {conEntrada.length} entradas</span>
            </div>
            <div className="barra-progreso" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100} aria-label="Asistencia">
              <i style={{ width: `${porcentaje}%` }} />
            </div>
            <div className="tenue chico" style={{ marginTop: 8 }}>
              {conEntrada.length - dentro} por llegar
            </div>
          </div>
          <div className="mini">
            <div>
              <div>
                <div className="tenue chico">Recaudado</div>
                <div className="tenue" style={{ fontSize: 12 }}>
                  Transf. {dinero(enTransferencia)} · Efectivo {dinero(enEfectivo)}
                </div>
              </div>
              <span className="cifra">{dinero(recaudado)}</span>
            </div>
            <div>
              <div>
                <div className="tenue chico">Por cobrar</div>
                <div className="tenue" style={{ fontSize: 12 }}>{porCobrar.length} {porCobrar.length === 1 ? "persona" : "personas"}</div>
              </div>
              <span className="cifra" style={{ color: porCobrar.length ? "var(--usado)" : undefined }}>{dinero(total(porCobrar))}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link href={`/puerta/${id}`} className="boton suave"><ScanLine size={18} /> Abrir escáner</Link>
          <Hoja titulo="Equipo de puerta" claseBoton="boton suave" boton={<><Users size={18} /> Puerta ({puerta.length})</>}>
            <p className="tenue" style={{ marginBottom: 16 }}>
              Cada persona de la puerta entra con su propio usuario desde su celular. Todos ven el mismo conteo en tiempo real.
            </p>
            {puerta.length > 0 && (
              <ul className="talones" style={{ marginBottom: 20 }}>
                {puerta.map((m) => (
                  <li key={m.id} className="talon" style={{ gridTemplateColumns: "1fr auto" }}>
                    <div className="talon-info">
                      <strong>{m.nombre}</strong>
                      <div className="linea2">Usuario: {usuarioDesdeCorreo(m.usuario ?? "")}</div>
                    </div>
                    {abierto && (
                      <Confirmar
                        accion={borrarCuentaPuerta.bind(null, id, m.id)}
                        titulo="Quitar de la puerta"
                        mensaje={`${m.nombre} ya no podrá entrar ni escanear entradas.`}
                        confirmar="Quitar acceso"
                        claseBoton="icono-boton"
                        etiqueta={`Quitar a ${m.nombre}`}
                      >
                        <Trash2 size={18} />
                      </Confirmar>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {abierto ? (
              <form action={crearCuentaPuerta.bind(null, id)}>
                <h3 style={{ marginBottom: 12 }}>Agregar persona</h3>
                <label className="campo">
                  <span>Nombre</span>
                  <input name="nombre" required placeholder="Ej. Carlos" />
                </label>
                <div className="fila">
                  <label className="campo">
                    <span>Usuario</span>
                    <input name="usuario" required autoCapitalize="none" autoCorrect="off" placeholder="carlos" />
                  </label>
                  <label className="campo">
                    <span>Contraseña</span>
                    <input name="clave" required minLength={6} autoComplete="new-password" placeholder="6 o más" />
                  </label>
                </div>
                <p className="tenue chico" style={{ margin: "10px 0 16px" }}>Pásale el usuario y la contraseña. Entra en esta misma página.</p>
                <Enviar>Crear acceso de puerta</Enviar>
              </form>
            ) : (
              <p className="tenue">La plataforma está cerrada para esta fiesta.</p>
            )}
          </Hoja>
        </div>

        <ListaInvitados eventoId={id} invitados={invitados} abierto={abierto} eventoNombre={evento.nombre} base={siteUrl()} />
      </main>

      {abierto && (
        <div className="accion-fija">
          <div>
            <Hoja titulo="Nuevo invitado" claseBoton="boton grande ancho" boton={<><UserPlus size={20} /> Agregar invitado</>}>
              <FormInvitado eventoId={id} precio={Number(evento.precio_preventa)} />
            </Hoja>
          </div>
        </div>
      )}
    </>
  );
}
