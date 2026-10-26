import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource-variable/figtree";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kopen · Entradas con QR para fiestas", template: "%s · Kopen" },
  description: "Entradas con código QR de un solo uso para tu fiesta. Sin colados ni capturas falsas. Pagas solo por evento.",
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
