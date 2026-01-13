# Setup Guide

This guide will walk you through setting up the ClickUp Timesheet Analytics Dashboard on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- A **ClickUp account** with API access

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd clickup-dashboard
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including Next.js, React, Prisma, and UI components.

### 3. Get Your ClickUp Credentials

#### Get API Token
1. Log in to ClickUp
2. Go to [Settings > Apps](https://app.clickup.com/settings/apps)
3. Click **"Generate"** under API Token
4. Copy the generated token

#### Get Team ID
1. Go to your ClickUp workspace
2. Look at the URL: `https://app.clickup.com/{TEAM_ID}/...`
3. The number after `app.clickup.com/` is your Team ID
4. Alternatively, use the API: `https://api.clickup.com/api/v2/team` with your token

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file and add your credentials:

```env
CLICKUP_API_TOKEN="pk_your_actual_token_here"
CLICKUP_TEAM_ID="12345678"
```

⚠️ **Important**: Never commit the `.env` file to version control!

### 5. Set Up the Database

Run the database migrations to create the SQLite database:

```bash
npx prisma migrate dev
```

Generate the Prisma client:

```bash
npx prisma generate
```

This creates a `prisma/dev.db` file with all necessary tables.

### 6. Verify Your Setup

Run the verification script to ensure everything is configured correctly:

```bash
npm run verify
```

This will check:
- ✅ Environment variables are set
- ✅ Database is created
- ✅ Prisma client is working
- ✅ ClickUp API connection is successful

### 7. Start the Development Server

```bash
npm run dev
```

The application will start at [http://localhost:3000](http://localhost:3000)

If port 3000 is in use, it will automatically use port 3001.

### 8. Sync Your Data

1. Open the dashboard in your browser
2. Click the **"Sync Data"** button in the top right
3. Wait for the sync to complete (this may take a few minutes)
4. Your timesheet data will be fetched and displayed

## Troubleshooting

### "CLICKUP_API_TOKEN is not set"
- Make sure you created the `.env` file
- Check that the variable name is exactly `CLICKUP_API_TOKEN`
- Ensure there are no extra spaces or quotes

### "Database file not found"
- Run `npx prisma migrate dev` to create the database
- Check that `prisma/dev.db` exists

### "Prisma client error"
- Run `npx prisma generate` to regenerate the client
- Try deleting `node_modules` and running `npm install` again

### "ClickUp API error: 401"
- Your API token is invalid or expired
- Generate a new token from ClickUp settings
- Update your `.env` file

### "ClickUp API error: 403"
- You don't have permission to access the team
- Verify your Team ID is correct
- Check your ClickUp account permissions

### Port Already in Use
- The app will auto-select port 3001 if 3000 is taken
- Or manually specify: `PORT=3002 npm run dev`

## Next Steps

Once setup is complete:

1. **Explore the Dashboard**
   - Switch between Week View, Month View, and Team Overview
   - Use the date navigation arrows
   - Check compliance metrics

2. **Sync Regularly**
   - Click "Sync Data" to update with latest timesheet entries
   - Syncing is safe and prevents duplicates

3. **Customize (Optional)**
   - Adjust compliance rules in `lib/services/analytics-service.ts`
   - Modify expected hours in team member settings
   - Customize UI colors in `app/globals.css`

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npx prisma studio        # Open database GUI
npx prisma migrate dev   # Run migrations
npx prisma generate      # Generate client

# Utilities
npm run verify           # Verify setup
npm run sync             # Manual data sync
npm run calculate        # Recalculate analytics
npm run cleanup          # Remove duplicates
npm run reset            # Reset database (⚠️ deletes all data)
```

## Need Help?

- Check the [README.md](README.md) for feature documentation
- Review [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
- Open an issue on GitHub for bugs or questions

## Success! 🎉

You're all set! Your ClickUp Timesheet Analytics Dashboard is ready to use.

