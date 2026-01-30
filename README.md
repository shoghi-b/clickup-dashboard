# ClickUp Timesheet Analytics Dashboard

A comprehensive Next.js web application that connects to the ClickUp API to analyze timesheet compliance, capacity utilization, and risk patterns for design leadership and operations teams.

## ✨ Features

### 📊 Multiple View Modes
- **Week View**: 7-day timesheet grid (Monday-Sunday) with daily hours tracking
- **Month View**: Monthly overview with weekly summaries
- **Team Overview**: Comprehensive team analytics and compliance metrics

### 📅 Smart Date Navigation
- Arrow-based navigation (previous/next week or month)
- Date picker for jumping to specific periods
- "Go to This Week/Month" quick action
- Automatic period selection based on view mode

### 📈 Analytics & Insights
- Real-time compliance tracking
- Utilization percentage monitoring
- Risk pattern detection (under-logging, overwork, excessive backfilling)
- Daily and weekly summary statistics

### 🎨 Modern UI/UX
- Clean, responsive design with Tailwind CSS
- Color-coded cells for quick visual analysis
- Weekend highlighting in week view
- Sticky headers for easy navigation
- Profile pictures and user avatars

### 🔄 Data Synchronization
- One-click sync with ClickUp API
- Automatic duplicate prevention
- Rate limiting and error handling
- UTC timezone handling
- Last sync timestamp tracking

## 🛠 Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI primitives)
- **Database**: SQLite with Prisma ORM
- **API**: ClickUp REST API v2
- **Date Handling**: date-fns
- **Icons**: Lucide React

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- ClickUp account with API access
- ClickUp API token

### Installation

\`\`\`bash
# 1. Clone the repository
git clone <your-repo-url>
cd clickup-dashboard

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your ClickUp credentials

# 4. Set up the database
npx prisma migrate dev
npx prisma generate

# 5. Verify setup
npm run verify

# 6. Start the development server
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) and click **"Sync Data"** to fetch your timesheet data.

📖 **For detailed setup instructions, see [SETUP.md](SETUP.md)**

## 🚀 Deployment

Ready to deploy to production? This application is optimized for deployment on Vercel.

📖 **See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions**

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

The deployment guide covers:
- Step-by-step Vercel setup
- Environment variable configuration
- Database migration handling
- Troubleshooting common issues
- Performance optimization tips

## 📖 Usage Guide

### Week View
- Shows Monday through Sunday for the selected week
- Each cell displays hours worked per day
- Color coding:
  - **Gray**: No hours logged
  - **Light Blue**: Low hours (< 6h)
  - **Blue**: Normal hours (6-10h)
  - **Red**: High hours (> 10h)
- Weekend columns have gray background

### Month View
- Shows all weeks in the selected month
- Each cell displays total hours per week
- Color coding:
  - **Gray**: No hours logged
  - **Light Blue**: Low hours (< 30h)
  - **Blue**: Normal hours (30-45h)
  - **Red**: High hours (> 45h)

### Navigation
- **◀ Previous**: Go to previous week/month
- **▶ Next**: Go to next week/month
- **Date Picker**: Click date display to select specific period
- **Go to This Week/Month**: Quick return to current period

## 📊 Compliance Rules

### Daily Compliance
- **Fully Compliant** ✅: ≥6 hours logged + same-day logging
- **Partially Compliant** ⚠️: Either ≥6 hours OR same-day logging
- **Non-Compliant** ❌: Neither condition met

### Weekly Compliance
- **Fully Compliant** ✅: ≥4 active days + limited backfilling (<30%)
- **Partially Compliant** ⚠️: Either condition met
- **Non-Compliant** ❌: Neither condition met

### Utilization Categories
- **Under-utilized**: < 70% of expected hours
- **Well-utilized**: 70-100% of expected hours
- **Over-utilized**: > 100% of expected hours

## 🗂 Project Structure

\`\`\`
clickup-dashboard/
├── app/
│   ├── api/              # API routes
│   │   ├── analytics/    # Analytics endpoints
│   │   ├── sync/         # Data sync endpoint
│   │   └── team-members/ # Team member endpoints
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main dashboard page
├── components/
│   ├── dashboard/        # Dashboard components
│   │   ├── month-grid-view.tsx
│   │   ├── team-overview.tsx
│   │   └── timesheet-grid-view.tsx
│   └── ui/               # Reusable UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── date-range-picker.tsx
│       └── ...
├── lib/
│   ├── clickup/          # ClickUp API client
│   ├── services/         # Business logic services
│   └── prisma.ts         # Prisma client
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
├── scripts/
│   ├── calculate-analytics.ts  # Analytics calculation
│   ├── cleanup-duplicates.ts   # Duplicate cleanup
│   ├── reset-database.ts       # Database reset
│   └── sync-data.ts            # Manual sync script
└── package.json
\`\`\`

## 🔧 Available Scripts

\`\`\`bash
# Development
npm run dev              # Start development server

# Database
npx prisma studio        # Open Prisma Studio (database GUI)
npx prisma migrate dev   # Run migrations
npx prisma generate      # Generate Prisma client

# Utility Scripts
npm run sync             # Manual data sync from ClickUp
npm run calculate        # Recalculate analytics
npm run cleanup          # Remove duplicate entries
npm run reset            # Reset database (WARNING: deletes all data)
\`\`\`

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| \`CLICKUP_API_TOKEN\` | Your ClickUp API token | Yes |
| \`CLICKUP_TEAM_ID\` | Your ClickUp team/workspace ID | Yes |

## 🐛 Troubleshooting

### Sync Issues
- Verify your API token is valid
- Check your team ID is correct
- Ensure you have proper permissions in ClickUp

### Database Issues
- Run \`npx prisma migrate reset\` to reset the database
- Run \`npx prisma generate\` to regenerate the client

### Port Already in Use
- The app will automatically use port 3001 if 3000 is taken
- Or manually specify: \`PORT=3002 npm run dev\`

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.