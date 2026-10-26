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
          <h2 style={{ marginBottom: 8 }}>Tu cuenta aún no tiene un evento asignado</h2>
          <p className="tenue" style={{ marginBottom: 20 }}>Pídele al administrador de Kopen que te dé acceso a tu evento.</p>
          <form action={cerrarSesion}><button className="boton suave ancho">Cerrar sesión</button></form>
        </div>
      </main>
    );
  }

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_VENTAS?.replace(/\D/g, "");
  const contacto = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent("Hola, me interesa usar Kopen para el control de acceso de mi evento.")}`
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
          <h1>Cada entrada se valida una sola vez.</h1>
          <p>
            Kopen gestiona las entradas de tu evento con códigos QR únicos. Cada ingreso se valida en tiempo real, sin entradas duplicadas ni accesos no autorizados.
          </p>
          <div className="venta-ctas">
            {contacto ? (
              <a href={contacto} className="boton grande"><MessageCircle size={20} /> Solicitar información</a>
            ) : (
              <Link href="/login" className="boton grande">Ingresar</Link>
            )}
            <a href="#precio" className="boton grande contorno">Ver precio</a>
          </div>
        </div>

        <div className="demo-puerta" aria-label="Ejemplo de una entrada aprobada en la puerta">
          <div className="demo-talon pastel lila">
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
        <h2>Cómo funciona</h2>
        <ol className="pasos">
          <li>
            <h3>Registra a tus asistentes</h3>
            <p className="tenue">Agrega a cada asistente desde el celular y registra su pago por transferencia o en efectivo.</p>
          </li>
          <li>
            <h3>Envía las entradas</h3>
            <p className="tenue">Cada asistente recibe por WhatsApp una entrada con un código QR único y la identidad visual de tu evento.</p>
          </li>
          <li>
            <h3>Valida en el acceso</h3>
            <p className="tenue">Tu equipo escanea desde sus celulares. Un código que ya se utilizó se detecta al instante.</p>
          </li>
        </ol>
      </section>

      <section className="venta-seccion">
        <h2>Beneficios para el organizador</h2>
        <div className="ventajas">
          <div>
            <Copy size={24} />
            <div>
              <h3>Sin entradas duplicadas</h3>
              <p>Cada código es válido para un solo ingreso. Una captura reenviada no permite el acceso.</p>
            </div>
          </div>
          <div>
            <Wallet size={24} />
            <div>
              <h3>Control financiero</h3>
              <p>Consulta lo recaudado por transferencia y en efectivo, y los pagos pendientes de cada asistente.</p>
            </div>
          </div>
          <div>
            <ScanLine size={24} />
            <div>
              <h3>Acceso ágil</h3>
              <p>Varios dispositivos validan entradas en simultáneo, con el aforo actualizado en tiempo real.</p>
            </div>
          </div>
          <div>
            <Smartphone size={24} />
            <div>
              <h3>Sin instalaciones</h3>
              <p>Funciona desde el navegador de cualquier celular, tanto para tu equipo como para tus asistentes.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="venta-seccion" id="precio">
        <h2>Pagas solo por evento realizado</h2>
        <div className="precio">
          <div>
            <div className="cifra">{dinero(TARIFA_POR_ENTRADA)}</div>
            <p className="tenue" style={{ marginTop: 8, fontSize: 18 }}>
              por entrada emitida, con un mínimo de {dinero(MINIMO_POR_EVENTO)} por evento. Sin mensualidades ni contratos.
            </p>
          </div>
          <table className="tabla-precio">
            <tbody>
              {[50, 100, 150, 300].map((n) => (
                <tr key={n}>
                  <td>{n} asistentes</td>
                  <td>{dinero(cobroEvento(n))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {contacto && (
          <div style={{ marginTop: 24 }}>
            <a href={contacto} className="boton grande"><MessageCircle size={20} /> Contactar por WhatsApp</a>
          </div>
        )}
      </section>

      <footer className="venta-pie">
        <span>Kopen, control de acceso con QR para eventos</span>
        <Link href="/login">Ingresar a mi cuenta</Link>
      </footer>
    </div>
  );
}
