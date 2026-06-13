// Data Access Layer — สลับ backend อัตโนมัติ:
// ตั้งค่า NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → ใช้ Supabase/PostgreSQL จริง
// ไม่ตั้งค่า → Demo Mode (in-memory)
import { db, newId } from "./store";
import { supabaseConfigured } from "./supabase";
import { Prices, Settings, Tx, User, WithdrawRequest } from "./types";

export type Stats = {
  profitToday: number; profitMonth: number; profitAll: number;
  customers: number; kycVerified: number;
  customerGoldGram: number; goldReserveGram: number;
  aumLak: number; pendingWithdrawals: number; txCount: number;
};

export interface Repo {
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  getUser(id: string): Promise<User | null>;
  findOrCreateUserByPhone(phone: string): Promise<User>;
  getUserTxs(userId: string): Promise<Tx[]>;
  getUserWithdrawals(userId: string): Promise<WithdrawRequest[]>;
  listUsers(): Promise<User[]>;
  listWithdrawals(): Promise<WithdrawRequest[]>;
  executeBuy(userId: string, lak: number, p: Prices): Promise<{ gram: number }>;
  executeSell(userId: string, gram: number, p: Prices): Promise<{ lak: number }>;
  topup(userId: string, lak: number): Promise<{ balance: number }>;
  requestWithdrawCash(userId: string, lak: number, fee: number): Promise<{ id: string }>;
  requestWithdrawGold(userId: string, gram: number, fee: number, p: Prices): Promise<{ id: string }>;
  decideWithdrawal(id: string, action: "approve" | "reject"): Promise<WithdrawRequest>;
  stats(realLakPerGram: number): Promise<Stats>;
  // Demo OTP (Supabase mode ใช้ Supabase Auth แทน)
  saveOtp(phone: string, code: string): Promise<void>;
  checkOtp(phone: string, code: string): Promise<boolean>;
}

class ApiError extends Error {
  constructor(msg: string, public status = 400) { super(msg); }
}
export { ApiError };

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

// ============ Demo Mode (in-memory) ============
const memoryRepo: Repo = {
  async getSettings() { return db().settings; },

  async updateSettings(patch) {
    const s = db().settings;
    for (const [k, v] of Object.entries(patch)) {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) throw new ApiError(`invalid ${k}`);
      (s as Record<string, number>)[k] = n;
    }
    return s;
  },

  async getUser(id) { return db().users.find((u) => u.id === id) ?? null; },

  async findOrCreateUserByPhone(phone) {
    let u = db().users.find((x) => x.phone === phone);
    if (!u) {
      u = {
        id: newId("u"), name: `ລູກຄ້າ ${phone.slice(-4)}`, phone, role: "customer",
        kycStatus: "unverified", twoFa: false, faceVerified: false,
        lakBalance: 0, goldGram: 0, createdAt: new Date().toISOString(),
      };
      db().users.push(u);
    }
    return u;
  },

  async getUserTxs(userId) {
    return db().txs.filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getUserWithdrawals(userId) {
    return db().withdrawals.filter((w) => w.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listUsers() { return db().users; },

  async listWithdrawals() {
    return [...db().withdrawals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async executeBuy(userId, lak, p) {
    const user = db().users.find((u) => u.id === userId);
    if (!user) throw new ApiError("user not found", 404);
    const s = db().settings;
    if (lak < s.minSaveLak) throw new ApiError(`minimum ${s.minSaveLak} LAK`);
    if (lak > user.lakBalance) throw new ApiError("insufficient LAK balance");
    const gram = Math.floor((lak / p.sellLakPerGram) * 10_000) / 10_000;
    user.lakBalance -= lak;
    user.goldGram = round4(user.goldGram + gram);
    db().txs.push({
      id: newId("tx"), userId, type: "buy", lak, gram,
      pricePerGram: p.sellLakPerGram, fee: 0,
      profitLak: gram * (p.sellLakPerGram - p.realLakPerGram),
      status: "completed", createdAt: new Date().toISOString(),
    });
    return { gram };
  },

  async executeSell(userId, gram, p) {
    const user = db().users.find((u) => u.id === userId);
    if (!user) throw new ApiError("user not found", 404);
    if (gram > user.goldGram) throw new ApiError("insufficient gold balance");
    const lak = Math.floor(gram * p.buyLakPerGram);
    user.goldGram = round4(user.goldGram - gram);
    user.lakBalance += lak;
    db().txs.push({
      id: newId("tx"), userId, type: "sell", lak, gram,
      pricePerGram: p.buyLakPerGram, fee: 0,
      profitLak: gram * (p.realLakPerGram - p.buyLakPerGram),
      status: "completed", createdAt: new Date().toISOString(),
    });
    return { lak };
  },

  async topup(userId, lak) {
    const user = db().users.find((u) => u.id === userId);
    if (!user) throw new ApiError("user not found", 404);
    user.lakBalance += lak;
    db().txs.push({
      id: newId("tx"), userId, type: "deposit", lak, gram: 0,
      pricePerGram: 0, fee: 0, profitLak: 0,
      status: "completed", createdAt: new Date().toISOString(),
    });
    return { balance: user.lakBalance };
  },

  async requestWithdrawCash(userId, lak, fee) {
    const user = db().users.find((u) => u.id === userId);
    if (!user) throw new ApiError("user not found", 404);
    if (lak + fee > user.lakBalance) throw new ApiError("insufficient balance (incl. fee)");
    user.lakBalance -= lak + fee;
    const createdAt = new Date().toISOString();
    const wd: WithdrawRequest = {
      id: newId("wd"), userId, userName: user.name, type: "cash",
      lak, gram: 0, fee, status: "pending", createdAt,
    };
    db().withdrawals.push(wd);
    db().txs.push({
      id: newId("tx"), userId, type: "withdraw_cash", lak, gram: 0,
      pricePerGram: 0, fee, profitLak: fee, status: "pending", createdAt,
    });
    return { id: wd.id };
  },

  async requestWithdrawGold(userId, gram, fee, p) {
    const user = db().users.find((u) => u.id === userId);
    if (!user) throw new ApiError("user not found", 404);
    const s = db().settings;
    if (gram < s.minWithdrawGram) throw new ApiError(`minimum ${s.minWithdrawGram} g`);
    if (gram > user.goldGram) throw new ApiError("insufficient gold balance");
    if (fee > user.lakBalance) throw new ApiError("insufficient LAK for fees");
    user.goldGram = round4(user.goldGram - gram);
    user.lakBalance -= fee;
    const createdAt = new Date().toISOString();
    const wd: WithdrawRequest = {
      id: newId("wd"), userId, userName: user.name, type: "gold",
      lak: 0, gram, fee, status: "pending", createdAt,
    };
    db().withdrawals.push(wd);
    db().txs.push({
      id: newId("tx"), userId, type: "withdraw_gold", lak: 0, gram,
      pricePerGram: p.realLakPerGram, fee, profitLak: fee - s.shippingFlatLak,
      status: "pending", createdAt,
    });
    return { id: wd.id };
  },

  async decideWithdrawal(id, action) {
    const wd = db().withdrawals.find((w) => w.id === id);
    if (!wd) throw new ApiError("not found", 404);
    if (wd.status !== "pending") throw new ApiError("already decided");
    const user = db().users.find((u) => u.id === wd.userId);
    if (action === "approve") {
      wd.status = "approved";
    } else {
      wd.status = "rejected";
      // คืนยอดให้ลูกค้าเมื่อปฏิเสธ
      if (user) {
        if (wd.type === "cash") user.lakBalance += wd.lak + wd.fee;
        else {
          user.goldGram = round4(user.goldGram + wd.gram);
          user.lakBalance += wd.fee;
        }
      }
    }
    wd.decidedAt = new Date().toISOString();
    const tx = db().txs.find(
      (t) => t.userId === wd.userId && t.createdAt === wd.createdAt &&
        (t.type === "withdraw_cash" || t.type === "withdraw_gold")
    );
    if (tx) tx.status = wd.status === "approved" ? "completed" : "rejected";
    return wd;
  },

  async stats(realLakPerGram) {
    const { txs, users, withdrawals } = db();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const sum = (since: number) =>
      txs.filter((t) => new Date(t.createdAt).getTime() >= since)
        .reduce((a, t) => a + t.profitLak, 0);
    const customerGold = users.reduce((a, u) => a + u.goldGram, 0);
    const customerLak = users.reduce((a, u) => a + u.lakBalance, 0);
    return {
      profitToday: Math.round(sum(startOfDay)),
      profitMonth: Math.round(sum(startOfMonth)),
      profitAll: Math.round(sum(0)),
      customers: users.length,
      kycVerified: users.filter((u) => u.kycStatus === "verified").length,
      customerGoldGram: customerGold,
      goldReserveGram: customerGold * 1.1,
      aumLak: Math.round(customerLak + customerGold * realLakPerGram),
      pendingWithdrawals: withdrawals.filter((w) => w.status === "pending").length,
      txCount: txs.length,
    };
  },

  async saveOtp(phone, code) {
    db().otps[phone] = { code, exp: Date.now() + 5 * 60_000 };
  },

  async checkOtp(phone, code) {
    const o = db().otps[phone];
    if (!o || o.exp < Date.now() || o.code !== code) return false;
    delete db().otps[phone];
    return true;
  },
};

export function getRepo(): Repo {
  if (supabaseConfigured()) {
    // import วนถูกแก้ด้วย lazy import ภายในฟังก์ชัน (โมดูลถูก cache หลังครั้งแรก)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./repo-supabase") as typeof import("./repo-supabase");
    return mod.supabaseRepo;
  }
  return memoryRepo;
}
