# PayU Hosted Checkout

CYPHR uses PayU Hosted Checkout for fees collected by CYPHR:

- Event flat fee
- Event commission
- Gig posting fee
- Marketplace access fee
- Gig connection fee

Event registration fees paid directly to an organizer and artist-organizer work payments remain manual.

## Environment variables

Configure these as server-side Vercel environment variables. Do not commit values to the repository.

```env
PAYU_ENV=test
PAYU_MERCHANT_KEY=your-test-merchant-key
PAYU_MERCHANT_SALT=your-test-merchant-salt
PAYU_BASE_URL=https://test.payu.in
NEXT_PUBLIC_APP_URL=https://www.joincyphr.in
```

For production, use the production merchant credentials and:

```env
PAYU_ENV=production
PAYU_BASE_URL=https://secure.payu.in
```

## PayU dashboard configuration

Configure the payment webhook URL as:

```text
https://www.joincyphr.in/api/payments/payu/webhook
```

PayU Hosted Checkout redirects success, failure, and cancellation responses to:

```text
https://www.joincyphr.in/api/payments/payu/callback
```

The callback and webhook verify the PayU SHA-512 response hash, transaction ID, and amount before applying payment side effects. Processing is idempotent, so repeated callbacks do not activate a feature twice.

## Database migration

The PayU payment fields are in:

```text
prisma/migrations/20260821000000_add_payu_payment_fields/migration.sql
```

Run the migration against the intended database after reviewing it:

```bash
npx prisma migrate deploy
npx prisma generate
```

Do not use `prisma db push --accept-data-loss` against production.
