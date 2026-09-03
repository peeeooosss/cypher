# CYPHR Deployment

CYPHR is deployed in two parts:

1. **Vercel** — hosts the Next.js application, all `/api/*` routes, and the public site.
2. **Railway** — hosts the separate Socket.io server for live battle scoring (long-lived WebSocket connections that Vercel serverless cannot hold).

## Vercel (Next.js app + API)

Connect the GitHub repository (`peeeooosss/cypher`) in Vercel. Deployment is automatic from the `main` branch.

- Framework preset: **Next.js**
- Build command: `prisma generate && next build` (see `vercel.json`)
- Also managed via CLI: `vercel --prod`

Required environment variables (set in Vercel under **Settings → Environment Variables**):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled connection string for app queries |
| `DIRECT_URL` | Neon direct connection string for Prisma migrations |
| `NEXTAUTH_URL` | Full site URL, including `https://` |
| `NEXTAUTH_SECRET` | Unique random value (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | Full site URL, including `https://` |
| `NEXT_PUBLIC_SOCKET_URL` | Public URL of the Socket.io service (Railway), including `https://` |
| `UPLOADTHING_TOKEN` | UploadThing server token for image uploads |
| `RESEND_API_KEY` | Resend API key for signup verification emails |
| `RESEND_FROM` | Verified Resend sender, e.g. `admin@tryauraai.in` |
| `NEXT_PUBLIC_PAYMENT_UPI_ID` | UPI ID for manual payments |
| `NEXT_PUBLIC_PAYMENT_NAME` | Payee name for manual payments |
| `NEXT_PUBLIC_BILL_WHATSAPP_NUMBER` | WhatsApp number for bill/confirmation messages |

Do not commit `.env` or database credentials to GitHub.

For a manual migration outside a deploy:

```bash
npx prisma generate
npx prisma migrate deploy
```

## Railway (Socket.io server)

The live scoring WebSocket server lives in `server/socket.ts` and runs as a persistent Node process. It is deployed via the `Dockerfile` in the repo (`npm ci` + `npx prisma generate` + `tsx server/socket.ts`).

Set these variables in the Railway service:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon connection string (the socket server queries the DB) |
| `NEXTAUTH_SECRET` | Same secret as Vercel (used to verify judge/organizer JWT cookies) |
| `NEXT_PUBLIC_APP_URL` | CORS origin — the full Vercel site URL |
| `REDIS_URL` | Optional — enables Socket.io pub/sub horizontal scaling across multiple instances |

The socket server listens on `PORT` (set automatically by Railway). Expose the resulting URL as `NEXT_PUBLIC_SOCKET_URL` on Vercel.

## Database (Neon)

- Neon Postgres powers everything (schema in `prisma/schema.prisma`).
- Schema changes: `prisma migrate deploy` + `npx prisma generate` before build.
- Local dev uses `@prisma/adapter-pg`; production uses the Neon serverless adapter.

## Payments

Payments are handled **manually** (offline UPI). No Razorpay or PayU gateway is used. The relevant components are `manual-payment.tsx`, `upi-buttons.tsx`, and `upi-form.tsx`, configured via the `NEXT_PUBLIC_PAYMENT_*` and `NEXT_PUBLIC_BILL_WHATSAPP_NUMBER` variables above.

## Media storage

Artist avatars, studio logos, and event posters use UploadThing. Existing image URLs remain valid and are not migrated automatically.
