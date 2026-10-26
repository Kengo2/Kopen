import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { Check, Copy, MessageCircle, ScanLine, Smartphone, Wallet } from "lucide-react";
import { getPerfil, inicioPara } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cobroEvento, dinero, MINIMO_POR_EVENTO, TARIFA_POR_ENTRADA } from "@/lib/formato";
import { Marca } from "@/app/componentes/Barra";
import { cerrarSesion } from "@/app/login/actions";

export default async function Inicio() {
  const perfil = await getPerfil();
  if (perfil) redirect(inicioPara(perfil));

  // Sesión iniciada pero sin rol asignado
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    return (
      <main className="acceso">
        <div className="acceso-caja bloque">
          <h2 style={{ marginBottom: 8 }}>Tu cuenta aún no tiene una fiesta asignada</h2>
          <p className="tenue" style={{ marginBottom: 20 }}>Pídele al administrador de Kopen que te dé acceso a tu fiesta.</p>
          <form action={cerrarSesion}><button className="boton suave ancho">Cerrar sesión</button></form>
        </div>
      </main>
    );
  }

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_VENTAS?.replace(/\D/g, "");
  const contacto = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent("Hola, quiero usar Kopen para las entradas de mi fiesta.")}`
    : null;
  const qr = await QRCode.toString("kopen-demo-entrada", { type: "svg", margin: 0, color: { dark: "#17122b", light: "#ffffff" } });

  return (
    <div className="venta">
      <header className="barra" style={{ padding: "16px 0", maxWidth: "none" }}>
        <Marca />
        <Link href="/login" className="boton contorno chico">Ingresar</Link>
      </header>

      <section className="venta-heroe">
        <div>
          <h1>Cada entrada entra una sola vez.</h1>
          <p>
            Entradas con código QR para tu fiesta. Se acabaron las capturas reenviadas y los colados: en la puerta sabes al instante quién pagó y quién ya entró.
          </p>
          <div className="venta-ctas">
            {contacto ? (
              <a href={contacto} className="boton grande"><MessageCircle size={20} /> Quiero usarlo en mi fiesta</a>
            ) : (
              <Link href="/login" className="boton grande">Ingresar</Link>
            )}
            <a href="#precio" className="boton grande contorno">Ver precio</a>
          </div>
        </div>

        <div className="demo-puerta" aria-label="Ejemplo de una entrada aprobada en la puerta">
          <div className="demo-talon">
            <div className="tenue chico">Entrada de</div>
            <div className="display" style={{ fontSize: 26, fontWeight: 750 }}>Noche de Halloween</div>
            <div className="tenue chico" style={{ marginTop: 4 }}>Sábado 31 de octubre, 22:00</div>
            <div className="qr-falso" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="display" style={{ fontSize: 20, fontWeight: 700, marginTop: 14 }}>Daniela Ortiz</div>
          </div>
          <div className="demo-sello"><Check size={24} strokeWidth={3} /> Puede entrar</div>
        </div>
      </section>

      <section className="venta-seccion">
        <h2>Así funciona en tu fiesta</h2>
        <ol className="pasos">
          <li>
            <h3>Armas tu lista</h3>
            <p className="tenue">Agregas a tus invitados desde el celular y marcas quién pagó, por transferencia o en efectivo.</p>
          </li>
          <li>
            <h3>Envías las entradas</h3>
            <p className="tenue">Cada persona recibe por WhatsApp su entrada con un QR único, con los colores de tu fiesta.</p>
          </li>
          <li>
            <h3>Escaneas en la puerta</h3>
            <p className="tenue">Tu equipo escanea desde sus celulares. Si alguien intenta entrar dos veces con el mismo QR, la puerta lo sabe.</p>
          </li>
        </ol>
      </section>

      <section className="venta-seccion">
        <h2>Lo que cambia para el organizador</h2>
        <div className="ventajas">
          <div>
            <Copy size={24} />
            <div>
              <h3>Sin entradas copiadas</h3>
              <p>Cada QR sirve una sola vez. Una captura reenviada a un amigo no pasa la puerta.</p>
            </div>
          </div>
          <div>
            <Wallet size={24} />
            <div>
              <h3>Cuentas claras</h3>
              <p>Ves cuánto entró por transferencia y cuánto en efectivo, y quién todavía te debe.</p>
            </div>
          </div>
          <div>
            <ScanLine size={24} />
            <div>
              <h3>Puerta rápida</h3>
              <p>Varias personas escanean a la vez y todas ven cuánta gente hay adentro en tiempo real.</p>
            </div>
          </div>
          <div>
            <Smartphone size={24} />
            <div>
              <h3>Nada que instalar</h3>
              <p>Funciona en el navegador de cualquier celular. Tus invitados no necesitan descargar nada.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="venta-seccion" id="precio">
        <h2>Pagas solo cuando haces una fiesta</h2>
        <div className="precio">
          <div>
            <div className="cifra">{dinero(TARIFA_POR_ENTRADA)}</div>
            <p className="tenue" style={{ marginTop: 8, fontSize: 18 }}>
              por entrada emitida, con un mínimo de {dinero(MINIMO_POR_EVENTO)} por fiesta. Sin mensualidades ni contratos.
            </p>
          </div>
          <table className="tabla-precio">
            <tbody>
              {[50, 100, 150, 300].map((n) => (
                <tr key={n}>
                  <td>{n} invitados</td>
                  <td>{dinero(cobroEvento(n))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {contacto && (
          <div style={{ marginTop: 24 }}>
            <a href={contacto} className="boton grande"><MessageCircle size={20} /> Escríbenos por WhatsApp</a>
          </div>
        )}
      </section>

      <footer className="venta-pie">
        <span>Kopen, entradas con QR para fiestas</span>
        <Link href="/login">Ingresar a mi cuenta</Link>
      </footer>
    </div>
  );
}
