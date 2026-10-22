-- ============================================================
-- HRIS Smart-Performance — Supabase Schema (Updated)
-- Jalankan di Supabase SQL Editor (Project → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────
-- 1. MASTER TABLES
-- ──────────────────────────────────────────

-- Data Pegawai (Employee Master Data)
create table if not exists pegawai (
  id            uuid primary key default uuid_generate_v4(),
  nama_lengkap  text not null,
  nip           text unique not null,
  unit_es2      text not null default '',
  unit_es3      text not null default '',
  unit_es4      text not null default '',
  jabatan       text not null default '',
  pangkat_golongan text default '',
  tmt_jabatan   date,
  created_at    timestamptz default now()
);

create table if not exists unit_risks (
  unit_id   uuid primary key default uuid_generate_v4(),
  unit_name text not null,
  risk_factor numeric(4,2) not null default 1.0,
  updated_at timestamptz default now()
);

create table if not exists job_salary (
  job_id           uuid primary key default uuid_generate_v4(),
  job_name         text not null,
  standard_payment bigint not null default 0,
  updated_at       timestamptz default now()
);

create table if not exists users (
  id         uuid primary key default uuid_generate_v4(),
  email      text unique not null,
  role       text not null default 'staff',
  pegawai_id uuid references pegawai(id),
  avatar_url text,
  led_unit_es2 text,
  led_sukpa    text,
  created_at timestamptz default now()
);

create table if not exists master_iku (
  id             uuid primary key default uuid_generate_v4(),
  kode_iku       text not null,
  nama_iku       text not null,
  kode_kegiatan  text not null,
  nama_kegiatan  text not null,
  kode_output    text not null,
  nama_output    text not null,
  created_at     timestamptz default now()
);

-- ──────────────────────────────────────────
-- 2. SKP PLANNING
-- ──────────────────────────────────────────

create table if not exists skp_plans (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references users(id) on delete cascade,
  output_id        uuid references master_iku(id),
  target_individual numeric not null default 0,
  satuan           text not null default 'Unit',
  rencana_aksi     text,
  parent_skp_id    uuid references skp_plans(id) on delete set null,
  iku_item_id      uuid references iku_pengajuan_item(id) on delete set null,
  catatan_reviewer text,
  status           text not null check (status in ('draft','pending','approved','rejected','revision')) default 'draft',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ──────────────────────────────────────────
-- 3. LOGBOOK & EVIDENCE
-- ──────────────────────────────────────────

create table if not exists activity_logs (
  id                  uuid primary key default uuid_generate_v4(),
  skp_id              uuid references skp_plans(id) on delete cascade,
  user_id             uuid references users(id) on delete cascade,
  description         text not null,
  progress_percentage numeric(5,2) not null default 0 check (progress_percentage >= 0),
  evidence_url        text,
  evidence_name       text,
  tanggal             date not null default current_date,
  status              text not null check (status in ('valid','pending_evidence','revision')) default 'pending_evidence',
  created_at          timestamptz default now()
);

-- ──────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ──────────────────────────────────────────

alter table pegawai        enable row level security;
alter table users          enable row level security;
alter table master_iku     enable row level security;
alter table skp_plans      enable row level security;
alter table activity_logs  enable row level security;
alter table unit_risks     enable row level security;
alter table job_salary     enable row level security;

-- Pegawai: admin can manage, authenticated can read
create policy "Read pegawai" on pegawai
  for select using (auth.role() = 'authenticated');

create policy "Manage pegawai: admin" on pegawai
  for all using ( public.is_admin() );

-- Users can read their own row for update/delete
create policy "Users: own row" on users
  for all using (id = auth.uid());

-- Authenticated users can read all users (needed for joins)
create policy "Users: read all" on users
  for select using (auth.role() = 'authenticated');

-- Function to safely check if user is admin without recursion
create or replace function public.is_admin()
returns boolean as $$
declare
  _is_adm boolean;
begin
  select position('admin' in role) > 0 into _is_adm from public.users where id = auth.uid();
  return coalesce(_is_adm, false);
end;
$$ language plpgsql security definer set search_path = public;

-- Admin can do everything on users
create policy "Admin: all users" on users
  for all using ( public.is_admin() );

-- All authenticated users can read IKU
create policy "Read IKU" on master_iku
  for select using (auth.role() = 'authenticated');

create policy "Manage IKU: admin" on master_iku
  for all using ( public.is_admin() );

-- Staff: own SKP plans
create policy "SKP: own" on skp_plans
  for all using (user_id = auth.uid());

-- Reviewer can update SKP plans
create policy "SKP: reviewer update" on skp_plans
  for update using (
    exists (
      select 1 from users u
      join pegawai p on p.id = u.pegawai_id
      join users owner on owner.id = skp_plans.user_id
      join pegawai owner_p on owner_p.id = owner.pegawai_id
      where u.id = auth.uid()
        and (
          (position('supervisor' in u.role) > 0 and position('staff' in owner.role) > 0 and p.unit_es4 = owner_p.unit_es4)
          or
          (position('manajer' in u.role) > 0 and position('supervisor' in owner.role) > 0 and p.unit_es3 = owner_p.unit_es3)
          or public.is_admin()
        )
    )
  );

-- Everyone can read SKP plans (frontend handles the filtering)
create policy "SKP: read all" on skp_plans
  for select using (auth.role() = 'authenticated');

-- Activity logs: own entries
create policy "Logs: own" on activity_logs
  for all using (user_id = auth.uid());

-- Supervisor+ can read unit logs
create policy "Logs: supervisor+ read" on activity_logs
  for select using (
    exists (
      select 1 from users u
      join pegawai p on p.id = u.pegawai_id
      join users owner on owner.id = activity_logs.user_id
      join pegawai owner_p on owner_p.id = owner.pegawai_id
      where u.id = auth.uid()
        and (
          position('supervisor' in u.role) > 0 or 
          position('manajer' in u.role) > 0 or 
          position('pimpinan' in u.role) > 0 or 
          position('rektor' in u.role) > 0 or 
          position('admin' in u.role) > 0
        )
        and p.unit_es2 = owner_p.unit_es2
    )
  );

-- Everyone can read risk & salary (for remuneration calc)
create policy "Read unit_risks" on unit_risks for select using (auth.role() = 'authenticated');
create policy "Read job_salary" on job_salary for select using (auth.role() = 'authenticated');
create policy "Manage risks: admin" on unit_risks
  for all using ( public.is_admin() );
create policy "Manage salary: admin" on job_salary
  for all using ( public.is_admin() );



create table if not exists master_periode_iku (
  id                    uuid primary key default uuid_generate_v4(),
  tahun_iku             text not null, -- contoh: "2026"
  tgl_mulai_pengajuan   date not null,
  tgl_akhir_pengajuan   date not null,
  is_active             boolean not null default false,
  created_at            timestamptz default now()
);

create table if not exists iku_pengajuan (
  id               uuid primary key default uuid_generate_v4(),
  periode_id       uuid not null references master_periode_iku(id),
  manajer_id       uuid not null references users(id) on delete cascade,
  judul            text not null default 'Pengajuan IKU Bagian',
  status           text not null check (status in ('draft','pending','approved','rejected','revision','cancellation_pending','cancelled')) default 'draft',
  catatan_penolakan text,
  alasan_pembatalan text,
  reviewed_by      uuid references users(id),
  reviewed_at      timestamptz,
  submitted_at     timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table if not exists iku_pengajuan_item (
  id              uuid primary key default uuid_generate_v4(),
  pengajuan_id    uuid not null references iku_pengajuan(id) on delete cascade,
  iku_id          uuid not null references master_iku(id),
  target_output   numeric not null default 0,
  satuan          text not null default 'Unit',
  catatan_pimpinan text,
  status_pembatalan text check (status_pembatalan in ('pending', 'approved', 'rejected')),
  alasan_pembatalan text,
  created_at      timestamptz default now()
);

create table if not exists iku_laporan (
  id              uuid primary key default uuid_generate_v4(),
  item_id         uuid not null references iku_pengajuan_item(id) on delete cascade,
  manajer_id      uuid not null references users(id) on delete cascade,
  capaian         numeric not null default 0 check (capaian >= 0),
  keterangan      text,
  evidence_url    text,
  evidence_name   text,
  tanggal_laporan date not null default current_date,
  created_at      timestamptz default now()
);

-- RLS for Periode
alter table master_periode_iku enable row level security;
create policy "Periode IKU: read all" on master_periode_iku for select using (auth.role() = 'authenticated');
create policy "Periode IKU: admin manage" on master_periode_iku for all using (public.is_admin());

-- RLS for IKU Pengajuan
alter table iku_pengajuan enable row level security;
create policy "IKU Pengajuan: own" on iku_pengajuan for all using (manajer_id = auth.uid());
create policy "IKU Pengajuan: pimpinan read" on iku_pengajuan for select using (
  public.is_admin() or exists (
    select 1 from users u 
    where u.id = auth.uid() and (position('pimpinan' in u.role) > 0)
  )
);
create policy "IKU Pengajuan: pimpinan update" on iku_pengajuan for update using (
  public.is_admin() or exists (
    select 1 from users u 
    where u.id = auth.uid() and (position('pimpinan' in u.role) > 0)
  )
);
create policy "IKU Pengajuan: read approved" on iku_pengajuan for select using (status = 'approved');

-- RLS for IKU Item
alter table iku_pengajuan_item enable row level security;
create policy "IKU Item: own" on iku_pengajuan_item for all using (
  exists (select 1 from iku_pengajuan p where p.id = pengajuan_id and p.manajer_id = auth.uid())
);
create policy "IKU Item: pimpinan read" on iku_pengajuan_item for select using (
  public.is_admin() or exists (
    select 1 from users u 
    where u.id = auth.uid() and (position('pimpinan' in u.role) > 0)
  )
);
create policy "IKU Item: pimpinan update" on iku_pengajuan_item for update using (
  public.is_admin() or exists (
    select 1 from users u 
    where u.id = auth.uid() and (position('pimpinan' in u.role) > 0)
  )
);
create policy "IKU Item: read approved" on iku_pengajuan_item for select using (
  exists (select 1 from iku_pengajuan p where p.id = pengajuan_id and p.status = 'approved')
);

-- RLS for Laporan
alter table iku_laporan enable row level security;
create policy "IKU Laporan: own" on iku_laporan for all using (manajer_id = auth.uid());
create policy "IKU Laporan: pimpinan read" on iku_laporan for select using (
  public.is_admin() or exists (
    select 1 from users u 
    where u.id = auth.uid() and (position('pimpinan' in u.role) > 0)
  )
);
