# GoldSave Laos — Mobile App (React Native / Expo)

แอปเนทีฟสำหรับ iOS / Android ใช้ **REST API เดียวกับเว็บ 100%**
(login OTP → ได้ token → ส่งเป็น `Authorization: Bearer` ทุก request)

## เริ่มใช้งาน

```bash
cd mobile
npm install
npx expo install --fix     # ปรับเวอร์ชัน dependencies ให้ตรงกับ Expo SDK
npm start                  # เปิด Expo Dev Tools → สแกน QR ด้วยแอป Expo Go
```

ต้องรัน web server หลักไว้ด้วย (`npm run dev` ที่โฟลเดอร์ราก)

## ตั้งค่า API URL

แก้ใน [src/api.ts](src/api.ts):

| สภาพแวดล้อม | URL |
|---|---|
| Android Emulator | `http://10.0.2.2:3000` (ค่าเริ่มต้น) |
| iOS Simulator | `http://localhost:3000` (ค่าเริ่มต้น) |
| มือถือจริง (Expo Go) | `http://<IP เครื่องคุณ>:3000` เช่น `http://192.168.1.10:3000` |
| Production | URL ที่ deploy เช่น `https://app.goldsave.la` |

## หน้าจอ

- **Login** — เบอร์โทร + OTP (Demo Mode แสดงรหัสบนจอ)
- **Dashboard** — ราคาทองโลก/อัตราแลกเปลี่ยน/ราคาขาย-รับซื้อ อัปเดตทุก 5 วิ + ทองที่ถือครอง
- **Trade** — ซื้อ/ขายทอง คำนวณอัตโนมัติ
- **Wallet** — ยอดเงิน + ยอดทอง + ประวัติธุรกรรม (ดึงลงเพื่อรีเฟรช)

## Build ลง Store

```bash
npx eas build --platform android   # ได้ .aab สำหรับ Play Store
npx eas build --platform ios       # ได้ .ipa สำหรับ App Store
```

(ต้องมีบัญชี [expo.dev](https://expo.dev) — ฟรี)
