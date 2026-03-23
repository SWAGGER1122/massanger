# Family Messenger Setup Guide

## 1) Install dependencies

Run this single command:

```bash
npm install @supabase/supabase-js @stream-io/video-react-sdk @stream-io/video-client @stream-io/node-sdk lucide-react clsx && npm install -D tailwindcss @tailwindcss/vite
```

If your terminal is PowerShell, use:

```powershell
npm install @supabase/supabase-js @stream-io/video-react-sdk @stream-io/video-client @stream-io/node-sdk lucide-react clsx; npm install -D tailwindcss @tailwindcss/vite
```

## 2) Create Supabase project and keys

1. Open https://supabase.com and create a free account.
2. Click **New project** and complete project creation.
3. Go to **Project Settings → API**.
4. Copy:
   - **Project URL**
   - **anon public key**
5. In this app, copy `.env.example` to `.env` and paste those values:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_STREAM_API_KEY=...
VITE_STREAM_TOKEN_ENDPOINT=...
```

## 3) Create Supabase tables

Open **SQL Editor** in Supabase and run:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text
);

alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
for select to authenticated using (true);

create policy "profiles_upsert_own" on public.profiles
for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_by uuid[] default '{}'
);

alter table public.messages enable row level security;

create policy "messages_select" on public.messages
for select to authenticated using (true);

create policy "messages_insert" on public.messages
for insert to authenticated with check (auth.uid() = sender_id);

create policy "messages_update_read_status" on public.messages
for update to authenticated using (true) with check (true);
```

In Supabase **Database → Replication**, make sure `profiles` and `messages` are enabled for realtime.

## 4) GetStream Video API key

1. Open https://getstream.io and create a free account.
2. Create a Video app.
3. Copy your **API Key**.
4. Put it in `.env` as `VITE_STREAM_API_KEY`.

## 5) Create token endpoint for Stream

Create `api/stream-token.ts` in Vercel serverless functions:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { StreamClient } from '@stream-io/node-sdk'

const apiKey = process.env.STREAM_API_KEY!
const apiSecret = process.env.STREAM_API_SECRET!

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { userId, name } = req.body as { userId: string; name?: string }
  const client = new StreamClient(apiKey, apiSecret)
  const token = client.generateUserToken({ user_id: userId })
  res.status(200).json({ token, name })
}
```

Set on Vercel:

- `STREAM_API_KEY`
- `STREAM_API_SECRET`

Then set `VITE_STREAM_TOKEN_ENDPOINT` in your frontend `.env` to:

```env
VITE_STREAM_TOKEN_ENDPOINT=https://your-vercel-app.vercel.app/api/stream-token
```

## 6) Run locally

```bash
npm run dev
```

## 7) Deploy to Vercel

1. Push this project to GitHub.
2. Go to https://vercel.com/new and import the repo.
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STREAM_API_KEY`
   - `VITE_STREAM_TOKEN_ENDPOINT`
   - `STREAM_API_KEY`
   - `STREAM_API_SECRET`
4. Click **Deploy**.
5. Open your deployed app URL and sign up.
