# Blackout Dates

## Overview

Blackout dates allow organizers to block specific dates from being available for meetings, regardless of their weekly availability schedule. This feature is essential for handling holidays, personal days, company events, or any situation where the organizer is unavailable on specific dates.

## Schema Design

The `blackout_dates` table stores individual blackout dates with the following fields:

- **id**: ULID primary key for unique identification
- **userId**: Foreign key to the users table (with cascade delete)
- **date**: The specific date that is blocked (stored as timestamp with time zone)
- **reason**: Optional text field for notes about why the date is blocked
- **createdAt**: Timestamp when the record was created
- **updatedAt**: Timestamp when the record was last modified
- **deletedAt**: Timestamp for soft deletes (allows data recovery)

### Constraints and Indexes

- Unique constraint on (userId, date, deletedAt) prevents duplicate blackout dates for the same user
- Index on userId for efficient queries by user
- Foreign key constraint ensures data integrity

## Service Functions

### CRUD Operations

#### `createBlackoutDate(userId, blackoutDate)`
Creates a new blackout date for a user.
```typescript
const blackoutDate = await createBlackoutDate(userId, {
  date: new Date('2025-12-25'),
  reason: 'Christmas holiday'
});
```

#### `getBlackoutDatesByUserId(userId)`
Retrieves all active blackout dates for a user, ordered by date.
```typescript
const blackoutDates = await getBlackoutDatesByUserId(userId);
```

#### `getBlackoutDatesByUserIdAndDateRange(userId, startDate, endDate)`
Retrieves blackout dates within a specific date range.
```typescript
const blackoutDates = await getBlackoutDatesByUserIdAndDateRange(
  userId,
  new Date('2025-12-01'),
  new Date('2025-12-31')
);
```

#### `getBlackoutDateById(id)`
Retrieves a specific blackout date by ID.
```typescript
const blackoutDate = await getBlackoutDateById(id);
```

#### `updateBlackoutDateById(id, updates)`
Updates an existing blackout date.
```typescript
const updated = await updateBlackoutDateById(id, {
  reason: 'Updated reason'
});
```

#### `deleteBlackoutDate(id)`
Soft deletes a blackout date (marks as deleted without removing data).
```typescript
const success = await deleteBlackoutDate(id);
```

### Batch Operations

#### `bulkUpsertBlackoutDates(userId, blackoutDates)`
Efficiently creates or updates multiple blackout dates at once.
```typescript
const results = await bulkUpsertBlackoutDates(userId, [
  { date: new Date('2025-12-25'), reason: 'Christmas' },
  { date: new Date('2025-12-31'), reason: 'New Years Eve' }
]);
```

### Utility Functions

#### `isDateBlackouted(userId, date)`
Checks if a specific date is blocked for a user.
```typescript
const isBlocked = await isDateBlackouted(userId, new Date('2025-12-25'));
```

## Integration with Availability Engine

Blackout dates are used in the availability engine to filter out unavailable dates:

1. The engine fetches the organizer's weekly availability schedule
2. It retrieves all blackout dates within the 14-day window
3. Blackout dates are removed from the available slots calculation
4. The remaining dates are used for booking suggestions

## Common Use Cases

### Holidays
```typescript
// Block Christmas week
await bulkUpsertBlackoutDates(userId, [
  { date: new Date('2025-12-25'), reason: 'Christmas Day' },
  { date: new Date('2025-12-26'), reason: 'Christmas Holiday' }
]);
```

### Personal Days
```typescript
// Block a personal day
await createBlackoutDate(userId, {
  date: new Date('2025-11-28'),
  reason: 'Personal day - doctor appointment'
});
```

### Company Events
```typescript
// Block company retreat days
await bulkUpsertBlackoutDates(userId, [
  { date: new Date('2025-03-15'), reason: 'Company Retreat' },
  { date: new Date('2025-03-16'), reason: 'Company Retreat' }
]);
```

## Best Practices

1. **Use descriptive reasons**: Help users remember why dates are blocked
2. **Plan ahead**: Add blackout dates well in advance for predictable events
3. **Regular cleanup**: Remove outdated blackout dates to keep the schedule clean
4. **Bulk operations**: Use `bulkUpsertBlackoutDates` for multiple dates to improve performance

## Timezone Considerations

Blackout dates are stored as timestamps with timezone information, ensuring proper timezone handling throughout the application. When creating or querying blackout dates:

1. The date is stored with timezone information to maintain consistency with other date/time fields in the system
2. For date range queries, the service layer handles the full day by querying from start of day (00:00:00) to end of day (23:59:59)
3. This approach aligns with the project guidelines of using timestamps with timezone for all date fields

The timezone-aware storage ensures blackout dates work correctly regardless of the user's timezone, while still blocking the entire calendar day as intended.
