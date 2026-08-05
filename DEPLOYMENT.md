# CallOut Deployment

## Next.js application

Deploy the Next.js application to Vercel or another Node.js host.

Required environment variables:

- `DATABASE_URL`: Neon pooled connection string for application queries.
- `DIRECT_URL`: Neon direct connection string for Prisma migrations.
- `NEXTAUTH_URL`: production application URL.
- `NEXTAUTH_SECRET`: a unique random value generated with `openssl rand -base64 32`.
- `NEXT_PUBLIC_SOCKET_URL`: public URL of the Socket.io service.

Run migrations during deployment with:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

## Socket.io service

Run the Socket.io process on a Node.js host that supports long-lived connections, such as Railway, Render, or Fly.io.

```bash
npm ci
npx prisma generate
npm run socket
```

Set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, and `SOCKET_PORT` in the service environment. Configure the service's CORS origin through `NEXT_PUBLIC_APP_URL` and expose the service URL as `NEXT_PUBLIC_SOCKET_URL` to the Next.js application.

## Load testing

The load scenario requires an isolated live event, match, and authenticated session cookie. Never point it at production without an approved test window.

```bash
SOCKET_URL=https://socket.example.com \
EVENT_ID=... \
MATCH_ID=... \
AUTH_COOKIE='next-auth.session-token=...' \
```

## Media storage

Artist avatars, event banners, and video submissions still need an S3-compatible storage integration such as Cloudflare R2 or Amazon S3. Do not store uploaded media in the application filesystem.
