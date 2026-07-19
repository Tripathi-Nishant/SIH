# KIET SIH Team Finder

Production-grade team matchmaking portal for **Smart India Hackathon (SIH)** at KIET Group of Institutions.

## Features

- KIET domain-restricted authentication (Google OAuth + email OTP)
- Multi-step onboarding with GitHub skill sync and resume parsing
- Team creation, invites, join requests, and capacity enforcement
- Skill-based matching and discovery (public/private teams)
- Peer reputation ratings (post-season)
- PDF nomination card export
- Admin/faculty analytics dashboard
- Hall of Fame archive with PPT uploads

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- Google OAuth configured in Supabase Auth
- GitHub OAuth app (optional, for skill verification)
- Resend account (optional, for admin nudge emails)

## Environment variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server only) |
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | For GitHub sync | GitHub OAuth app client ID |
| `GITHUB_CLIENT_ID` | For GitHub sync | Same as above (server) |
| `GITHUB_CLIENT_SECRET` | For GitHub sync | GitHub OAuth secret |
| `OAUTH_STATE_SECRET` | Recommended | HMAC secret for GitHub OAuth CSRF |
| `RESEND_API_KEY` | Optional | Enables admin email nudges |
| `RESEND_FROM_EMAIL` | Optional | Verified sender for Resend |

## Supabase setup

1. Run all migrations in `supabase/migrations/` against your project (SQL editor or CLI).
2. Create storage buckets:
   - `resumes` (private)
   - `ppts` (public read)
3. Enable **Google** and **Email OTP** providers in Supabase Auth.
4. Add redirect URL: `http://localhost:3000/auth/callback` (and production URL).
5. Promote a faculty/admin user:

```sql
UPDATE public.profiles SET role = 'admin' WHERE kiet_email = 'faculty@kiet.edu';
```

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

```bash
npm run build
npm run start
```

Deploy to Vercel and set all environment variables in the project settings.

## Security notes

- Route protection runs via Next.js `proxy.ts` (auth + onboarding gate + admin guard).
- Mutations (teams, requests, leave/disband) go through authenticated API routes with server-side validation.
- Database triggers enforce one-team-per-student and team capacity limits.
- GitHub OAuth uses signed state tokens to prevent CSRF.
- Resume parsing and PPT upload endpoints require authentication.

## License

Internal use — KIET Group of Institutions.
