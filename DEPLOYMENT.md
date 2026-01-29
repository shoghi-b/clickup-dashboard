# Deploying to Vercel

This guide walks you through deploying the ClickUp Attendance Dashboard to Vercel.

## Prerequisites

Before deploying, ensure you have:

- ✅ A [Vercel account](https://vercel.com/signup) (free tier works)
- ✅ Your repository pushed to GitHub, GitLab, or Bitbucket
- ✅ A Supabase PostgreSQL database configured (see [SETUP.md](SETUP.md))
- ✅ All required API credentials ready (ClickUp API token, team ID, etc.)

## Step 1: Prepare Your Repository

Ensure your latest changes are committed and pushed:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Create a New Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your repository
4. Select the repository containing your ClickUp Dashboard

## Step 3: Configure Build Settings

Vercel should auto-detect Next.js. Verify these settings:

- **Framework Preset**: Next.js
- **Build Command**: `next build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

> [!NOTE]
> The `vercel.json` file in this project already configures optimal settings including region selection and serverless function memory limits.

## Step 4: Configure Environment Variables

Add the following environment variables in your Vercel project settings:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase PostgreSQL connection string (session pooler) | `postgresql://postgres.xxx:pass@aws-1-region.pooler.supabase.com:5432/postgres` |
| `DIRECT_URL` | Direct database URL for migrations | Same as DATABASE_URL |
| `CLICKUP_API_TOKEN` | Your ClickUp API token | `pk_164666353_...` |
| `CLICKUP_TEAM_ID` | Your ClickUp team/workspace ID | `9016722408` |
| `ATTENDANCE_API_USERNAME` | Attendance API credentials | `tcules:tcules:tcules@123#:true` |
| `ATTENDANCE_API_PASSWORD` | Attendance API password | (leave empty if included in username) |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_NAME` | Application name displayed in UI | `ClickUp Timesheet Analytics` |
| `NEXT_PUBLIC_DEFAULT_HOURS_PER_DAY` | Expected hours per day | `8` |
| `NEXT_PUBLIC_DEFAULT_HOURS_PER_WEEK` | Expected hours per week | `40` |

### How to Add Environment Variables

1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Add each variable:
   - Enter the **Name** (e.g., `DATABASE_URL`)
   - Enter the **Value** (copy from your `.env` file)
   - Select environments: **Production**, **Preview**, and **Development**
3. Click **Save**

> [!WARNING]
> Never commit your `.env` file! Keep your credentials secure in Vercel's environment variable settings.

## Step 5: Deploy

1. Click **Deploy**
2. Vercel will:
   - Clone your repository
   - Install dependencies
   - Run `prisma generate` (via postinstall script)
   - Build your Next.js application
   - Deploy to production

This process typically takes 2-3 minutes.

## Step 6: Verify Deployment

Once deployed, Vercel will provide you with a URL (e.g., `your-app.vercel.app`).

### Test Checklist

1. ✅ **Homepage loads** - Navigate to your deployment URL
2. ✅ **Database connection** - Check if team members appear
3. ✅ **Data sync** - Click "Sync Data" and verify it works
4. ✅ **Week view** - Navigate through different weeks
5. ✅ **Month view** - Switch to month view
6. ✅ **Team overview** - Check analytics display correctly
7. ✅ **Attendance upload** - Test Excel file upload
8. ✅ **Discrepancy detection** - Verify discrepancies are calculated

## Step 7: Configure Custom Domain (Optional)

1. In Vercel project settings, go to **Domains**
2. Add your custom domain
3. Follow Vercel's instructions to update DNS records
4. Wait for DNS propagation (can take up to 48 hours)

## Troubleshooting

### Build Fails with Prisma Error

**Problem**: Build fails with "Prisma client not generated"

**Solution**: 
- Ensure `postinstall` script is in `package.json`
- Check that `DATABASE_URL` and `DIRECT_URL` are set in environment variables

### Database Connection Timeout

**Problem**: API routes timeout when connecting to database

**Solution**:
- Verify your Supabase connection string is correct
- Ensure you're using the **session pooler** (port 5432), not transaction pooler
- Check Supabase project is not paused

### Environment Variables Not Loading

**Problem**: App can't find environment variables

**Solution**:
- Ensure variables are added for all environments (Production, Preview, Development)
- Redeploy after adding environment variables
- Check variable names match exactly (case-sensitive)

### ClickUp Sync Fails

**Problem**: "Sync Data" button returns an error

**Solution**:
- Verify `CLICKUP_API_TOKEN` is valid and has correct permissions
- Check `CLICKUP_TEAM_ID` is correct
- Ensure API token hasn't expired

### Serverless Function Timeout

**Problem**: API routes timeout after 10 seconds

**Solution**:
- The `vercel.json` config sets `maxDuration: 60` for API routes
- If you need longer, upgrade to Vercel Pro plan for extended limits
- Consider optimizing database queries for large datasets

## Redeployment

Vercel automatically redeploys when you push to your main branch.

For manual redeployment:
1. Go to Vercel Dashboard → Your Project
2. Click **Deployments** tab
3. Click **⋯** next to latest deployment → **Redeploy**

## Production Database Migrations

When you need to update the database schema in production:

1. **Update your schema** in `prisma/schema.prisma`
2. **Create a migration** locally:
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```
3. **Commit and push** the migration files
4. **Vercel will automatically** run migrations on next deployment

> [!CAUTION]
> Always test migrations on a staging database before deploying to production!

## Monitoring and Logs

### View Logs

1. Go to your Vercel project
2. Click **Deployments** → Select a deployment
3. Click **Functions** → Select a function to view logs

### Real-time Logs

```bash
vercel logs your-deployment-url --follow
```

## Performance Optimization

Your deployment is already optimized with:

- ✅ **Standalone output** for minimal bundle size
- ✅ **Singapore region (sin1)** for optimal Asia-Pacific performance
- ✅ **1024MB memory** for database-heavy API routes
- ✅ **Connection pooling** via Supabase
- ✅ **Prisma client caching** for fast queries

## Support

If you encounter issues:

1. Check [Vercel Documentation](https://vercel.com/docs)
2. Review [Next.js Deployment Docs](https://nextjs.org/docs/app/building-your-application/deploying)
3. Check [Prisma Edge Deployment](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
4. Open an issue on the project repository
