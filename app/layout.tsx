import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource-variable/figtree";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://kopen-one.vercel.app"),
  title: { default: "Kopen | Control de acceso con QR para eventos", template: "%s | Kopen" },
  description: "Gestiona y valida las entradas de tu evento con códigos QR únicos. Control de acceso en tiempo real, sin entradas duplicadas.",
  applicationName: "Kopen",
  openGraph: {
    type: "website",
    siteName: "Kopen",
    locale: "es_EC",
    title: "Kopen | Control de acceso con QR para eventos",
    description: "Gestiona y valida las entradas de tu evento con códigos QR únicos. Control de acceso en tiempo real, sin entradas duplicadas.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3f0fa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
