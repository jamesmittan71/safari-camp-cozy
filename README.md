# Ten of Cups Camp Manager

## Architecture

This is a TanStack Start and React application written in TypeScript. Vite produces a Nitro `node-server` build at `.output/server/index.mjs`. Supabase provides authentication and PostgreSQL; it is not accessed with a service key by the browser.

Production requires Node.js `20.20.2` and npm. Use `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run validate:migrations`, and `npm run build` before release. Start the production artifact with `npm start`; cPanel Passenger can use `node app.js`, which loads the same Nitro entry point. `GET /health` returns HTTP 200 JSON.

## Environment

Copy `.env.example` locally and provide `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`. `NODE_ENV` must be `production` on the host. `SUPABASE_SERVICE_ROLE_KEY` is optional, server-only, and unused by this application unless a separately reviewed server function requires it. Never commit `.env` files.

## Database and deployment

Migrations are append-only under `supabase/migrations`; take a verified database backup before any production migration. Validate the complete chain with local Docker only: `npx supabase@2.39.2 start`, `npx supabase@2.39.2 db reset --local`, and `npx supabase@2.39.2 db lint --local`. Do not link the Supabase CLI to production for these checks.

For Afrihost/cPanel, install production dependencies with npm, upload the built `.output` directory with `app.js` and `package.json`, configure the variables above in cPanel, set the application entry point to `app.js`, and restart Passenger. Confirm the host provides Node.js `20.20.2` before deployment.

Public sign-up and public OAuth registration are intentionally absent from the UI. Disable public sign-up in the Supabase dashboard before production; that dashboard change is a required manual deployment prerequisite.

## Room Setup Images

Create a Supabase Storage bucket named `room-setup` manually before using room reference photos. Authenticated users need read access; administrators and managers need write access. The `rooms.setup_image_url` column stores the full public or signed URL for the image.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm ci
npm run dev
```
