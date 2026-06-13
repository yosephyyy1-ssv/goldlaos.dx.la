export type Settings = {
  // Risk Buffer components (%) — ปรับได้จาก Admin Panel
  fxRiskPct: number;        // ความเสี่ยงค่าเงิน
  goldRiskPct: number;      // ความเสี่ยงราคาทอง
  opCostPct: number;        // ค่าดำเนินงาน
  profitPct: number;        // กำไรบริษัท
  buybackDiscountPct: number; // ส่วนลดราคารับซื้อคืน
  // Limits
  minSaveLak: number;       // ขั้นต่ำการออม (LAK)
  minWithdrawGram: number;  // ขั้นต่ำถอนทองจริง (กรัม)
  // Withdrawal fees
  shippingFlatLak: number;  // ค่าจัดส่งทองคำจริง (LAK)
  withdrawProcessingPct: number; // ค่าดำเนินการถอน (%)
  cashWithdrawFeeLak: number;    // ค่าธรรมเนียมถอนเงินสด (LAK)
};

export type Prices = {
  xauUsd: number;       // ราคาทองโลก USD/oz
  usdLak: number;       // อัตราแลกเปลี่ยน
  realLakPerGram: number;   // ราคาจริง LAK/กรัม
  sellLakPerGram: number;   // ราคาขายให้ลูกค้า
  buyLakPerGram: number;    // ราคารับซื้อคืน
  markupPct: number;
  buybackDiscountPct: number;
  source: string;
  updatedAt: string;
};

export type TxType = "buy" | "sell" | "deposit" | "withdraw_cash" | "withdraw_gold";

export type Tx = {
  id: string;
  userId: string;
  type: TxType;
  lak: number;          // มูลค่าเงินกีบของรายการ
  gram: number;         // ปริมาณทอง (0 สำหรับ deposit/withdraw_cash)
  pricePerGram: number; // ราคาที่ใช้ทำรายการ
  fee: number;
  profitLak: number;    // กำไรบริษัทจากรายการนี้
  status: "completed" | "pending" | "rejected";
  note?: string;
  createdAt: string;
};

export type WithdrawRequest = {
  id: string;
  userId: string;
  userName: string;
  type: "cash" | "gold";
  lak: number;
  gram: number;
  fee: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt?: string;
};

export type User = {
  id: string;
  name: string;
  phone: string;
  role: "customer" | "admin";
  kycStatus: "unverified" | "pending" | "verified";
  twoFa: boolean;
  faceVerified: boolean;
  lakBalance: number;
  goldGram: number;
  createdAt: string;
};
