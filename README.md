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

## Email Confirmation Setup

By default, Supabase requires email confirmation for new user signups. To disable this for development:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Settings** → **Email Auth**
3. Disable **"Enable email confirmations"** for development
4. Or keep it enabled and users will receive confirmation emails

If email confirmation is enabled:

- Users must click the confirmation link in their email before they can log in
- The confirmation email is sent automatically after signup
- Users will see a helpful error message if they try to login before confirming

# tinaverify-admin

## Cloud Run Build Configuration

The deploy workflow reads build-time values from GCP Secret Manager. Sync the local, git-ignored env files before deploying:

```bash
GCP_PROJECT_ID=zulu-dine-492112 bash scripts/sync-env-to-secret-manager.sh
```

The script maps `.env.development` to the `development` Secret Manager values (used by staging deployments) and `.env.production` to `production`. GitHub Actions uses the latest versions of `NEXT_PUBLIC_BACKEND_BASE_URL_<environment>`, `NEXT_PUBLIC_ADMIN_GRANT_CREDITS_<environment>`, and `NEXT_PUBLIC_ADMIN_BUSINESS_SMS_<environment>`. Grant the GitHub Actions service account `roles/secretmanager.secretAccessor`; the account running the sync script needs permission to create secrets and add versions.
