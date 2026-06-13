-- ============================================================
-- GoldSave Laos — Supabase / PostgreSQL Production Schema
-- รองรับผู้ใช้ 100,000+ คน · Row Level Security เปิดทุกตาราง
-- ============================================================

-- ผู้ใช้ — auth จัดการโดยระบบ OTP + HMAC session ของแอป
-- (ถ้าต้องการใช้ Supabase Auth แทน: เปลี่ยน id เป็น references auth.users(id))
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text unique not null,
  kyc_status text not null default 'unverified'
    check (kyc_status in ('unverified','pending','verified')),
  face_verified boolean not null default false,
  two_fa_enabled boolean not null default false,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

-- กระเป๋าเงิน — เก็บเป็น integer (LAK) และ numeric(18,4) (กรัม) ป้องกัน floating point error
create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  lak_balance bigint not null default 0 check (lak_balance >= 0),
  gold_gram numeric(18,4) not null default 0 check (gold_gram >= 0),
  updated_at timestamptz not null default now()
);

-- การตั้งค่าระบบ (Risk Buffer / ค่าธรรมเนียม) — แก้ไขได้จาก Admin Panel
create table public.settings (
  key text primary key,
  value numeric not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.settings (key, value) values
  ('fx_risk_pct', 4),
  ('gold_risk_pct', 2),
  ('op_cost_pct', 1),
  ('profit_pct', 3),
  ('buyback_discount_pct', 2),
  ('min_save_lak', 10000),
  ('min_withdraw_gram', 1),
  ('shipping_flat_lak', 80000),
  ('withdraw_processing_pct', 1),
  ('cash_withdraw_fee_lak', 5000);

-- ธุรกรรม — บันทึกราคา ณ เวลาทำรายการ + กำไรบริษัทต่อรายการ (เพื่อรายงานกำไร)
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  type text not null check (type in ('buy','sell','deposit','withdraw_cash','withdraw_gold')),
  lak bigint not null default 0,
  gram numeric(18,4) not null default 0,
  price_per_gram numeric(18,2) not null default 0,
  xau_usd numeric(12,2),          -- snapshot ราคาทองโลกขณะทำรายการ
  usd_lak numeric(12,2),          -- snapshot อัตราแลกเปลี่ยน
  fee bigint not null default 0,
  profit_lak bigint not null default 0,
  status text not null default 'completed'
    check (status in ('completed','pending','rejected')),
  created_at timestamptz not null default now()
);
create index idx_tx_user on public.transactions (user_id, created_at desc);
create index idx_tx_created on public.transactions (created_at desc);

-- คำขอถอน — ต้องผ่านการอนุมัติจาก Admin
create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  type text not null check (type in ('cash','gold')),
  lak bigint not null default 0,
  gram numeric(18,4) not null default 0,
  fee bigint not null default 0,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  shipping_address text,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_wd_status on public.withdrawals (status, created_at desc);

-- เอกสาร KYC
create table public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  doc_type text not null check (doc_type in ('id_card','passport','selfie','face_scan')),
  storage_path text not null,      -- path ใน Supabase Storage (bucket เข้ารหัส)
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- OTP codes (ใช้เมื่อส่ง SMS ผ่าน gateway ของตัวเอง — ถ้าใช้ Supabase Auth Phone ไม่ต้องใช้ตารางนี้)
create table public.otp_codes (
  phone text primary key,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- snapshot ราคาทุกนาที (สำหรับกราฟย้อนหลัง)
create table public.price_history (
  id bigint generated always as identity primary key,
  xau_usd numeric(12,2) not null,
  usd_lak numeric(12,2) not null,
  real_lak_per_gram numeric(18,2) not null,
  created_at timestamptz not null default now()
);
create index idx_price_history_t on public.price_history (created_at desc);

-- ============================================================
-- ฟังก์ชันซื้อ/ขายแบบ atomic — ป้องกัน race condition ด้วย row lock
-- ============================================================
create or replace function public.execute_buy(
  p_user_id uuid, p_lak bigint, p_sell_price numeric, p_real_price numeric,
  p_xau numeric, p_lak_rate numeric
) returns numeric language plpgsql security definer as $$
declare
  v_gram numeric(18,4);
  v_min bigint;
begin
  select value into v_min from public.settings where key = 'min_save_lak';
  if p_lak < v_min then raise exception 'below minimum'; end if;

  -- lock แถว wallet กัน double-spend
  perform 1 from public.wallets where user_id = p_user_id for update;

  v_gram := floor((p_lak / p_sell_price) * 10000) / 10000;

  update public.wallets
    set lak_balance = lak_balance - p_lak,
        gold_gram = gold_gram + v_gram,
        updated_at = now()
    where user_id = p_user_id and lak_balance >= p_lak;
  if not found then raise exception 'insufficient balance'; end if;

  insert into public.transactions
    (user_id, type, lak, gram, price_per_gram, xau_usd, usd_lak, profit_lak)
  values
    (p_user_id, 'buy', p_lak, v_gram, p_sell_price, p_xau, p_lak_rate,
     round(v_gram * (p_sell_price - p_real_price)));
  return v_gram;
end $$;

create or replace function public.execute_sell(
  p_user_id uuid, p_gram numeric, p_buy_price numeric, p_real_price numeric,
  p_xau numeric, p_lak_rate numeric
) returns bigint language plpgsql security definer as $$
declare
  v_lak bigint;
begin
  perform 1 from public.wallets where user_id = p_user_id for update;
  v_lak := floor(p_gram * p_buy_price);

  update public.wallets
    set gold_gram = gold_gram - p_gram,
        lak_balance = lak_balance + v_lak,
        updated_at = now()
    where user_id = p_user_id and gold_gram >= p_gram;
  if not found then raise exception 'insufficient gold balance'; end if;

  insert into public.transactions
    (user_id, type, lak, gram, price_per_gram, xau_usd, usd_lak, profit_lak)
  values
    (p_user_id, 'sell', v_lak, p_gram, p_buy_price, p_xau, p_lak_rate,
     round(p_gram * (p_real_price - p_buy_price)));
  return v_lak;
end $$;

create or replace function public.topup(p_user_id uuid, p_lak bigint)
returns bigint language plpgsql security definer as $$
declare v_balance bigint;
begin
  update public.wallets
    set lak_balance = lak_balance + p_lak, updated_at = now()
    where user_id = p_user_id
    returning lak_balance into v_balance;
  if not found then raise exception 'user not found'; end if;
  insert into public.transactions (user_id, type, lak) values (p_user_id, 'deposit', p_lak);
  return v_balance;
end $$;

create or replace function public.request_withdraw_cash(
  p_user_id uuid, p_lak bigint, p_fee bigint
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
  perform 1 from public.wallets where user_id = p_user_id for update;
  update public.wallets
    set lak_balance = lak_balance - (p_lak + p_fee), updated_at = now()
    where user_id = p_user_id and lak_balance >= (p_lak + p_fee);
  if not found then raise exception 'insufficient balance (incl. fee)'; end if;

  insert into public.withdrawals (user_id, type, lak, fee)
    values (p_user_id, 'cash', p_lak, p_fee) returning id into v_id;
  insert into public.transactions (user_id, type, lak, fee, profit_lak, status)
    values (p_user_id, 'withdraw_cash', p_lak, p_fee, p_fee, 'pending');
  return v_id;
end $$;

create or replace function public.request_withdraw_gold(
  p_user_id uuid, p_gram numeric, p_fee bigint, p_real_price numeric
) returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
  v_min numeric;
  v_shipping bigint;
begin
  select value into v_min from public.settings where key = 'min_withdraw_gram';
  if p_gram < v_min then raise exception 'below minimum withdrawal'; end if;
  select value into v_shipping from public.settings where key = 'shipping_flat_lak';

  perform 1 from public.wallets where user_id = p_user_id for update;
  update public.wallets
    set gold_gram = gold_gram - p_gram,
        lak_balance = lak_balance - p_fee,
        updated_at = now()
    where user_id = p_user_id and gold_gram >= p_gram and lak_balance >= p_fee;
  if not found then raise exception 'insufficient balance for withdrawal'; end if;

  insert into public.withdrawals (user_id, type, gram, fee)
    values (p_user_id, 'gold', p_gram, p_fee) returning id into v_id;
  insert into public.transactions
    (user_id, type, gram, price_per_gram, fee, profit_lak, status)
    values (p_user_id, 'withdraw_gold', p_gram, p_real_price, p_fee,
            p_fee - v_shipping, 'pending');
  return v_id;
end $$;

create or replace function public.decide_withdrawal(p_id uuid, p_action text)
returns void language plpgsql security definer as $$
declare w record;
begin
  select * into w from public.withdrawals where id = p_id for update;
  if not found then raise exception 'not found'; end if;
  if w.status <> 'pending' then raise exception 'already decided'; end if;

  if p_action = 'approve' then
    update public.withdrawals set status = 'approved', decided_at = now() where id = p_id;
    update public.transactions set status = 'completed'
      where user_id = w.user_id and created_at >= w.created_at - interval '2 seconds'
        and type in ('withdraw_cash','withdraw_gold') and status = 'pending';
  elsif p_action = 'reject' then
    update public.withdrawals set status = 'rejected', decided_at = now() where id = p_id;
    -- คืนยอดให้ลูกค้า
    if w.type = 'cash' then
      update public.wallets set lak_balance = lak_balance + w.lak + w.fee where user_id = w.user_id;
    else
      update public.wallets
        set gold_gram = gold_gram + w.gram, lak_balance = lak_balance + w.fee
        where user_id = w.user_id;
    end if;
    update public.transactions set status = 'rejected'
      where user_id = w.user_id and created_at >= w.created_at - interval '2 seconds'
        and type in ('withdraw_cash','withdraw_gold') and status = 'pending';
  else
    raise exception 'invalid action';
  end if;
end $$;

-- สร้างลูกค้าใหม่จากเบอร์โทร (login ครั้งแรก) — สร้าง profile + wallet พร้อมกัน
create or replace function public.create_customer(p_phone text)
returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
  v_id := gen_random_uuid();
  insert into public.profiles (id, name, phone)
    values (v_id, 'ລູກຄ້າ ' || right(p_phone, 4), p_phone);
  insert into public.wallets (user_id) values (v_id);
  return v_id;
end $$;
-- หมายเหตุ: ถ้าใช้ Supabase Auth เต็มรูปแบบ ให้เปลี่ยน profiles.id เป็น FK ไป auth.users
-- และสร้าง profile ผ่าน trigger on auth.users insert แทน

-- สถิติ Admin รวมใน query เดียว (aggregate ฝั่ง DB — รองรับ 100,000+ users)
create or replace function public.admin_stats(p_real_price numeric)
returns json language sql security definer as $$
  select json_build_object(
    'profit_today', coalesce((select sum(profit_lak) from public.transactions
       where created_at >= date_trunc('day', now())), 0),
    'profit_month', coalesce((select sum(profit_lak) from public.transactions
       where created_at >= date_trunc('month', now())), 0),
    'profit_all', coalesce((select sum(profit_lak) from public.transactions), 0),
    'customers', (select count(*) from public.profiles),
    'kyc_verified', (select count(*) from public.profiles where kyc_status = 'verified'),
    'customer_gold_gram', coalesce((select sum(gold_gram) from public.wallets), 0),
    'aum_lak', coalesce((select sum(lak_balance) from public.wallets), 0)
      + round(coalesce((select sum(gold_gram) from public.wallets), 0) * p_real_price),
    'pending_withdrawals', (select count(*) from public.withdrawals where status = 'pending'),
    'tx_count', (select count(*) from public.transactions)
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.settings enable row level security;
alter table public.price_history enable row level security;
alter table public.otp_codes enable row level security;
-- otp_codes: ไม่มี policy → เข้าถึงได้เฉพาะ service role (ฝั่ง server)

create policy "own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "own wallet" on public.wallets
  for select using (auth.uid() = user_id);
create policy "own transactions" on public.transactions
  for select using (auth.uid() = user_id);
create policy "own withdrawals" on public.withdrawals
  for select using (auth.uid() = user_id);
create policy "own kyc" on public.kyc_documents
  for select using (auth.uid() = user_id);
create policy "settings readable" on public.settings
  for select using (true);
create policy "prices readable" on public.price_history
  for select using (true);

-- admin เข้าถึงทุกอย่างผ่าน service role key (ฝั่ง server เท่านั้น)
-- การเขียนทั้งหมดทำผ่าน API routes ด้วย service role + ฟังก์ชัน atomic ด้านบน

-- ============================================================
-- Admin คนแรก (เปลี่ยนเบอร์โทรเป็นของคุณก่อนรัน!)
-- ============================================================
do $$
declare v_id uuid := gen_random_uuid();
begin
  insert into public.profiles (id, name, phone, role, kyc_status)
    values (v_id, 'Administrator', '+8562055551234', 'admin', 'verified');
  insert into public.wallets (user_id) values (v_id);
end $$;
