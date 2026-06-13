// Supabase/PostgreSQL implementation — ใช้เมื่อตั้งค่า env ครบ
// การเงินทั้งหมดทำผ่าน RPC (atomic + row lock) ใน supabase/schema.sql
import { ApiError, Repo, Stats } from "./repo";
import { supabaseAdmin } from "./supabase";
import { Prices, Settings, Tx, User, WithdrawRequest } from "./types";

const SETTINGS_KEYS: Record<keyof Settings, string> = {
  fxRiskPct: "fx_risk_pct",
  goldRiskPct: "gold_risk_pct",
  opCostPct: "op_cost_pct",
  profitPct: "profit_pct",
  buybackDiscountPct: "buyback_discount_pct",
  minSaveLak: "min_save_lak",
  minWithdrawGram: "min_withdraw_gram",
  shippingFlatLak: "shipping_flat_lak",
  withdrawProcessingPct: "withdraw_processing_pct",
  cashWithdrawFeeLak: "cash_withdraw_fee_lak",
};

type ProfileRow = {
  id: string; name: string; phone: string; role: "customer" | "admin";
  kyc_status: User["kycStatus"]; face_verified: boolean; two_fa_enabled: boolean;
  created_at: string;
  wallets: { lak_balance: number; gold_gram: number } | null;
};

function toUser(r: ProfileRow): User {
  return {
    id: r.id, name: r.name, phone: r.phone, role: r.role,
    kycStatus: r.kyc_status, twoFa: r.two_fa_enabled, faceVerified: r.face_verified,
    lakBalance: Number(r.wallets?.lak_balance ?? 0),
    goldGram: Number(r.wallets?.gold_gram ?? 0),
    createdAt: r.created_at,
  };
}

type TxRow = {
  id: string; user_id: string; type: Tx["type"]; lak: number; gram: number;
  price_per_gram: number; fee: number; profit_lak: number; status: Tx["status"];
  created_at: string;
};

function toTx(r: TxRow): Tx {
  return {
    id: r.id, userId: r.user_id, type: r.type, lak: Number(r.lak),
    gram: Number(r.gram), pricePerGram: Number(r.price_per_gram),
    fee: Number(r.fee), profitLak: Number(r.profit_lak),
    status: r.status, createdAt: r.created_at,
  };
}

type WdRow = {
  id: string; user_id: string; type: "cash" | "gold"; lak: number; gram: number;
  fee: number; status: WithdrawRequest["status"]; created_at: string;
  decided_at: string | null; profiles: { name: string } | null;
};

function toWd(r: WdRow): WithdrawRequest {
  return {
    id: r.id, userId: r.user_id, userName: r.profiles?.name ?? "",
    type: r.type, lak: Number(r.lak), gram: Number(r.gram), fee: Number(r.fee),
    status: r.status, createdAt: r.created_at, decidedAt: r.decided_at ?? undefined,
  };
}

function rpcError(e: { message: string }): never {
  throw new ApiError(e.message.replace(/^.*?: /, ""));
}

const PROFILE_SELECT = "*, wallets(lak_balance, gold_gram)";

export const supabaseRepo: Repo = {
  async getSettings() {
    const { data, error } = await supabaseAdmin().from("settings").select("key, value");
    if (error) rpcError(error);
    const map = Object.fromEntries(data!.map((r) => [r.key, Number(r.value)]));
    const s = {} as Settings;
    for (const [camel, snake] of Object.entries(SETTINGS_KEYS)) {
      (s as Record<string, number>)[camel] = map[snake] ?? 0;
    }
    return s;
  },

  async updateSettings(patch) {
    const sb = supabaseAdmin();
    for (const [camel, v] of Object.entries(patch)) {
      const snake = SETTINGS_KEYS[camel as keyof Settings];
      if (!snake) continue;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) throw new ApiError(`invalid ${camel}`);
      const { error } = await sb.from("settings")
        .update({ value: n, updated_at: new Date().toISOString() })
        .eq("key", snake);
      if (error) rpcError(error);
    }
    return this.getSettings();
  },

  async getUser(id) {
    const { data } = await supabaseAdmin().from("profiles")
      .select(PROFILE_SELECT).eq("id", id).maybeSingle();
    return data ? toUser(data as ProfileRow) : null;
  },

  async findOrCreateUserByPhone(phone) {
    const sb = supabaseAdmin();
    const { data } = await sb.from("profiles")
      .select(PROFILE_SELECT).eq("phone", phone).maybeSingle();
    if (data) return toUser(data as ProfileRow);
    const { data: created, error } = await sb.rpc("create_customer", { p_phone: phone });
    if (error) rpcError(error);
    return (await this.getUser(created as string))!;
  },

  async getUserTxs(userId) {
    const { data, error } = await supabaseAdmin().from("transactions")
      .select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(100);
    if (error) rpcError(error);
    return (data as TxRow[]).map(toTx);
  },

  async getUserWithdrawals(userId) {
    const { data, error } = await supabaseAdmin().from("withdrawals")
      .select("*, profiles(name)").eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) rpcError(error);
    return (data as WdRow[]).map(toWd);
  },

  async listUsers() {
    const { data, error } = await supabaseAdmin().from("profiles")
      .select(PROFILE_SELECT).order("created_at", { ascending: false }).limit(500);
    if (error) rpcError(error);
    return (data as ProfileRow[]).map(toUser);
  },

  async listWithdrawals() {
    const { data, error } = await supabaseAdmin().from("withdrawals")
      .select("*, profiles(name)")
      .order("created_at", { ascending: false }).limit(200);
    if (error) rpcError(error);
    return (data as WdRow[]).map(toWd);
  },

  async executeBuy(userId, lak, p: Prices) {
    const { data, error } = await supabaseAdmin().rpc("execute_buy", {
      p_user_id: userId, p_lak: lak,
      p_sell_price: p.sellLakPerGram, p_real_price: p.realLakPerGram,
      p_xau: p.xauUsd, p_lak_rate: p.usdLak,
    });
    if (error) rpcError(error);
    return { gram: Number(data) };
  },

  async executeSell(userId, gram, p: Prices) {
    const { data, error } = await supabaseAdmin().rpc("execute_sell", {
      p_user_id: userId, p_gram: gram,
      p_buy_price: p.buyLakPerGram, p_real_price: p.realLakPerGram,
      p_xau: p.xauUsd, p_lak_rate: p.usdLak,
    });
    if (error) rpcError(error);
    return { lak: Number(data) };
  },

  async topup(userId, lak) {
    const { data, error } = await supabaseAdmin().rpc("topup", {
      p_user_id: userId, p_lak: lak,
    });
    if (error) rpcError(error);
    return { balance: Number(data) };
  },

  async requestWithdrawCash(userId, lak, fee) {
    const { data, error } = await supabaseAdmin().rpc("request_withdraw_cash", {
      p_user_id: userId, p_lak: lak, p_fee: fee,
    });
    if (error) rpcError(error);
    return { id: data as string };
  },

  async requestWithdrawGold(userId, gram, fee, p: Prices) {
    const { data, error } = await supabaseAdmin().rpc("request_withdraw_gold", {
      p_user_id: userId, p_gram: gram, p_fee: fee, p_real_price: p.realLakPerGram,
    });
    if (error) rpcError(error);
    return { id: data as string };
  },

  async decideWithdrawal(id, action) {
    const { error } = await supabaseAdmin().rpc("decide_withdrawal", {
      p_id: id, p_action: action,
    });
    if (error) rpcError(error);
    const { data } = await supabaseAdmin().from("withdrawals")
      .select("*, profiles(name)").eq("id", id).single();
    return toWd(data as WdRow);
  },

  async stats(realLakPerGram): Promise<Stats> {
    const { data, error } = await supabaseAdmin().rpc("admin_stats", {
      p_real_price: realLakPerGram,
    });
    if (error) rpcError(error);
    const r = data as Record<string, number>;
    return {
      profitToday: Number(r.profit_today), profitMonth: Number(r.profit_month),
      profitAll: Number(r.profit_all), customers: Number(r.customers),
      kycVerified: Number(r.kyc_verified),
      customerGoldGram: Number(r.customer_gold_gram),
      goldReserveGram: Number(r.customer_gold_gram) * 1.1,
      aumLak: Number(r.aum_lak),
      pendingWithdrawals: Number(r.pending_withdrawals),
      txCount: Number(r.tx_count),
    };
  },

  // Supabase mode: OTP จริงส่งผ่าน Supabase Auth (SMS) — ตารางนี้ใช้เป็น fallback
  async saveOtp(phone, code) {
    const { error } = await supabaseAdmin().from("otp_codes").upsert({
      phone, code, expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    if (error) rpcError(error);
  },

  async checkOtp(phone, code) {
    const sb = supabaseAdmin();
    const { data } = await sb.from("otp_codes")
      .select("code, expires_at").eq("phone", phone).maybeSingle();
    if (!data || data.code !== code || new Date(data.expires_at) < new Date()) return false;
    await sb.from("otp_codes").delete().eq("phone", phone);
    return true;
  },
};
