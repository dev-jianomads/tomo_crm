# Database migrations

SQL in this folder is the **production-path** schema for Supabase/Postgres. Apply with your migration runner (e.g. `supabase db push`, `sqitch`, or manual `psql`).

**Order:** filenames are timestamp-prefixed; run in lexical order.

The Next.js app in this repo may still use mock data; migrations remain the source of truth for when `DATABASE_URL` (or Supabase) is wired.
