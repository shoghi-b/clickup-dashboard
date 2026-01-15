# Feature Update: Team Member Filter & Sync Options

## 🎯 New Features Added

### 1. Team Member Filter

**Location**: Main dashboard page (below date range picker)

**Functionality**:
- Filter timesheet data by team members
- Default: All team members selected
- Options:
  - "All Team Members" - Shows all team members
  - Individual team members - Select specific member to view their data only
  - Shows count when multiple members selected (e.g., "3 Members Selected")

**Affected Views**:
- ✅ Week View - Shows only selected members in timesheet grid
- ✅ Month View - Shows only selected members in monthly grid
- ✅ Team Overview - Shows only selected members in team list

### 2. Sync Period Options

**Location**: Sync Data button dropdown

**Functionality**:
- Click "Sync Data" button to open sync options
- Choose sync period before syncing:
  - **Last 4 Weeks** - Syncs data from the last 4 weeks (default)
  - **Whole Year** - Syncs data from the beginning of current year
- Click "Start Sync" to begin synchronization

**Benefits**:
- Faster sync for recent data (4 weeks option)
- Complete historical data when needed (whole year option)
- Reduces API calls and sync time for regular updates

## 📝 Technical Changes

### Files Modified

#### 1. `app/page.tsx`
- Added `TeamMember` interface
- Added state variables:
  - `teamMembers` - List of all team members
  - `selectedMembers` - Array of selected member IDs
  - `syncPeriod` - Sync period selection ('4weeks' | 'year')
  - `showSyncOptions` - Toggle for sync options dropdown
- Added `fetchTeamMembers()` function
- Updated `handleSync()` to use sync period
- Added team member filter UI
- Added sync options dropdown UI
- Pass `selectedMembers` prop to all view components

#### 2. `components/dashboard/timesheet-grid-view.tsx`
- Added `selectedMembers` prop to interface
- Filter team members based on selection
- Update dependency array to re-fetch on member selection change

#### 3. `components/dashboard/month-grid-view.tsx`
- Added `selectedMembers` prop to interface
- Filter team members based on selection
- Update dependency array to re-fetch on member selection change

#### 4. `components/dashboard/team-overview.tsx`
- Added `TeamOverviewProps` interface with `selectedMembers`
- Filter team members based on selection
- Update dependency array to re-fetch on member selection change

### New Imports
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from UI components
- `subWeeks`, `startOfYear` from `date-fns`

## 🎨 UI/UX Improvements

### Team Member Filter
```
┌─────────────────────────────────────┐
│ All Team Members (5)          ▼    │
├─────────────────────────────────────┤
│ All Team Members (5)                │
│ John Doe                            │
│ Jane Smith                          │
│ Bob Johnson                         │
│ ...                                 │
└─────────────────────────────────────┘
```

### Sync Options Dropdown
```
┌─────────────────────────┐
│ Sync Data          ▼    │
└─────────────────────────┘
        ↓
┌─────────────────────────┐
│ Sync Period             │
│ ┌─────────────────────┐ │
│ │ Last 4 Weeks    ▼  │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │   Start Sync        │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

## 🚀 Usage

### Filtering by Team Member

1. Open the dashboard
2. Locate the team member filter (below date range picker)
3. Click the dropdown
4. Select:
   - "All Team Members" to see everyone
   - Individual member name to see only that member
5. All views (Week, Month, Team Overview) update automatically

### Syncing Data

1. Click the "Sync Data" button
2. A dropdown appears with sync options
3. Select sync period:
   - "Last 4 Weeks" for recent data (faster)
   - "Whole Year" for complete historical data
4. Click "Start Sync"
5. Wait for sync to complete
6. Success message shows number of entries synced

## 📊 Data Flow

```
User selects team member
        ↓
selectedMembers state updates
        ↓
Child components re-render
        ↓
API calls fetch data
        ↓
Data filtered by selectedMembers
        ↓
UI displays filtered data
```

## ✅ Testing Checklist

- [x] Team member filter shows all members
- [x] Selecting "All Team Members" shows all data
- [x] Selecting individual member filters data correctly
- [x] Week view respects member filter
- [x] Month view respects member filter
- [x] Team overview respects member filter
- [x] Sync options dropdown opens/closes correctly
- [x] "Last 4 Weeks" sync period works
- [x] "Whole Year" sync period works
- [x] Sync success message shows correct count
- [x] No TypeScript errors
- [x] No console errors

## 🎉 Benefits

1. **Better Focus**: View specific team member's data
2. **Faster Sync**: Choose appropriate sync period
3. **Reduced Load**: Less data to process when filtering
4. **Flexibility**: Switch between team members easily
5. **Efficiency**: Sync only what you need

## 📝 Notes

- Default selection is "All Team Members"
- Sync period defaults to "Last 4 Weeks"
- Filter persists across view changes (Week/Month/Team)
- Sync options close automatically after starting sync

