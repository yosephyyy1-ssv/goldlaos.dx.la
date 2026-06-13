// In-memory data store สำหรับ Demo Mode
// Production ใช้ Supabase/PostgreSQL ตาม schema ใน supabase/schema.sql
import { Settings, Tx, User, WithdrawRequest } from "./types";

type DB = {
  settings: Settings;
  users: User[];
  txs: Tx[];
  withdrawals: WithdrawRequest[];
  otps: Record<string, { code: string; exp: number }>;
};

const g = globalThis as unknown as { __gsDb?: DB };

const DEMO_USER_ID = "u-demo";

function seed(): DB {
  const now = Date.now();
  const day = 86_400_000;
  const users: User[] = [
    {
      id: DEMO_USER_ID, name: "ສຸກສະຫວັນ ວົງສະຫວັນ", phone: "+8562055551234", role: "admin",
      kycStatus: "verified", twoFa: true, faceVerified: true,
      lakBalance: 2_500_000, goldGram: 1.2845, createdAt: new Date(now - 200 * day).toISOString(),
    },
    {
      id: "u-2", name: "ຄຳຫລ້າ ສີສຸວັນ", phone: "+8562098765432", role: "customer",
      kycStatus: "verified", twoFa: false, faceVerified: true,
      lakBalance: 850_000, goldGram: 0.4421, createdAt: new Date(now - 120 * day).toISOString(),
    },
    {
      id: "u-3", name: "ນາງ ມະນີວອນ ພົມມະຈັນ", phone: "+8562022228888", role: "customer",
      kycStatus: "pending", twoFa: false, faceVerified: false,
      lakBalance: 120_000, goldGram: 2.0312, createdAt: new Date(now - 45 * day).toISOString(),
    },
    {
      id: "u-4", name: "ບຸນມີ ໄຊຍະວົງ", phone: "+8562077773333", role: "customer",
      kycStatus: "verified", twoFa: true, faceVerified: false,
      lakBalance: 5_400_000, goldGram: 5.5810, createdAt: new Date(now - 300 * day).toISOString(),
    },
    {
      id: "u-5", name: "ວິໄລພອນ ແກ້ວມະນີ", phone: "+8562044449999", role: "customer",
      kycStatus: "unverified", twoFa: false, faceVerified: false,
      lakBalance: 50_000, goldGram: 0.0214, createdAt: new Date(now - 10 * day).toISOString(),
    },
  ];

  // ธุรกรรมย้อนหลังของผู้ใช้ demo + กำไรบริษัทสะสม
  const basePrice = 2_320_000; // LAK/กรัม โดยประมาณ
  const txs: Tx[] = [];
  let id = 1;
  const mk = (t: Partial<Tx> & Pick<Tx, "type" | "lak" | "gram" | "userId">, daysAgo: number): Tx => ({
    id: `tx-${id++}`,
    pricePerGram: basePrice,
    fee: 0,
    profitLak: 0,
    status: "completed",
    createdAt: new Date(now - daysAgo * day).toISOString(),
    ...t,
  });
  txs.push(
    mk({ userId: DEMO_USER_ID, type: "deposit", lak: 3_000_000, gram: 0 }, 60),
    mk({ userId: DEMO_USER_ID, type: "buy", lak: 1_000_000, gram: 0.4302, profitLak: 60_000 }, 58),
    mk({ userId: DEMO_USER_ID, type: "buy", lak: 500_000, gram: 0.2129, profitLak: 30_000 }, 40),
    mk({ userId: DEMO_USER_ID, type: "deposit", lak: 2_000_000, gram: 0 }, 30),
    mk({ userId: DEMO_USER_ID, type: "buy", lak: 800_000, gram: 0.3398, profitLak: 48_000 }, 22),
    mk({ userId: DEMO_USER_ID, type: "sell", lak: 230_000, gram: 0.1012, profitLak: 4_600 }, 12),
    mk({ userId: DEMO_USER_ID, type: "buy", lak: 950_000, gram: 0.4028, profitLak: 57_000 }, 3),
    mk({ userId: "u-4", type: "buy", lak: 6_000_000, gram: 2.5410, profitLak: 360_000 }, 5),
    mk({ userId: "u-3", type: "buy", lak: 1_200_000, gram: 0.5103, profitLak: 72_000 }, 1),
    mk({ userId: "u-2", type: "buy", lak: 400_000, gram: 0.1702, profitLak: 24_000 }, 0.4),
    mk({ userId: DEMO_USER_ID, type: "buy", lak: 250_000, gram: 0.1059, profitLak: 15_000 }, 0.2),
  );

  return {
    settings: {
      fxRiskPct: 4,
      goldRiskPct: 2,
      opCostPct: 1,
      profitPct: 3,
      buybackDiscountPct: 2,
      minSaveLak: 10_000,
      minWithdrawGram: 1,
      shippingFlatLak: 80_000,
      withdrawProcessingPct: 1,
      cashWithdrawFeeLak: 5_000,
    },
    users,
    txs,
    withdrawals: [
      {
        id: "wd-1", userId: "u-4", userName: "ບຸນມີ ໄຊຍະວົງ", type: "gold",
        lak: 0, gram: 2, fee: 126_400, status: "pending",
        createdAt: new Date(now - 1.5 * day).toISOString(),
      },
      {
        id: "wd-2", userId: "u-2", userName: "ຄຳຫລ້າ ສີສຸວັນ", type: "cash",
        lak: 500_000, gram: 0, fee: 5_000, status: "approved",
        createdAt: new Date(now - 6 * day).toISOString(),
        decidedAt: new Date(now - 5 * day).toISOString(),
      },
    ],
    otps: {},
  };
}

export function db(): DB {
  if (!g.__gsDb) g.__gsDb = seed();
  return g.__gsDb;
}

export const DEMO_PHONE = "+8562055551234";

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
