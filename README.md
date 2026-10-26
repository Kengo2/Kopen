# Kopen · Entradas QR

Plataforma web que se alquila por evento a organizadores de fiestas para controlar el acceso con códigos QR únicos. Cada QR sirve una sola vez.

## Qué hace (MVP)

| Rol | Qué puede hacer |
|---|---|
| **Administrador** (Kenet) | Crea eventos, define las fechas en que la plataforma está activa, crea las cuentas del organizador y de la puerta, archiva el evento al terminar. |
| **Organizador** | Agrega invitados (especiales gratis o de preventa), confirma pagos (transferencia o efectivo), comparte cada entrada por WhatsApp y crea las cuentas de su equipo de puerta. |
| **Puerta** | Escanea los QR con la cámara del celular. Ve al instante si la entrada es **válida**, **ya fue usada** o es **inválida**. Varias personas pueden escanear a la vez; el contador se sincroniza en tiempo real. |
| **Invitado** | Recibe un enlace con su entrada (nombre, evento, fecha, lugar y QR) y puede descargarla como imagen o compartirla. No necesita cuenta. |

La regla de un solo uso se aplica dentro de la base de datos (función `validar_entrada` con bloqueo de fila), así que aunque dos personas escaneen el mismo QR en el mismo segundo, solo una lectura lo marca como válido.

## Tecnología

- [Next.js](https://nextjs.org) 16 (App Router)
- [Supabase](https://supabase.com): base de datos Postgres, usuarios y tiempo real
- [Vercel](https://vercel.com) para publicar
- `qrcode` para generar los QR y `html5-qrcode` para leerlos con la cámara

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto en Supabase (plan gratuito).
2. Abre **SQL Editor**, pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
3. Ve a **Authentication → Users → Add user → Create new user**: pon tu correo y contraseña y marca **Auto Confirm User**.
4. Vuelve al **SQL Editor** y conviértete en administrador (cambia el correo):
   ```sql
   insert into perfiles (id, nombre, usuario, rol)
   select id, 'Kenet', email, 'admin' from auth.users where email = 'TU_CORREO@ejemplo.com';
   ```
5. En **Project Settings → API** copia: la URL del proyecto, la clave pública (*publishable* o *anon*) y la clave secreta (*secret* o *service_role*).

### 2. Vercel

1. En Vercel: **Add New → Project** e importa este repositorio de GitHub.
2. En **Environment Variables** agrega:

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública |
   | `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta (nunca la compartas) |
   | `NEXT_PUBLIC_SITE_URL` | La dirección que te da Vercel, ej. `https://entradas-qr.vercel.app` |

3. Pulsa **Deploy**. Después de agregar `NEXT_PUBLIC_SITE_URL` por primera vez, vuelve a desplegar para que los enlaces de las entradas usen esa dirección.

### 3. Primer evento

1. Entra a la app con tu correo y contraseña de administrador.
2. Crea el evento con su fecha y las fechas en que la plataforma estará activa.
3. Crea la cuenta del organizador (usuario + contraseña) y entrégasela.
4. El organizador entra, agrega invitados y crea las cuentas de puerta.
5. El día de la fiesta, la puerta entra con su usuario y pulsa **Abrir cámara y escanear**.

> La cámara del celular solo funciona en páginas con `https://` (Vercel ya lo tiene).

## Desarrollo local

```bash
cp .env.example .env.local   # y completa los valores
npm install
npm run dev
```

## Estructura

```
app/
  login/            inicio de sesión (correo o usuario)
  admin/            lista y creación de eventos, equipo, archivar
  evento/[id]/      panel del organizador: invitados, pagos, WhatsApp, equipo de puerta
  puerta/[id]/      escáner con la cámara y contador en tiempo real
  entrada/[codigo]/ entrada pública del invitado (QR, descargar, compartir)
lib/                conexión a Supabase, sesión, formatos de fecha y dinero
supabase/schema.sql tablas, reglas de seguridad y funciones
```

## Próximas fases

1. ~~MVP: login, crear evento, agregar invitados, generar QR, escanear y validar.~~
2. Subir el flyer y extraer sus colores automáticamente para la página y las entradas.
3. Reporte final del evento (asistencia, dinero por método, hora pico, escaneos por persona) en PDF o Excel.
4. Correo y funciones para eventos masivos.
