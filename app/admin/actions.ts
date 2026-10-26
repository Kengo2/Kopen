"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { crearCuenta, eliminarCuenta } from "@/lib/cuentas";
import { OFFSET } from "@/lib/formato";

function datosEvento(formData: FormData) {
  const dia = String(formData.get("fecha_dia") || "");
  const hora = String(formData.get("fecha_hora") || "22:00");
  const fechaLocal = dia ? `${dia}T${hora.slice(0, 5)}` : "";
  return {
    nombre: String(formData.get("nombre") || "").trim(),
    lugar: String(formData.get("lugar") || "").trim(),
    fecha: fechaLocal ? `${fechaLocal}:00${OFFSET}` : "",
    acceso_desde: String(formData.get("acceso_desde") || ""),
    acceso_hasta: String(formData.get("acceso_hasta") || ""),
    precio_preventa: Number(formData.get("precio_preventa") || 0),
    color_primario: String(formData.get("color_primario") || "#e8452c"),
    color_secundario: String(formData.get("color_secundario") || "#ff9d1c"),
  };
}

function validar(d: ReturnType<typeof datosEvento>) {
  if (!d.nombre || !d.fecha || !d.acceso_desde || !d.acceso_hasta) return "Completa el nombre, el día y las fechas en que la plataforma estará abierta.";
  if (d.acceso_hasta < d.acceso_desde) return "La plataforma debe cerrarse el mismo día o después de abrirse.";
  if (Number.isNaN(d.precio_preventa) || d.precio_preventa < 0) return "Precio de preventa no válido.";
  return null;
}

const q = (s: string) => encodeURIComponent(s);

export async function crearEvento(formData: FormData) {
  await requireRol("admin");
  const d = datosEvento(formData);
  const error = validar(d);
  if (error) redirect(`/admin?error=${q(error)}`);

  const supabase = await createClient();
  const { data, error: e } = await supabase.from("eventos").insert(d).select("id").single();
  if (e || !data) redirect(`/admin?error=${q(e?.message ?? "No se pudo crear el evento")}`);
  redirect(`/admin/evento/${data.id}?ok=${q("Evento creado. Ahora crea el acceso del organizador.")}`);
}

export async function actualizarEvento(id: string, formData: FormData) {
  await requireRol("admin");
  const d = datosEvento(formData);
  const error = validar(d);
  if (error) redirect(`/admin/evento/${id}?error=${q(error)}`);

  const supabase = await createClient();
  const { error: e } = await supabase.from("eventos").update(d).eq("id", id);
  if (e) redirect(`/admin/evento/${id}?error=${q(e.message)}`);
  revalidatePath(`/admin/evento/${id}`);
  redirect(`/admin/evento/${id}?ok=${q("Cambios guardados.")}`);
}

export async function cambiarEstado(id: string, estado: "activo" | "archivado", volverA?: string) {
  await requireRol("admin");
  const destino = volverA ?? `/admin/evento/${id}`;
  const supabase = await createClient();
  const { error } = await supabase.from("eventos").update({ estado }).eq("id", id);
  if (error) redirect(`${destino}?error=${q(error.message)}`);
  revalidatePath("/admin");
  redirect(`${destino}?ok=${q(estado === "archivado" ? "Evento finalizado y archivado." : "Evento reactivado.")}`);
}

export async function marcarCobrado(id: string, cobrado: boolean, volverA?: string) {
  await requireRol("admin");
  const destino = volverA ?? `/admin/evento/${id}`;
  const supabase = await createClient();
  const { error } = await supabase
    .from("eventos")
    .update({ cobrado, cobrado_en: cobrado ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) {
    const msg = error.message.includes("cobrado")
      ? "Falta actualizar la base de datos: corre el archivo arreglo-02-evento-cobrado.sql en Supabase."
      : error.message;
    redirect(`${destino}?error=${q(msg)}`);
  }
  revalidatePath("/admin");
  redirect(`${destino}?ok=${q(cobrado ? "Evento marcado como cobrado." : "El evento volvió a quedar por cobrar.")}`);
}

export async function eliminarEvento(id: string) {
  await requireRol("admin");
  const supabase = await createClient();
  // Primero se borran los accesos del equipo (usuarios de Supabase) de este evento.
  const { data: equipo } = await supabase.from("perfiles").select("id").eq("evento_id", id);
  for (const m of equipo ?? []) {
    const e = await eliminarCuenta(m.id);
    if (e) redirect(`/admin/evento/${id}?error=${q(`No se pudo eliminar un acceso: ${e}`)}`);
  }
  const { error } = await supabase.from("eventos").delete().eq("id", id);
  if (error) redirect(`/admin/evento/${id}?error=${q(error.message)}`);
  revalidatePath("/admin");
  redirect(`/admin?ok=${q("Evento eliminado.")}`);
}

export async function crearCuentaEvento(eventoId: string, formData: FormData) {
  await requireRol("admin");
  const rol = formData.get("rol") === "puerta" ? "puerta" : "organizador";
  const error = await crearCuenta({
    nombre: String(formData.get("nombre") || ""),
    usuario: String(formData.get("usuario") || ""),
    clave: String(formData.get("clave") || ""),
    rol,
    eventoId,
  });
  if (error) redirect(`/admin/evento/${eventoId}?error=${q(error)}`);
  revalidatePath(`/admin/evento/${eventoId}`);
  redirect(`/admin/evento/${eventoId}?ok=${q("Acceso creado. Pásale el usuario y la contraseña.")}`);
}

export async function borrarCuentaEvento(eventoId: string, userId: string) {
  await requireRol("admin");
  const error = await eliminarCuenta(userId);
  if (error) redirect(`/admin/evento/${eventoId}?error=${q(error)}`);
  revalidatePath(`/admin/evento/${eventoId}`);
  redirect(`/admin/evento/${eventoId}?ok=${q("Acceso eliminado.")}`);
}
