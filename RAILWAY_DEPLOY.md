# Railway Deployment Guide

This guide will walk you through deploying the ClickUp Attendance Dashboard to [Railway](https://railway.app/).

## Prerequisites

- A [Railway](https://railway.app/) account.
- A GitHub repository with your project code.
- A running PostgreSQL database (either Supabase or Railway's PostgreSQL service).

## Deployment Steps

### 1. Project Setup
1. Log in to your Railway dashboard.
2. Click "New Project" -> "Deploy from GitHub repo".
3. Select your repository: `clickup-dashboard`.
4. Click "Deploy Now".

### 2. Configure Service
1. Click on the newly created service card for your application.
2. Go to the **Settings** tab.
3. Scroll down to the **General** section.
4. Set the **Root Directory** to `/` (or leave blank if your project is at the root).
5. Ensure the **Build Command** is set to `npm run build`.
6. Ensure the **Start Command** is set to `npm start`.

### 3. Environment Variables
Go to the **Variables** tab and add the following environment variables. You can find these values in your `.env` file or from your service providers.

| Variable Loop | Description | Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Connection string for your PostgreSQL database (Session Pooler for Supabase) | `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres` |
| `DIRECT_URL` | Direct connection string for Prisma migrations | `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres` |
| `CLICKUP_API_TOKEN` | Your ClickUp Personal Access Token | `pk_...` |
| `CLICKUP_TEAM_ID` | Your ClickUp Team ID | `123456` |
| `NEXT_PUBLIC_APP_NAME` | The name of your application | `ClickUp Timesheet Analytics` |
| `NEXT_PUBLIC_DEFAULT_HOURS_PER_DAY` | Default work hours per day | `8` |
| `NEXT_PUBLIC_DEFAULT_HOURS_PER_WEEK` | Default work hours per week | `40` |

> **Note:** If you are using Supabase, make sure to disable "Use connection pooling" in the Supabase dashboard if you are **not** using the transaction pooler, or use the transaction pooler URL for `DATABASE_URL` and the session/direct URL for `DIRECT_URL`. Railway handles connection pooling automatically if you provision a Postgres database within Railway.

### 4. Database Setup (If using Supabase)
If you are using Supabase, you likely already have your database schema set up. If not, or if you need to apply migrations:

1. In the Railway service settings, under "Build", you can add a custom build command to run migrations, or run them locally pointing to the production DB.
2. **Recommended:** Run migrations locally before deploying:
   ```bash
   # In your local terminal
   export DATABASE_URL="<your_production_connection_string>"
   export DIRECT_URL="<your_production_direct_connection_string>"
   npx prisma migrate deploy
   ```

### 5. Verify Deployment
1. Once the build completes and the service starts, Railway will provide a public URL (e.g., `https://clickup-dashboard-production.up.railway.app`).
2. Visit the URL to verify the application is running.
3. Check the "Deployments" tab logs if you encounter any errors.

## Troubleshooting

- **Prisma Client Issues:** If you see errors related to Prisma Client, ensure that `postinstall` script in `package.json` runs `prisma generate`. Railway usually picks this up automatically. Note that with Prisma 7, database connection configuration is handled in `prisma.config.ts`, not `schema.prisma`. We have configured `prisma.config.ts` to use `DIRECT_URL` for migrations.
- **Connection Errors:** Double-check your `DATABASE_URL` and `DIRECT_URL`. Ensure your database allows connections from external sources (0.0.0.0/0).
