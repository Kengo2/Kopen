-- =====================================================================
-- Arreglo 02: marcar si el evento ya fue cobrado al organizador.
-- Pegar completo en Supabase → SQL Editor → Run (una sola vez).
-- =====================================================================

alter table eventos add column if not exists cobrado boolean not null default false;
alter table eventos add column if not exists cobrado_en timestamptz;
