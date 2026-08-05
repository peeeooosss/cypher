# CallOut Deployment

## Netlify Next.js application

The repository includes `netlify.toml` and the official Netlify Next.js plugin. Connect the GitHub repository in Netlify with these settings:

- Base directory: leave blank if the repository root is this project.
- Build command: `npm run netlify:build`.
- Publish directory: `.next`.
- Node version: `22`.

The build command generates Prisma Client, applies committed production migrations, and builds Next.js.

Required environment variables:

- `DATABASE_URL`: Neon pooled connection string for application queries.
- `DIRECT_URL`: Neon direct connection string for Prisma migrations.
- `NEXTAUTH_URL`: the full Netlify site URL, including `https://`.
- `NEXTAUTH_SECRET`: a unique random value generated with `openssl rand -base64 32`.
- `NEXT_PUBLIC_APP_URL`: the full Netlify site URL, including `https://`.
- `NEXT_PUBLIC_SOCKET_URL`: public URL of the separately hosted Socket.io service, including `https://`.

Do not add `.env` or database credentials to GitHub. Set these values in Netlify under **Site configuration > Environment variables** for the production deploy context.

For a manual migration outside a Netlify deploy:

```bash
npx prisma generate
npx prisma migrate deploy
```

## Socket.io service

Run the Socket.io process on a Node.js host that supports long-lived connections, such as Railway, Render, or Fly.io.

```bash
npm ci
npx prisma generate
npm run socket
```

Netlify Functions are not a suitable host for this persistent Socket.io process. Set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, and `SOCKET_PORT` in the external service environment. Configure the service's CORS origin through `NEXT_PUBLIC_APP_URL` and expose the service URL as `NEXT_PUBLIC_SOCKET_URL` to the Netlify site.

The Netlify site serves the Next.js app and API routes; the external Node service serves live scoring WebSockets.

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
