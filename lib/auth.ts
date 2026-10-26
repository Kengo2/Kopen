import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil, Rol } from "@/lib/tipos";

/** Dominio interno para las cuentas de puerta creadas con un nombre de usuario. */
export const DOMINIO_PUERTA = "puerta.entradas-qr.app";

export function correoDesdeUsuario(usuario: string) {
  const u = usuario.trim().toLowerCase();
  return u.includes("@") ? u : `${u}@${DOMINIO_PUERTA}`;
}

export function usuarioDesdeCorreo(correo: string | undefined) {
  if (!correo) return "";
  return correo.endsWith(`@${DOMINIO_PUERTA}`) ? correo.split("@")[0] : correo;
}

export async function getPerfil(): Promise<Perfil | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, evento_id")
    .eq("id", user.id)
    .single();
  return (data as Perfil) ?? null;
}

/** Exige sesión y uno de los roles indicados; si no, redirige. */
export async function requireRol(...roles: Rol[]): Promise<Perfil> {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login");
  if (!roles.includes(perfil.rol)) redirect("/");
  return perfil;
}

/** Ruta de inicio según el rol. */
export function inicioPara(perfil: Perfil) {
  if (perfil.rol === "admin") return "/admin";
  if (perfil.rol === "organizador") return `/evento/${perfil.evento_id}`;
  return `/puerta/${perfil.evento_id}`;
}

/** Comprueba que el perfil puede gestionar ese evento. */
export function puedeVerEvento(perfil: Perfil, eventoId: string) {
  return perfil.rol === "admin" || perfil.evento_id === eventoId;
}
