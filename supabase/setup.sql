-- ============================================================
-- SB CashFlow — full database setup (run once in Supabase SQL Editor)
-- Combined from migrations/0001..0004. Safe to run top-to-bottom.
-- ============================================================


-- >>>>>>>>>>>>>>>>>> migrations/0001_schema.sql >>>>>>>>>>>>>>>>>>
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


-- >>>>>>>>>>>>>>>>>> migrations/0002_functions.sql >>>>>>>>>>>>>>>>>>
-- ============================================================================
-- SB CashFlow — Functions & Triggers
-- Keeps bank balances and cash figures accurate automatically.
-- ============================================================================

-- ─── updated_at maintenance ─────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated       before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_bank_accounts_updated  before update on public.bank_accounts
  for each row execute function public.set_updated_at();
create trigger trg_income_updated         before update on public.income
  for each row execute function public.set_updated_at();
create trigger trg_expenses_updated       before update on public.expenses
  for each row execute function public.set_updated_at();

-- ─── New auth user → profile row ────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'staff')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Recompute a bank account's current balance from source rows ────────────
create or replace function public.recalc_bank_balance(p_bank uuid)
returns void language plpgsql as $$
begin
  update public.bank_accounts b
  set current_balance = b.opening_balance
    + coalesce((select sum(amount) from public.deposits
                 where bank_account_id = p_bank), 0)
    + coalesce((select sum(amount) from public.income
                 where bank_account_id = p_bank
                   and payment_mode in ('upi','bank_transfer','cheque')), 0)
    - coalesce((select sum(amount) from public.expenses
                 where bank_account_id = p_bank
                   and payment_mode in ('upi','bank_transfer','cheque')), 0)
  where b.id = p_bank;
end;
$$;

-- Trigger wrapper: recompute affected bank account(s) after row changes.
create or replace function public.trg_recalc_bank()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'DELETE') then
    if old.bank_account_id is not null then
      perform public.recalc_bank_balance(old.bank_account_id);
    end if;
    return old;
  end if;

  if new.bank_account_id is not null then
    perform public.recalc_bank_balance(new.bank_account_id);
  end if;
  if (tg_op = 'UPDATE' and old.bank_account_id is distinct from new.bank_account_id
      and old.bank_account_id is not null) then
    perform public.recalc_bank_balance(old.bank_account_id);
  end if;
  return new;
end;
$$;

create trigger trg_deposits_bank after insert or update or delete on public.deposits
  for each row execute function public.trg_recalc_bank();
create trigger trg_income_bank   after insert or update or delete on public.income
  for each row execute function public.trg_recalc_bank();
create trigger trg_expenses_bank after insert or update or delete on public.expenses
  for each row execute function public.trg_recalc_bank();

-- ─── Cash-in-hand as of a given date (inclusive) ────────────────────────────
-- Cash income - cash expenses - cash deposited, across all time up to p_date.
create or replace function public.cash_in_hand(p_date date default current_date)
returns numeric language sql stable as $$
  select
      coalesce((select sum(amount) from public.income
                 where payment_mode = 'cash' and txn_date <= p_date), 0)
    - coalesce((select sum(amount) from public.expenses
                 where payment_mode = 'cash' and txn_date <= p_date), 0)
    - coalesce((select sum(amount) from public.deposits
                 where txn_date <= p_date), 0);
$$;

-- ─── Dashboard summary (single round-trip) ──────────────────────────────────
create or replace function public.dashboard_summary(p_date date default current_date)
returns json language sql stable as $$
  with month_start as (select date_trunc('month', p_date)::date as d)
  select json_build_object(
    'today_income', coalesce((select sum(amount) from public.income
                               where txn_date = p_date), 0),
    'today_expense', coalesce((select sum(amount) from public.expenses
                                where txn_date = p_date), 0),
    'today_deposit', coalesce((select sum(amount) from public.deposits
                                where txn_date = p_date), 0),
    'cash_in_hand', public.cash_in_hand(p_date),
    'total_bank_balance', coalesce((select sum(current_balance)
                                     from public.bank_accounts
                                     where is_active), 0),
    'month_income', coalesce((select sum(amount) from public.income
                               where txn_date >= (select d from month_start)
                                 and txn_date <= p_date), 0),
    'month_expense', coalesce((select sum(amount) from public.expenses
                                where txn_date >= (select d from month_start)
                                  and txn_date <= p_date), 0)
  );
$$;


-- >>>>>>>>>>>>>>>>>> migrations/0003_rls.sql >>>>>>>>>>>>>>>>>>
-- ============================================================================
-- SB CashFlow — Row Level Security
-- Roles: owner (full control), accountant (full data, no user mgmt),
--        staff (record transactions, edit only own unlocked rows).
-- ============================================================================

-- ─── Role helpers ───────────────────────────────────────────────────────────
create or replace function public.my_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('owner','accountant'), false);
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'owner', false);
$$;

-- Enable RLS everywhere.
alter table public.profiles          enable row level security;
alter table public.business_settings enable row level security;
alter table public.categories        enable row level security;
alter table public.bank_accounts     enable row level security;
alter table public.vendors           enable row level security;
alter table public.income            enable row level security;
alter table public.expenses          enable row level security;
alter table public.deposits          enable row level security;
alter table public.purchases         enable row level security;
alter table public.daily_closings    enable row level security;

-- ─── profiles ───────────────────────────────────────────────────────────────
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles: owner manages" on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());
create policy "profiles: update own name" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ─── Reference data: everyone reads, admins write ───────────────────────────
create policy "settings: read all" on public.business_settings
  for select using (auth.role() = 'authenticated');
create policy "settings: admin write" on public.business_settings
  for all using (public.is_admin()) with check (public.is_admin());

create policy "categories: read all" on public.categories
  for select using (auth.role() = 'authenticated');
create policy "categories: admin write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "banks: read all" on public.bank_accounts
  for select using (auth.role() = 'authenticated');
create policy "banks: admin write" on public.bank_accounts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "vendors: read all" on public.vendors
  for select using (auth.role() = 'authenticated');
create policy "vendors: write authed" on public.vendors
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ─── Transactional data ─────────────────────────────────────────────────────
-- Everyone authenticated may read and insert. Editing/deleting is limited:
-- admins can touch any unlocked row; staff only their own unlocked rows.
-- Locked rows (closed days) are immutable except to the owner.

-- income
create policy "income: read all" on public.income
  for select using (auth.role() = 'authenticated');
create policy "income: insert authed" on public.income
  for insert with check (auth.role() = 'authenticated');
create policy "income: update" on public.income
  for update using (
    (not is_locked and (public.is_admin() or created_by = auth.uid()))
    or public.is_owner()
  ) with check (
    (not is_locked and (public.is_admin() or created_by = auth.uid()))
    or public.is_owner()
  );
create policy "income: delete" on public.income
  for delete using (
    (not is_locked and (public.is_admin() or created_by = auth.uid()))
    or public.is_owner()
  );

-- expenses
create policy "expenses: read all" on public.expenses
  for select using (auth.role() = 'authenticated');
create policy "expenses: insert authed" on public.expenses
  for insert with check (auth.role() = 'authenticated');
create policy "expenses: update" on public.expenses
  for update using (
    (not is_locked and (public.is_admin() or created_by = auth.uid()))
    or public.is_owner()
  ) with check (
    (not is_locked and (public.is_admin() or created_by = auth.uid()))
    or public.is_owner()
  );
create policy "expenses: delete" on public.expenses
  for delete using (
    (not is_locked and (public.is_admin() or created_by = auth.uid()))
    or public.is_owner()
  );

-- deposits
create policy "deposits: read all" on public.deposits
  for select using (auth.role() = 'authenticated');
create policy "deposits: insert authed" on public.deposits
  for insert with check (auth.role() = 'authenticated');
create policy "deposits: update" on public.deposits
  for update using (
    (not is_locked and (public.is_admin() or created_by = auth.uid()))
    or public.is_owner()
  ) with check (
    (not is_locked and (public.is_admin() or created_by = auth.uid()))
    or public.is_owner()
  );
create policy "deposits: delete" on public.deposits
  for delete using (
    (not is_locked and (public.is_admin() or created_by = auth.uid()))
    or public.is_owner()
  );

-- purchases
create policy "purchases: read all" on public.purchases
  for select using (auth.role() = 'authenticated');
create policy "purchases: write authed" on public.purchases
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ─── Daily closings: admins manage, everyone reads ──────────────────────────
create policy "closings: read all" on public.daily_closings
  for select using (auth.role() = 'authenticated');
create policy "closings: admin manage" on public.daily_closings
  for all using (public.is_admin()) with check (public.is_admin());


-- >>>>>>>>>>>>>>>>>> migrations/0004_seed.sql >>>>>>>>>>>>>>>>>>
-- ============================================================================
-- SB CashFlow — Seed data
-- Default income/expense categories and a business settings row.
-- Payment modes are a fixed enum (cash, upi, bank_transfer, cheque).
-- ============================================================================

insert into public.business_settings (business_name, currency, fy_start_month)
select 'SB Cable Service', 'INR', 4
where not exists (select 1 from public.business_settings);

-- Income categories
insert into public.categories (name, direction, sort_order) values
  ('Broadband Bill', 'income', 1),
  ('Cable Bill',     'income', 2),
  ('Installation',   'income', 3),
  ('Router Sale',    'income', 4),
  ('Reconnection',   'income', 5),
  ('Miscellaneous',  'income', 6)
on conflict (name, direction) do nothing;

-- Expense categories
insert into public.categories (name, direction, sort_order) values
  ('Salary',          'expense', 1),
  ('Fuel',            'expense', 2),
  ('Electricity',     'expense', 3),
  ('Rent',            'expense', 4),
  ('Fiber Purchase',  'expense', 5),
  ('Cable Purchase',  'expense', 6),
  ('Router Purchase', 'expense', 7),
  ('Office',          'expense', 8),
  ('Tea & Snacks',    'expense', 9),
  ('Maintenance',     'expense', 10),
  ('Transport',       'expense', 11),
  ('Miscellaneous',   'expense', 12)
on conflict (name, direction) do nothing;

