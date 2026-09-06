-- ============================================================================
-- GroomingOS — Row Level Security (RBAC): ADMIN / GROOMER / CLIENT / TV_DISPLAY
-- ============================================================================
--
-- CONTEXTO IMPORTANTE — léelo antes de correr esto en producción:
--
-- El backend de Next.js habla con Postgres vía Prisma usando el connection
-- string de "postgres.<project-ref>" (rol dueño de las tablas). En Postgres,
-- el DUEÑO de una tabla EVADE RLS por defecto, sin importar si RLS está
-- habilitado. Esto significa que:
--
--   1. Todas las Server Actions y API routes actuales (que usan Prisma) van
--      a seguir funcionando exactamente igual después de correr este script.
--      RLS no las afecta en absoluto.
--   2. RLS aquí protege el ÚNICO otro camino de acceso a los datos: clientes
--      que usan la clave publicable (anon key) directamente contra Supabase
--      — hoy en día, el canal de Realtime que consume el Dashboard TV, y
--      potencialmente cualquiera que descubra la anon key y golpee la API
--      REST autogenerada de Supabase (PostgREST) directamente.
--   3. Sin este script, CUALQUIERA con la anon key (que está en el bundle
--      público del navegador) puede leer/escribir CUALQUIER tabla vía
--      PostgREST, sin pasar por tu app. Este script cierra ese hueco con
--      "default deny": se habilita RLS en todas las tablas y solo se abren
--      los accesos de LECTURA que la TV / futuro portal de cliente
--      realmente necesitan. No se agregan políticas de escritura para
--      anon/authenticated porque ninguna escritura del navegador pasa por
--      ahí en esta arquitectura — todas las mutaciones van por Prisma.
--
-- Cómo correr: Supabase Dashboard → SQL Editor → pega todo → Run.
-- Es idempotente (usa CREATE POLICY IF NOT EXISTS vía DROP+CREATE).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Integridad referencial: Profile.id -> auth.users.id
--
--    NO se declara como FK real: una FK cruzada a `auth.users` obliga a
--    Prisma a tratar `auth` como schema gestionado (previewFeature
--    multiSchema + `@@schema("public")` en los ~35 modelos), lo cual rompe
--    `prisma db push`/migrate para todo el proyecto a cambio de una simple
--    verificación de integridad. Se prefiere mantener la app de un solo
--    schema y confiar en que Profile.id se crea siempre a partir de un
--    auth.users.id real (así lo hace `createStaffUser`/el bootstrap).
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 2. Helper: rol efectivo del usuario autenticado actual (según Profile)
-- ----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role::text from "Profile" where id = auth.uid() and active = true
$$;

create or replace function public.current_tutor_id()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select "tutorId" from "Profile" where id = auth.uid() and active = true
$$;

-- ----------------------------------------------------------------------------
-- 3. Habilitar RLS en todas las tablas (default deny: sin políticas = sin acceso
--    para anon/authenticated; el rol "postgres" de Prisma sigue sin verse afectado)
-- ----------------------------------------------------------------------------
alter table "Tutor" enable row level security;
alter table "Pet" enable row level security;
alter table "PetPhoto" enable row level security;
alter table "ClinicalRecord" enable row level security;
alter table "Staff" enable row level security;
alter table "Service" enable row level security;
alter table "ServiceStageTemplate" enable row level security;
alter table "RecurringSchedule" enable row level security;
alter table "Appointment" enable row level security;
alter table "NotificationLog" enable row level security;
alter table "Formula" enable row level security;
alter table "FormulaUsage" enable row level security;
alter table "DailyPrepPlan" enable row level security;
alter table "DailyPrepItem" enable row level security;
alter table "TimeLog" enable row level security;
alter table "Product" enable row level security;
alter table "InventoryTransaction" enable row level security;
alter table "Instrument" enable row level security;
alter table "InstrumentUsageLog" enable row level security;
alter table "Equipment" enable row level security;
alter table "MaintenanceLog" enable row level security;
alter table "Invoice" enable row level security;
alter table "InvoiceItem" enable row level security;
alter table "FixedExpense" enable row level security;
alter table "FinancialSnapshot" enable row level security;
alter table "Workstation" enable row level security;
alter table "ServicePipeline" enable row level security;
alter table "ProcessStep" enable row level security;
alter table "SubProcess" enable row level security;
alter table "AppointmentStep" enable row level security;
alter table "AppointmentSubProcess" enable row level security;
alter table "Profile" enable row level security;
alter table "AuditLog" enable row level security;

-- ----------------------------------------------------------------------------
-- 4. Profile: cada quien lee su propio perfil (para resolver su rol client-side)
-- ----------------------------------------------------------------------------
drop policy if exists "profile_read_own" on "Profile";
create policy "profile_read_own" on "Profile"
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "profile_admin_read_all" on "Profile";
create policy "profile_admin_read_all" on "Profile"
  for select to authenticated
  using (public.current_user_role() = 'ADMIN');

-- ----------------------------------------------------------------------------
-- 5. Dashboard TV / Control Center: ADMIN, GROOMER y TV_DISPLAY leen la
--    operación del día (lo que el Realtime del Dashboard TV necesita)
-- ----------------------------------------------------------------------------
drop policy if exists "operational_read_staff_and_tv" on "Appointment";
create policy "operational_read_staff_and_tv" on "Appointment"
  for select to authenticated
  using (
    public.current_user_role() in ('ADMIN', 'GROOMER', 'TV_DISPLAY')
    or (public.current_user_role() = 'CLIENT' and "tutorId" = public.current_tutor_id())
  );

drop policy if exists "operational_read_staff_and_tv" on "AppointmentStep";
create policy "operational_read_staff_and_tv" on "AppointmentStep"
  for select to authenticated
  using (public.current_user_role() in ('ADMIN', 'GROOMER', 'TV_DISPLAY'));

drop policy if exists "operational_read_staff_and_tv" on "AppointmentSubProcess";
create policy "operational_read_staff_and_tv" on "AppointmentSubProcess"
  for select to authenticated
  using (public.current_user_role() in ('ADMIN', 'GROOMER', 'TV_DISPLAY'));

drop policy if exists "operational_read_staff_and_tv" on "Workstation";
create policy "operational_read_staff_and_tv" on "Workstation"
  for select to authenticated
  using (public.current_user_role() in ('ADMIN', 'GROOMER', 'TV_DISPLAY'));

drop policy if exists "operational_read_staff_and_tv" on "ServicePipeline";
create policy "operational_read_staff_and_tv" on "ServicePipeline"
  for select to authenticated
  using (public.current_user_role() in ('ADMIN', 'GROOMER', 'TV_DISPLAY'));

drop policy if exists "operational_read_staff_and_tv" on "ProcessStep";
create policy "operational_read_staff_and_tv" on "ProcessStep"
  for select to authenticated
  using (public.current_user_role() in ('ADMIN', 'GROOMER', 'TV_DISPLAY'));

drop policy if exists "operational_read_staff_and_tv" on "SubProcess";
create policy "operational_read_staff_and_tv" on "SubProcess"
  for select to authenticated
  using (public.current_user_role() in ('ADMIN', 'GROOMER', 'TV_DISPLAY'));

-- Pet/Tutor: ADMIN y GROOMER ven todo (operación diaria); CLIENT solo lo suyo;
-- TV_DISPLAY ve nombre de mascota/tutor porque las tarjetas del Gantt los muestran.
drop policy if exists "pet_read_staff_tv_or_own" on "Pet";
create policy "pet_read_staff_tv_or_own" on "Pet"
  for select to authenticated
  using (
    public.current_user_role() in ('ADMIN', 'GROOMER', 'TV_DISPLAY')
    or (public.current_user_role() = 'CLIENT' and "tutorId" = public.current_tutor_id())
  );

drop policy if exists "tutor_read_staff_tv_or_own" on "Tutor";
create policy "tutor_read_staff_tv_or_own" on "Tutor"
  for select to authenticated
  using (
    public.current_user_role() in ('ADMIN', 'GROOMER', 'TV_DISPLAY')
    or (public.current_user_role() = 'CLIENT' and id = public.current_tutor_id())
  );

-- ----------------------------------------------------------------------------
-- 6. Portal del Cliente (futuro Módulo /client/*) — políticas ya listas aunque
--    las páginas todavía no existan, para no tener que reabrir este script.
-- ----------------------------------------------------------------------------
drop policy if exists "petphoto_read_staff_or_own" on "PetPhoto";
create policy "petphoto_read_staff_or_own" on "PetPhoto"
  for select to authenticated
  using (
    public.current_user_role() in ('ADMIN', 'GROOMER')
    or exists (
      select 1 from "Pet" p
      where p.id = "PetPhoto"."petId" and p."tutorId" = public.current_tutor_id()
    )
  );

drop policy if exists "clinicalrecord_read_staff_or_own" on "ClinicalRecord";
create policy "clinicalrecord_read_staff_or_own" on "ClinicalRecord"
  for select to authenticated
  using (
    public.current_user_role() in ('ADMIN', 'GROOMER')
    or exists (
      select 1 from "Pet" p
      where p.id = "ClinicalRecord"."petId" and p."tutorId" = public.current_tutor_id()
    )
  );

drop policy if exists "invoice_read_staff_or_own" on "Invoice";
create policy "invoice_read_staff_or_own" on "Invoice"
  for select to authenticated
  using (
    public.current_user_role() = 'ADMIN'
    or (public.current_user_role() = 'CLIENT' and "tutorId" = public.current_tutor_id())
  );

drop policy if exists "invoiceitem_read_staff_or_own" on "InvoiceItem";
create policy "invoiceitem_read_staff_or_own" on "InvoiceItem"
  for select to authenticated
  using (
    public.current_user_role() = 'ADMIN'
    or exists (
      select 1 from "Invoice" i
      where i.id = "InvoiceItem"."invoiceId" and i."tutorId" = public.current_tutor_id()
    )
  );

-- ----------------------------------------------------------------------------
-- 7. Todo lo demás (Service, Product, Instrument, Equipment, gastos fijos,
--    reportes financieros, AuditLog, etc.) queda con RLS habilitado y SIN
--    políticas: default deny total para anon/authenticated. Solo Prisma
--    (rol postgres, dueño de las tablas) puede leerlas/escribirlas — que es
--    exactamente como deben seguir funcionando el inventario, facturación y
--    reportes internos hoy en día.
-- ----------------------------------------------------------------------------
