This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## B2C authentication

The auth API uses the existing `clients` table plus the migrations in
`drizzle/0001_add_auth_tables.sql` and `drizzle/0002_add_wishlist_items.sql`.
Apply both SQL files before starting the app in a new environment.

The B2C cabinet is available at `/ru/account` (and the legacy-compatible
`/ru/lichnyiy-kabinet`) with profile data, password change, orders, favorites,
and the stored bonus/discount values from `clients`. WorkApp/1C synchronization
and the welcome promo are intentionally left for the later integration stage.

For production registration and password recovery, configure these variables
in `.env`:

```env
NEXT_PUBLIC_SITE_URL=https://vizaje-nica.com
SMS_API_URL=https://messages.inter-mob.com/sms.asp
SMS_USERNAME=...
SMS_PASSWORD=...
SMS_FROM=Vizaje-Nica
RESEND_API_KEY=...
AUTH_EMAIL_FROM=Vizaje-Nica <noreply@vizaje-nica.com>
```

Without SMS credentials, development mode returns a temporary verification code
only for local testing. Production never exposes that code.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
