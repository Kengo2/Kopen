import Link from "next/link";
import { cerrarSesion } from "@/app/login/actions";

export default function Barra({ nombre, inicio = "/" }: { nombre: string; inicio?: string }) {
  return (
    <div className="top">
      <Link href={inicio} className="marca grad">Entradas QR</Link>
      <form action={cerrarSesion}>
        <span className="mut" style={{ marginRight: 8 }}>{nombre}</span>
        <button className="btn sec sm">Salir</button>
      </form>
    </div>
  );
}
