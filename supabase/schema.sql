-- =====================================================================
-- Entradas QR — esquema de base de datos para Supabase
-- Pegar completo en Supabase → SQL Editor → Run (una sola vez).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tipos ----------
create type rol_usuario      as enum ('admin', 'organizador', 'puerta');
create type estado_evento    as enum ('borrador', 'activo', 'archivado');
create type tipo_entrada     as enum ('especial', 'preventa');
create type estado_pago      as enum ('no_aplica', 'pendiente', 'confirmado');
create type metodo_pago      as enum ('transferencia', 'efectivo');
create type resultado_escaneo as enum ('valido', 'usado', 'invalido');

-- ---------- Tablas ----------
create table eventos (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  fecha            timestamptz not null,
  lugar            text not null default '',
  flyer_url        text,
  color_primario   text not null default '#e8452c',
  color_secundario text not null default '#ff9d1c',
  precio_preventa  numeric(10,2) not null default 0,
  estado           estado_evento not null default 'activo',
  acceso_desde     date not null,
  acceso_hasta     date not null,
  creado_en        timestamptz not null default now(),
  constraint fechas_acceso_validas check (acceso_hasta >= acceso_desde)
);

create table perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null,
  usuario    text,                 -- correo o nombre de usuario con el que entra
  rol        rol_usuario not null,
  evento_id  uuid references eventos (id) on delete cascade,
  creado_en  timestamptz not null default now(),
  constraint evento_requerido check (rol = 'admin' or evento_id is not null)
);

create table invitados (
  id           uuid primary key default gen_random_uuid(),
  evento_id    uuid not null references eventos (id) on delete cascade,
  nombre       text not null,
  telefono     text,
  tipo         tipo_entrada not null,
  estado_pago  estado_pago not null default 'no_aplica',
  metodo_pago  metodo_pago,
  monto        numeric(10,2) not null default 0,
  codigo       text unique,          -- se genera al emitir la entrada
  creado_por   uuid references auth.users (id) on delete set null,
  creado_en    timestamptz not null default now(),
  ingreso_en   timestamptz,          -- hora en que entró (null = no ha entrado)
  ingreso_por  uuid references auth.users (id) on delete set null
);
create index invitados_evento_idx on invitados (evento_id);

create table escaneos (
  id             uuid primary key default gen_random_uuid(),
  evento_id      uuid not null references eventos (id) on delete cascade,
  invitado_id    uuid references invitados (id) on delete set null,
  codigo_leido   text not null,
  resultado      resultado_escaneo not null,
  escaneado_por  uuid references auth.users (id) on delete set null,
  escaneado_en   timestamptz not null default now()
);
create index escaneos_evento_idx on escaneos (evento_id, escaneado_en);

-- ---------- Funciones de ayuda ----------
create or replace function mi_rol() returns rol_usuario
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid()
$$;

create or replace function mi_evento() returns uuid
language sql stable security definer set search_path = public as $$
  select evento_id from perfiles where id = auth.uid()
$$;

-- El evento está abierto si está activo y hoy (hora de Ecuador) está dentro de las fechas de acceso.
create or replace function evento_abierto(p_evento uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from eventos
    where id = p_evento
      and estado = 'activo'
      and (now() at time zone 'America/Guayaquil')::date between acceso_desde and acceso_hasta
  )
$$;

-- Genera el código QR cuando la entrada queda emitida:
-- invitados especiales al crearse, preventa al confirmar el pago.
create or replace function emitir_codigo() returns trigger
language plpgsql as $$
begin
  if new.tipo = 'especial' then
    new.estado_pago := 'no_aplica';
    new.metodo_pago := null;
    new.monto := 0;
  elsif new.estado_pago = 'no_aplica' then
    new.estado_pago := 'pendiente';
  end if;

  if new.codigo is null and (new.tipo = 'especial' or new.estado_pago = 'confirmado') then
    new.codigo := translate(encode(gen_random_bytes(12), 'base64'), '+/=', '-_');
  end if;
  return new;
end $$;

create trigger invitados_emitir_codigo
  before insert or update on invitados
  for each row execute function emitir_codigo();

-- ---------- Validación en la puerta (atómica: un QR entra una sola vez) ----------
create or replace function validar_entrada(p_codigo text, p_evento uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_rol rol_usuario := mi_rol();
  v_inv invitados%rowtype;
  v_resultado resultado_escaneo;
  v_por text;
begin
  if v_rol is null then
    raise exception 'No autorizado';
  end if;
  if v_rol <> 'admin' and p_evento is distinct from mi_evento() then
    raise exception 'No autorizado para este evento';
  end if;
  if not evento_abierto(p_evento) then
    raise exception 'El evento no está activo en estas fechas';
  end if;

  select * into v_inv from invitados
   where codigo = trim(p_codigo) and evento_id = p_evento
   for update;

  if not found or (v_inv.tipo = 'preventa' and v_inv.estado_pago <> 'confirmado') then
    v_resultado := 'invalido';
  elsif v_inv.ingreso_en is not null then
    v_resultado := 'usado';
    select nombre into v_por from perfiles where id = v_inv.ingreso_por;
  else
    v_resultado := 'valido';
    update invitados set ingreso_en = now(), ingreso_por = auth.uid()
     where id = v_inv.id
     returning * into v_inv;
  end if;

  insert into escaneos (evento_id, invitado_id, codigo_leido, resultado, escaneado_por)
  values (p_evento, v_inv.id, left(trim(p_codigo), 200), v_resultado, auth.uid());

  return json_build_object(
    'resultado',  v_resultado,
    'nombre',     v_inv.nombre,
    'tipo',       v_inv.tipo,
    'ingreso_en', v_inv.ingreso_en,
    'ingreso_por', v_por
  );
end $$;

-- ---------- Entrada pública (la ve el invitado con su enlace, sin iniciar sesión) ----------
create or replace function ver_entrada(p_codigo text)
returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'codigo', i.codigo,
    'nombre', i.nombre,
    'tipo', i.tipo,
    'evento', e.nombre,
    'fecha', e.fecha,
    'lugar', e.lugar,
    'flyer_url', e.flyer_url,
    'color_primario', e.color_primario,
    'color_secundario', e.color_secundario,
    'usada', i.ingreso_en is not null
  )
  from invitados i join eventos e on e.id = i.evento_id
  where i.codigo = p_codigo
    and (i.tipo = 'especial' or i.estado_pago = 'confirmado')
    and e.estado <> 'archivado'
$$;

revoke all on function validar_entrada(text, uuid) from public, anon;
grant execute on function validar_entrada(text, uuid) to authenticated;
grant execute on function ver_entrada(text) to anon, authenticated;

-- ---------- Seguridad por filas (RLS) ----------
alter table eventos   enable row level security;
alter table perfiles  enable row level security;
alter table invitados enable row level security;
alter table escaneos  enable row level security;

-- eventos: el admin todo; los demás solo ven su evento
create policy eventos_admin on eventos for all
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
create policy eventos_ver_propio on eventos for select
  using (id = mi_evento());

-- perfiles: cada quien ve el suyo; admin todos; organizador ve a su equipo
create policy perfiles_propio on perfiles for select
  using (id = auth.uid());
create policy perfiles_admin on perfiles for all
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
create policy perfiles_equipo on perfiles for select
  using (mi_rol() = 'organizador' and evento_id = mi_evento());

-- invitados: admin todo; organizador gestiona los de su evento mientras esté abierto; puerta solo lee
create policy invitados_admin on invitados for all
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
create policy invitados_org_ver on invitados for select
  using (mi_rol() in ('organizador', 'puerta') and evento_id = mi_evento());
create policy invitados_org_crear on invitados for insert
  with check (mi_rol() = 'organizador' and evento_id = mi_evento() and evento_abierto(evento_id));
create policy invitados_org_editar on invitados for update
  using (mi_rol() = 'organizador' and evento_id = mi_evento() and evento_abierto(evento_id))
  with check (mi_rol() = 'organizador' and evento_id = mi_evento());
create policy invitados_org_borrar on invitados for delete
  using (mi_rol() = 'organizador' and evento_id = mi_evento() and evento_abierto(evento_id) and ingreso_en is null);

-- escaneos: solo lectura (se escriben a través de validar_entrada)
create policy escaneos_admin on escaneos for select
  using (mi_rol() = 'admin');
create policy escaneos_evento on escaneos for select
  using (mi_rol() in ('organizador', 'puerta') and evento_id = mi_evento());

-- El organizador no puede tocar el ingreso desde la app (solo la puerta vía validar_entrada)
create or replace function proteger_ingreso() returns trigger
language plpgsql as $$
begin
  if mi_rol() = 'organizador' then
    new.ingreso_en := old.ingreso_en;
    new.ingreso_por := old.ingreso_por;
    new.codigo := coalesce(old.codigo, new.codigo);
  end if;
  return new;
end $$;

create trigger invitados_proteger_ingreso
  before update on invitados
  for each row execute function proteger_ingreso();

-- ---------- Tiempo real (contador de la puerta) ----------
alter publication supabase_realtime add table invitados;

-- =====================================================================
-- DESPUÉS DE CORRER ESTO:
-- 1) Authentication → Users → Add user: crea tu usuario (correo + contraseña,
--    marca "Auto Confirm User").
-- 2) Corre esta línea cambiando el correo para volverte administrador:
--
--    insert into perfiles (id, nombre, rol)
--    select id, 'Kenet', 'admin' from auth.users where email = 'TU_CORREO@ejemplo.com';
-- =====================================================================
