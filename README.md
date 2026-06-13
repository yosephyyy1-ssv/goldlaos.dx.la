# 🏆 GoldSave Laos

แอปออมทองคำสำหรับประเทศลาว — ซื้อ ขาย ออม และถอนทองคำ พร้อมราคา Real-Time
และระบบป้องกันความเสี่ยงจากค่าเงินกีบ (LAK) อัตโนมัติ

ใช้งานได้ทั้ง **มือถือและคอมพิวเตอร์** จากโค้ดชุดเดียว — Responsive Web App + PWA
(เปิดบนมือถือแล้วกด "Add to Home Screen" จะได้ไอคอนและหน้าจอเต็มเหมือนแอปเนทีฟ)

## เริ่มใช้งาน

```bash
npm install
npm run dev        # เปิด http://localhost:3000
```

ไม่ต้องตั้งค่าอะไรเพิ่ม — ระบบทำงานใน **Demo Mode** ทันที (ข้อมูลจำลองในหน่วยความจำ)
ถ้าต่ออินเทอร์เน็ตได้ ราคาจะดึงจากแหล่งข้อมูลฟรีจริง (stooq + open.er-api.com)

### เชื่อม API ราคาจริง (ไม่บังคับ)

คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ key:

| ตัวแปร | บริการ | ใช้ทำอะไร |
|---|---|---|
| `GOLDAPI_KEY` | [goldapi.io](https://www.goldapi.io) | ราคาทองโลก XAU/USD |
| `METALS_DEV_KEY` | [metals.dev](https://metals.dev) | ราคาทองโลก (สำรอง) |
| `EXCHANGERATE_API_KEY` | [exchangerate-api.com](https://www.exchangerate-api.com) | USD/LAK |

ลำดับ fallback: API key → แหล่งฟรี → ราคาจำลอง (ระบบไม่มีวันล่ม)

## สูตรราคา (ปรับทุกค่าได้จาก Admin Panel)

```
ราคาจริง (LAK/กรัม)  = (XAU/USD ÷ 31.1034768) × USD/LAK

Markup = ความเสี่ยงค่าเงิน 4% + ความเสี่ยงราคาทอง 2%
       + ค่าดำเนินงาน 1% + กำไรบริษัท 3%  = 10% (ค่าเริ่มต้น)

ราคาขายลูกค้า   = ราคาจริง × (1 + Markup)
ราคารับซื้อคืน  = ราคาจริง × (1 − 2%)
```

> ต้องการ spread ×1.06 / ×0.98 ตามแผนธุรกิจ? ตั้งค่า Risk Buffer รวมเป็น 6%
> ได้จากหน้า **Admin → ตั้งค่าราคา/ค่าธรรมเนียม** — มีผลทันทีทั้งระบบ

## ฟีเจอร์

| หมวด | รายละเอียด |
|---|---|
| **Dashboard** | ราคาทองโลก XAU/USD, USD/LAK, ราคาทองลาว Real-Time (อัปเดตทุก 5 วิ), กราฟ 1 วัน/7 วัน/30 วัน/1 ปี, ยอดทองที่ถือครอง |
| **ออมทอง** | ขั้นต่ำ 10,000 กีบ, ซื้อเศษส่วนได้ละเอียด 0.0001 กรัม, คำนวณทองอัตโนมัติ, เปิด 24 ชม. |
| **Wallet** | กระเป๋ากีบ (LAK) + กระเป๋าทอง (กรัม) + ประวัติธุรกรรมครบ + เติมเงินจำลอง |
| **ถอน** | เงินสด หรือ ทองคำจริง (ขั้นต่ำ 1 กรัม), คำนวณค่าจัดส่ง+ค่าดำเนินการอัตโนมัติ, ผ่านการอนุมัติ Admin |
| **Admin** | กำไรวันนี้/เดือนนี้/สะสม, AUM, ทองสำรอง, จำนวนลูกค้า, ปรับ % ความเสี่ยง-ค่าธรรมเนียม-กำไรทั้งหมด, อนุมัติถอน, จัดการลูกค้า |
| **ความปลอดภัย** | KYC, OTP, Face Verification, 2FA, Encryption (หน้าแสดงสถานะ + schema รองรับเต็มรูปแบบ) |
| **ภาษา** | ລາວ (ค่าเริ่มต้น) / ไทย — สลับได้จากมุมขวาบน |

## โครงสร้างโปรเจกต์

```
app/
  page.tsx              Dashboard (ราคา Real-Time + กราฟ)
  trade/                ซื้อ/ขายทอง
  wallet/               กระเป๋าเงิน + ประวัติ
  withdraw/             ถอนเงินสด/ทองจริง
  security/             KYC, OTP, 2FA, Face
  admin/                Admin Panel (4 หน้า)
  api/                  REST API (prices, history, trade, withdraw, admin/*)
lib/                    pricing engine, price feeds, store, i18n
supabase/schema.sql     PostgreSQL schema สำหรับ Production
```

## ระบบ Login / OTP

ทุกหน้าถูกป้องกันด้วย session (HMAC-signed HttpOnly cookie อายุ 30 วัน):

1. กรอกเบอร์โทร → ระบบส่ง OTP 6 หลัก (หมดอายุ 5 นาที)
2. Demo Mode แสดง OTP บนหน้าจอ / Production ส่ง SMS จริงผ่าน `SMS_GATEWAY_URL`
3. ยืนยันแล้วได้ session cookie (เว็บ) + Bearer token (มือถือ)
4. เบอร์ใหม่ = สร้างบัญชีลูกค้าอัตโนมัติ

**บัญชีทดลอง (สิทธิ์ Admin):** `+8562055551234` — prefill ไว้ในหน้า login แล้ว
เบอร์อื่นจะได้บัญชีลูกค้าธรรมดา (มองไม่เห็นเมนู Admin และเรียก Admin API ได้ 403)

## Production: Supabase + PostgreSQL

**ต่อ Supabase เสร็จแล้วในโค้ด** — แค่ตั้งค่า 3 ขั้น:

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com) แล้วรัน `supabase/schema.sql` ใน SQL Editor
   (แก้เบอร์โทร Admin คนแรกท้ายไฟล์ก่อนรัน)
2. ใส่ `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` ใน `.env.local`
3. รีสตาร์ท — ระบบสลับจาก in-memory เป็น PostgreSQL อัตโนมัติ (ดู `lib/repo.ts`)

ทุกการเงินทำผ่าน RPC แบบ atomic (row-level lock กัน race condition / double-spend),
เก็บเงินเป็น `bigint`/`numeric(18,4)` กัน floating-point error, Row Level Security ทุกตาราง,
aggregate สถิติฝั่ง DB — รองรับ 100,000+ ผู้ใช้

## Mobile App (React Native / Expo)

อยู่ในโฟลเดอร์ [`mobile/`](mobile/README.md) — Login OTP, Dashboard, Trade, Wallet
ใช้ REST API เดียวกับเว็บ 100% (Bearer token):

```bash
cd mobile && npm install && npx expo install --fix && npm start
```

## เป้าหมายธุรกิจที่ระบบรองรับ

- ✅ Risk Buffer ค่าเงิน 4% + ราคาทอง 2% → บริษัทไม่ขาดทุนจากความผันผวน
- ✅ Spread ซื้อ-ขายปรับได้ → กำไรขั้นต่ำ 4–8% ต่อธุรกรรม (บันทึก profit ต่อรายการ)
- ✅ รายงานกำไรวันนี้/เดือนนี้ + มูลค่าทรัพย์สินรวมใน Admin
- ✅ สถาปัตยกรรม Supabase/PostgreSQL + index + atomic functions → 100,000+ ผู้ใช้
