# UPI-Pay — Premium Digital Content Marketplace & Protected Streaming Platform

UPI-Pay is an end-to-end, production-grade digital content and video masterclass marketplace featuring an authoritative credit wallet, dynamic access expiration engine, multi-channel payment top-ups (EasyPaisa, JazzCash, USDT), and server-gated protected content access.

---

## 🌟 Key Features

1. **Authoritative Access Duration Engine**:
   - Supported durations: `24 Hours`, `7 Days`, `30 Days`, `90 Days`, and `Lifetime`.
   - Authoritative backend verification on `GET /api/content/:id/access` (checks authentication, purchase state, and UTC expiration timestamp).
   - Real-time live countdown UI (updates automatically every second).
   - Instant renewal workflow upon expiration.

2. **Free Demo vs. Protected Premium Separation**:
   - **Free Demo**: Publicly accessible to all visitors (Uploaded video player with speeds & PiP, responsive photo gallery with zoom, embed players, or external links).
   - **Protected Content**: Protected behind server-side authorization. Stream URLs are never leaked to unentitled users.
   - Dynamic user video watermark canvas overlay (`user@email • ID: # • UPI-Pay`).

3. **Curriculum & Video Player**:
   - Multi-lesson courses with chapter navigation.
   - Video progress tracking (`POST /api/progress`) tracking position, duration, and completion percentage.
   - Resume playback on return.
   - Playback speeds (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x), volume control, and fullscreen.

4. **Wallet & Payment Architecture**:
   - Double-entry transaction accounting ledger.
   - Manual top-ups for **EasyPaisa**, **JazzCash**, and **USDT** with TID and sender information submission.
   - **Demo Mode Payment Simulator**: Instant verification simulation for local testing without real funds.
   - Webhook idempotency protection (prevents duplicate credit on replayed webhooks).
   - Credit gifting between users with real-time balance checks.
   - Promotional discount coupons (`WELCOME10`, `SAVE5`).

5. **Admin Control Panel**:
   - Metric analytics (Revenue in credits, active access, pending reviews).
   - Top-up management (Approve/Reject with audit trail).
   - Product catalog editor with lessons builder, live preview, and mandatory Content Rights Confirmation checkbox.
   - User wallet balance adjustments with required audit reason.
   - Audit trail ledger.

---

## 🛠 Tech Stack

- **Backend**: Node.js & Express
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript / TypeScript
- **Database**: SQLite (via `sql.js` with disk persistence, architected for clean migration to PostgreSQL)
- **Authentication**: JWT & secure cookies with bcryptjs password hashing
- **Deployment**: Railway & Node.js standard process runner

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```
The server will boot at `http://localhost:3000`. The SQLite database will automatically migrate its schema and populate seed data on the first run.

### 4. Run Automated Integration Tests
```bash
npm test
```

---

## 👥 Seed Demo Personas

- **Customer User**:
  - Email: `alex@upipay.io`
  - Password: `User@123`
  - Balance: `65 Credits`
  - Pre-loaded: 1 active masterclass (22 days remaining) with 65% progress saved, 1 expired product for testing renewal!

- **Administrator**:
  - Email: `admin@upipay.io`
  - Password: `Admin@123`
  - Balance: `500 Credits`
  - Full access to Admin Control Panel, top-up approvals, product editor, and balance adjustments.

---

## 🚂 Railway Deployment Instructions

1. Link your GitHub repository in Railway.
2. Ensure Build Command is `npm run build` and Start Command is `node server.ts` (or `npm start`).
3. Set environment variables:
   - `NODE_ENV=production`
   - `SESSION_SECRET=<random-32-char-secret>`
   - `PORT=3000`
4. Deploy!
