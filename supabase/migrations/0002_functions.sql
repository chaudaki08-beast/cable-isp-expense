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
