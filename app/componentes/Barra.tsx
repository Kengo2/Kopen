import Link from "next/link";
import { LogOut } from "lucide-react";
import { cerrarSesion } from "@/app/login/actions";
import { iniciales } from "@/lib/formato";

export function Marca({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="marca" aria-label="Kopen, inicio">
      <img src="/kopen-logo.svg" alt="Kopen" width={106} height={30} />
    </Link>
  );
}

export default function Barra({ nombre, rol, inicio = "/" }: { nombre: string; rol: string; inicio?: string }) {
  return (
    <header className="barra">
      <Marca href={inicio} />
      <div className="usuario">
        <div style={{ textAlign: "right", lineHeight: 1.2 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{nombre}</div>
          <div className="tenue" style={{ fontSize: 12 }}>{rol}</div>
        </div>
        <span className="avatar" aria-hidden>{iniciales(nombre)}</span>
        <form action={cerrarSesion}>
          <button className="icono-boton" aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={20} />
          </button>
        </form>
      </div>
    </header>
  );
}
