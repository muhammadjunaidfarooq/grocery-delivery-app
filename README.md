# OmniMart — Grocery Delivery App

A full-stack grocery delivery web app with three roles:

- **Customers** browse and order groceries, then track the rider live.
- **Admins** manage products and orders, and send orders out for delivery.
- **Riders** accept delivery jobs, share their live location, chat with the customer and mark orders as delivered.

Realtime updates (new orders, job offers, status changes, chat, rider location) run through a separate Socket.IO server ([`socketServer`](../socketServer)).

## Features

**Customer**
- Register / login with email and password (Google login is optional)
- Browse products, search by name, filter by category, see out-of-stock items
- Cart with quantity controls, subtotal, delivery fee (free above Rs.3500) and total. The cart is kept after a page refresh.
- Checkout with a map pin (drag the pin, search an area or use the current location), address validation, Cash on Delivery or Stripe (test mode)
- Order history with live order status and payment status (Payment Pending / Paid), plus a **Track Order** page with the rider's live location and chat

**Admin**
- Dashboard with revenue, orders and top products, filtered by date (Asia/Karachi time)
- Add products (image upload to Cloudinary), edit, delete, and mark in or out of stock
- Manage Orders: new orders appear live. Setting **out of delivery** offers the job to free riders within 10 km.
- **COD payment confirmation:** for an unpaid Cash on Delivery order, **Mark Payment Received** lets the admin pick Cash, Easypaisa, JazzCash, Bank Transfer or Other, and enter a required reason. The card shows the method, who confirmed it, when, and the reason.

**Rider**
- Receives job offers live; can accept or reject. Accepting is atomic, so two riders can't take the same job.
- Active delivery screen with map, chat with the customer and **Mark as delivered**
- For COD orders, the screen shows the **Amount to Collect** (the server-side total) and a **Cash Received** button with a confirmation dialog

**Security**
- Role-based access in the middleware (`src/proxy.ts`) and in every API route (`requireAuth`)
- Order prices and totals are calculated **on the server** from the database, so the browser cannot change them
- Customers can only read their own orders and chats
- The socket server and the API trust each other only with a shared secret header
- Payment can only be marked as paid by the server: by the **assigned** rider (cash) or by an admin (with a reason). Each update is atomic, so an order cannot be paid twice. The admin's internal note is never sent to customers or riders.

### Payment model
`isPaid` is the payment status (`false` = pending, `true` = paid). A COD order starts unpaid. When it is confirmed, these fields are saved: `paidAt`, `paymentConfirmationMethod` (`cash`, `easypaisa`, `jazzcash`, `bank_transfer`, `other`, or `stripe` from the webhook), `paymentReceivedBy`, `paymentReceivedByRole` (`deliveryBoy` / `admin`) and `paymentConfirmationNote`. Payment status is separate from the order status (`pending` → `out of delivery` → `delivered`).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, Redux Toolkit, Motion, Leaflet / OpenStreetMap |
| Backend | Next.js API routes (Node.js), NextAuth v5 (JWT sessions) |
| Database | MongoDB + Mongoose (2dsphere geo index for finding nearby riders) |
| Realtime | Socket.IO server (Express) — separate project `socketServer` |
| Services | Cloudinary (images), Stripe Checkout + webhook (payments) |

## Architecture

```
Browser (Next.js pages, Redux cart)
   │  HTTP (fetch/axios)                   ▲ Socket.IO events
   ▼                                       │ (new-order, new-assignment,
Next.js API routes ──── Mongoose ────► MongoDB      order-status-update,
   │        ▲                                        send-message, rider location)
   │ POST /notify          POST /api/socket/*, /api/chat/save
   │ (x-socket-secret)     (x-socket-secret)
   ▼        │
Socket.IO server (socketServer) ◄──── browsers connect directly ────┘
```

- **Next.js → socket server:** when something changes (an order is placed, a job is offered, a status changes), the API route calls `POST /notify` and the socket server pushes the event to one socket (a rider) or to everyone.
- **Browser → socket server → Next.js:** rider location updates and chat messages go through the socket. The socket server saves them through the Next.js API (with the shared secret), then broadcasts them.

## Run locally

Requirements: Node.js 20+, a MongoDB database (MongoDB Atlas free tier works).

```bash
# 1) Socket server
cd socketServer
npm install
cp .env.example .env        # set SOCKET_SERVER_SECRET
npm run dev                 # http://localhost:4000

# 2) Next.js app (new terminal)
cd grocery-delivery-app
npm install
cp .env.example .env.local  # fill MONGODB_URL, AUTH_SECRET, and the SAME SOCKET_SERVER_SECRET
npm run seed                # adds demo products + demo accounts (only adds, never deletes)
npm run dev                 # http://localhost:3000
```

On Windows, use `copy` instead of `cp`.

Production build: `npm run build && npm start`.

### Demo accounts (created by `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@omnimart.demo | Demo@1234 |
| Customer | customer@omnimart.demo | Demo@1234 |
| Rider | rider@omnimart.demo | Demo@1234 |

The demo rider is placed in Lahore, near the demo customer, so the 10 km rider search finds them. A new user who registers picks a role (customer or rider) and a mobile number on first login.

## Environment variables

See [`.env.example`](.env.example) and [`../socketServer/.env.example`](../socketServer/.env.example).

| Variable | Where | Required | Purpose |
|---|---|---|---|
| `MONGODB_URL` | app | yes | MongoDB connection string |
| `AUTH_SECRET` | app | yes | Signs the login session (JWT) |
| `AUTH_URL`, `AUTH_TRUST_HOST` | app | yes in production | Public URL of the app |
| `NEXT_PUBLIC_SOCKET_SERVER` | app | yes | Socket server URL used by browsers |
| `SOCKET_SERVER_SECRET` | app + socket | yes | Shared secret between the app and the socket server (must match) |
| `NEXT_BASE_URL` | app | for Stripe | App URL for Stripe redirects |
| `NEXT_PUBLIC_CLOUDINARY_*`, `CLOUDINARY_API_SECRET` | app | for adding products | Image uploads |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | app | optional | Online payment. Cash on Delivery works without them. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | app | optional | Google login |
| `NEXT_BASE_URL`, `CLIENT_ORIGINS`, `PORT` | socket | yes | App URL, allowed CORS origins, port |

## 5-minute demo flow

Use three browser windows (or one normal and two incognito):

1. **Rider** — log in as the rider and allow location. The rider dashboard waits for jobs.
2. **Customer** — log in, search for "milk", filter by category, add items, change quantities in the cart.
3. **Admin** — log in and open **Manage Orders**.
4. **Customer** — check out (drag the pin or search an area, fill in the address) and place a **Cash on Delivery** order. The order appears in the admin list **without a refresh**.
5. **Admin** — change the status to **out of delivery**. The rider gets the job **live**.
6. **Rider** — click **Accept**. The customer's **My Orders** page shows the rider and a **Track Your Order** button.
7. **Customer** — open Track Order and send a chat message. The rider replies live. The rider's location shows on the map.
8. **Rider** — click **Cash Received** (shows the amount to collect), confirm it, then click **Mark as delivered**. The admin card shows "Paid · Cash · Delivery Boy" live. The customer's page changes to **Delivered** live.
9. **Admin** — on another COD order, click **Mark Payment Received**, choose Easypaisa and enter a reason. The customer now sees "Paid directly".
10. **Admin** — show the dashboard numbers and the product management page.

## Deployment (Vercel + Render + MongoDB Atlas)

| Part | Host | Settings |
|---|---|---|
| Next.js app (`grocery-delivery-app`) | Vercel | Framework: Next.js · build `npm run build` (default) |
| Socket server (`socketServer`) | Render Web Service | Runtime Node · build `npm install` · start `npm start` · health check `/health` |
| Database | MongoDB Atlas | Network Access must allow Vercel and Render (`0.0.0.0/0`) |

Order of steps:

1. **Render first.** Deploy `socketServer` and set `NEXT_BASE_URL` (temporary value until the Vercel URL is known) and `SOCKET_SERVER_SECRET`. Copy the Render URL (`https://<name>.onrender.com`).
2. **Vercel.** Import `grocery-delivery-app` and add every variable from `.env.example`. `NEXT_PUBLIC_SOCKET_SERVER` = the Render URL, and `SOCKET_SERVER_SECRET` must be the same as on Render. Deploy, then copy the Vercel URL.
3. **Connect them.** On Render, set `NEXT_BASE_URL` (and `CLIENT_ORIGINS` if you use a custom domain) to the Vercel URL. On Vercel, set `AUTH_URL` and `NEXT_BASE_URL` to the Vercel URL and **redeploy**, because `NEXT_PUBLIC_*` values are built into the browser code.
4. **Optional.** Add the Google OAuth redirect URI `https://<vercel-url>/api/auth/callback/google`. Add a Stripe webhook to `https://<vercel-url>/api/user/stripe/webhook` (event `checkout.session.completed`) and put its signing secret in `STRIPE_WEBHOOK_SECRET`.

Production notes:
- The socket server exits at startup if `NEXT_BASE_URL` or `SOCKET_SERVER_SECRET` is missing in production. It only accepts browser connections from `CLIENT_ORIGINS` (default: `NEXT_BASE_URL`).
- With an `https://` socket URL, the browser connects over secure WebSockets (`wss://`).
- Free Render instances sleep when idle; the first realtime connection can take ~30–60 seconds.

## Project scripts

- `npm run dev` / `build` / `start` / `lint`
- `npm run seed` — demo products and accounts (adds only)
- `node scripts/seed-dev-orders.mjs --yes` — ~30 fake orders for the dashboard charts (`--delete --yes` removes them)

Product images in `public/products` are from [Twemoji](https://github.com/jdecked/twemoji) (CC-BY 4.0).
