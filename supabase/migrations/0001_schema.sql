-- ============================================================================
-- SB CashFlow — Schema
-- Postgres (Supabase). Normalized relational design for an ISP/Cable business.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── Enums ──────────────────────────────────────────────────────────────────
create type public.user_role      as enum ('owner', 'accountant', 'staff');
create type public.payment_mode   as enum ('cash', 'upi', 'bank_transfer', 'cheque');
create type public.txn_direction  as enum ('income', 'expense');

-- ─── Profiles (1:1 with auth.users) ─────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.user_role not null default 'staff',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'App users mirrored from auth.users with role.';

-- ─── Business settings (single row) ─────────────────────────────────────────
create table public.business_settings (
  id             uuid primary key default gen_random_uuid(),
  business_name  text not null default 'SB Cable Service',
  address        text,
  phone          text,
  email          text,
  gstin          text,
  fy_start_month smallint not null default 4 check (fy_start_month between 1 and 12),
  currency       text not null default 'INR',
  updated_at     timestamptz not null default now()
);

-- ─── Categories (income & expense) ──────────────────────────────────────────
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  direction  public.txn_direction not null,
  is_active  boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (name, direction)
);
comment on table public.categories is 'Income and expense categories.';

-- ─── Bank accounts ──────────────────────────────────────────────────────────
create table public.bank_accounts (
  id              uuid primary key default gen_random_uuid(),
  bank_name       text not null,
  account_name    text not null,
  account_number  text,
  ifsc            text,
  opening_balance numeric(14,2) not null default 0,
  current_balance numeric(14,2) not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Vendors ────────────────────────────────────────────────────────────────
create table public.vendors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  mobile     text,
  address    text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── Income ─────────────────────────────────────────────────────────────────
create table public.income (
  id            uuid primary key default gen_random_uuid(),
  txn_date      date not null default current_date,
  customer_name text,
  category_id   uuid references public.categories (id) on delete set null,
  description   text,
  amount        numeric(14,2) not null check (amount > 0),
  payment_mode  public.payment_mode not null default 'cash',
  bank_account_id uuid references public.bank_accounts (id) on delete set null,
  notes         text,
  created_by    uuid references public.profiles (id) on delete set null,
  is_locked     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index income_txn_date_idx     on public.income (txn_date);
create index income_category_idx     on public.income (category_id);
create index income_payment_mode_idx on public.income (payment_mode);
create index income_created_by_idx   on public.income (created_by);

-- ─── Expenses ───────────────────────────────────────────────────────────────
create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  txn_date      date not null default current_date,
  category_id   uuid references public.categories (id) on delete set null,
  vendor_id     uuid references public.vendors (id) on delete set null,
  description   text,
  amount        numeric(14,2) not null check (amount > 0),
  payment_mode  public.payment_mode not null default 'cash',
  bank_account_id uuid references public.bank_accounts (id) on delete set null,
  receipt_path  text,
  notes         text,
  created_by    uuid references public.profiles (id) on delete set null,
  is_locked     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index expenses_txn_date_idx     on public.expenses (txn_date);
create index expenses_category_idx     on public.expenses (category_id);
create index expenses_vendor_idx       on public.expenses (vendor_id);
create index expenses_payment_mode_idx on public.expenses (payment_mode);

-- ─── Bank deposits (cash → bank) ────────────────────────────────────────────
create table public.deposits (
  id              uuid primary key default gen_random_uuid(),
  txn_date        date not null default current_date,
  bank_account_id uuid not null references public.bank_accounts (id) on delete restrict,
  amount          numeric(14,2) not null check (amount > 0),
  deposited_by    text,
  slip_path       text,
  notes           text,
  created_by      uuid references public.profiles (id) on delete set null,
  is_locked       boolean not null default false,
  created_at      timestamptz not null default now()
);
create index deposits_txn_date_idx on public.deposits (txn_date);
create index deposits_bank_idx     on public.deposits (bank_account_id);

-- ─── Vendor purchases ───────────────────────────────────────────────────────
create table public.purchases (
  id          uuid primary key default gen_random_uuid(),
  txn_date    date not null default current_date,
  vendor_id   uuid not null references public.vendors (id) on delete restrict,
  item        text not null,
  quantity    numeric(12,2) not null default 1 check (quantity > 0),
  amount      numeric(14,2) not null check (amount >= 0),
  notes       text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index purchases_vendor_idx   on public.purchases (vendor_id);
create index purchases_txn_date_idx on public.purchases (txn_date);

-- ─── Daily closing ──────────────────────────────────────────────────────────
-- One row per closed day. Records become read-only when a day is closed.
create table public.daily_closings (
  id             uuid primary key default gen_random_uuid(),
  closing_date   date not null unique,
  opening_cash   numeric(14,2) not null default 0,
  cash_income    numeric(14,2) not null default 0,
  cash_expense   numeric(14,2) not null default 0,
  cash_deposited numeric(14,2) not null default 0,
  closing_cash   numeric(14,2) not null default 0,
  bank_deposits  numeric(14,2) not null default 0,
  is_closed      boolean not null default false,
  closed_by      uuid references public.profiles (id) on delete set null,
  closed_at      timestamptz,
  notes          text,
  created_at     timestamptz not null default now()
);
create index daily_closings_date_idx on public.daily_closings (closing_date);
