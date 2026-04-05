# CloudSINT v2 — OSINT Intelligence Platform
**Made by S**

A full-stack OSINT platform with auth, payments, rate limiting, breach data, and AI analysis.

## Stack
- **Next.js 14** (App Router) — frontend + API routes
- **Prisma + PostgreSQL** — database (use [Neon.tech](https://neon.tech) free tier)
- **NextAuth.js** — Google OAuth + email/password auth
- **Stripe** — subscription payments ($9/mo Pro, $29/mo Unlimited)
- **Anthropic Claude** — AI Analyst module

## Pages
| Route | Description |
|-------|-------------|
| `/` | Landing page with features, pricing, hero |
| `/auth` | Sign in / create account (Google + email) |
| `/dashboard` | Main OSINT tool — all 8 modules |
| `/pricing` | Full pricing page with Stripe checkout |

## Rate Limits
| Tier | Lookups |
|------|---------|
| Guest (no account) | 5 total |
| Free account | 20 / day |
| Pro ($9/mo) | 200 / day |
| Unlimited ($29/mo) | Unlimited |

## Deploy to Vercel — Step by Step

### 1. Database (Neon.tech — free)
1. Go to [neon.tech](https://neon.tech) → Create project
2. Copy the connection string → set as `DATABASE_URL`

### 2. Google OAuth
1. [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://your-app.vercel.app/api/auth/callback/google`
4. Copy Client ID and Secret

### 3. Stripe
1. [dashboard.stripe.com](https://dashboard.stripe.com) → Products → Create two products:
   - **Pro**: $9/month recurring → copy Price ID → `STRIPE_PRICE_PRO`
   - **Unlimited**: $29/month recurring → copy Price ID → `STRIPE_PRICE_UNLIMITED`
2. Copy Secret Key → `STRIPE_SECRET_KEY`
3. After deploy: Webhooks → Add endpoint → `https://your-app.vercel.app/api/webhook` → select `checkout.session.completed` and `customer.subscription.deleted` → copy signing secret → `STRIPE_WEBHOOK_SECRET`

### 4. Deploy
```bash
# Push to GitHub
git init && git add . && git commit -m "CloudSINT v2"
git remote add origin https://github.com/YOU/cloudsint.git
git push -u origin main
```
1. [vercel.com](https://vercel.com) → New Project → Import repo
2. Add all environment variables from `.env.example`
3. Click **Deploy**

### 5. Run DB migrations
```bash
npm install -g vercel
vercel env pull .env.local
npx prisma generate
npx prisma db push
```

### 6. Local development
```bash
npm install
cp .env.example .env.local
# Fill in .env.local
npx prisma generate
npx prisma db push
npm run dev
```

## Legal
CloudSINT is for educational and ethical security research only. Only investigate targets you are authorized to examine or public information about yourself.
