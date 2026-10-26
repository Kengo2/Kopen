import Link from "next/link";
import { TicketX } from "lucide-react";

export default function NoEncontrado() {
  return (
    <main className="acceso">
      <div className="acceso-caja vacio">
        <TicketX size={48} />
        <strong>No encontramos esta página</strong>
        <p style={{ marginBottom: 20 }}>
          Si es una entrada, puede que el evento ya haya terminado o que el enlace esté incompleto. Pídele al organizador que te lo reenvíe.
        </p>
        <Link href="/" className="boton suave">Ir al inicio</Link>
      </div>
    </main>
  );
}
