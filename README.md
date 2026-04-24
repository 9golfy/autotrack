# AutoTrack

AutoTrack is a one-page investor demo that connects a LINE Official Account to a Next.js app. It can:

- send text messages from the web UI to LINE
- run a LIFF mini-app frontend inside the LINE client
- receive LINE webhook messages
- store message activity in Supabase PostgreSQL via Prisma
- display synced messages in a clean dashboard

## Stack

- Next.js App Router with TypeScript
- Tailwind CSS
- Prisma ORM
- Supabase PostgreSQL
- Deploy target: Vercel

## Environment variables

Create a `.env` file with:

```env
DATABASE_URL="YOUR_SUPABASE_DATABASE_URL"
DIRECT_URL="YOUR_SUPABASE_DIRECT_URL"
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=""
LINE_MESSAGING_CHANNEL_SECRET=""
LINE_LOGIN_CHANNEL_ID=""
LINE_LOGIN_CHANNEL_SECRET=""
LINE_TARGET_ID=""
NEXT_PUBLIC_LIFF_ID=""
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
```

## Local setup

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## LINE setup

1. Enable the Messaging API in your LINE Official Account.
2. Enable webhook delivery.
3. Set the webhook URL to:

```text
https://your-app.vercel.app/api/line/webhook
```

4. Enable bot participation in group chats if you want to test group traffic.
5. Create a LIFF app and set its endpoint URL to:

```text
https://your-app.vercel.app/liff
```

6. For `AutoCheckUser` service-message testing, use the LINE Login / LIFF channel credentials:

```text
LINE_LOGIN_CHANNEL_ID
LINE_LOGIN_CHANNEL_SECRET
```

7. For webhook and push messaging, use the Messaging API channel credentials:

```text
LINE_MESSAGING_CHANNEL_SECRET
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN
```

## Deployment

1. Push the `autotrack` folder to GitHub.
2. Import the repository into Vercel.
3. Add the required environment variables in Vercel.
4. Deploy.

## Demo flow

1. Open the web app.
2. Send a text from the left panel.
3. Confirm it arrives in LINE.
4. Reply in LINE.
5. Watch the right panel refresh from `/api/messages`.
6. Open `/liff` inside the LINE app, let LIFF auto-login, and use the mini-app actions.
7. Confirm the rows in Supabase.
