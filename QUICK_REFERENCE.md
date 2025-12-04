# Quick Reference

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/management/stats` | Get dashboard overview statistics |
| GET | `/api/management/activity-logs` | Get recent activity logs |
| POST | `/api/management/users/bulk` | Bulk import users |

## Component Props

### UserSearchFilter
- `onSearch`: `(query: string, filters: any) => void`
- `roles`: `string[]`
- `departments`: `string[]`

### BulkUserImport
- `onImport`: `(users: any[]) => void`

### ActivityLogViewer
- `logs`: `ActivityLog[]`
- `isLoading`: `boolean`

### DashboardOverview
- `stats`: `{ totalTeachers, totalStudents, ... }`
- `roleDistribution`: `{ name, value }[]`
- `departmentDistribution`: `{ name, value }[]`
