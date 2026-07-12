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
