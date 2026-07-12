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
