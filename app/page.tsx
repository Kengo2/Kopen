import { redirect } from "next/navigation";
import { getPerfil, inicioPara } from "@/lib/auth";
import { cerrarSesion } from "@/app/login/actions";

export default async function Inicio() {
  const perfil = await getPerfil();
  if (!perfil) {
    // ¿Hay sesión pero sin perfil? Mostramos aviso en lugar de un bucle de redirecciones.
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");
    return (
      <main className="centro">
        <div className="card login">
          <h2>Tu cuenta no tiene un rol asignado</h2>
          <p className="mut">Pídele al administrador que te asigne a un evento.</p>
          <form action={cerrarSesion}>
            <button className="btn sec ancho">Cerrar sesión</button>
          </form>
        </div>
      </main>
    );
  }
  redirect(inicioPara(perfil));
}
