# Working Hours

## Overview

Working hours define an organizer's weekly availability schedule. Each day of the week (0-6, where 0 = Sunday) can have specific time slots when the organizer is available for meetings. This provides fine-grained control over availability patterns beyond the general organizer settings.

## Database Schema

The working hours are stored in the `working_hours` table with the following structure:

```typescript
{
  id: string,                    // ULID primary key
  userId: string,                // Foreign key to users table
  dayOfWeek: string,             // Day number (0-6, where 0 = Sunday)
  startTime: string,             // Start time in HH:mm format (24-hour)
  endTime: string,               // End time in HH:mm format (24-hour)
  isActive: boolean,             // Whether this time slot is active
  createdAt: Date,               // Creation timestamp (UTC)
  updatedAt: Date,               // Last update timestamp (UTC)
  deletedAt: Date?,              // Soft delete timestamp (optional)
}
```

### Day of Week Mapping

- `0`: Sunday
- `1`: Monday
- `2`: Tuesday
- `3`: Wednesday
- `4`: Thursday
- `5`: Friday
- `6`: Saturday

## Service Layer

The service layer provides the following functions for managing working hours:

### `createWorkingHours(userId, workingHours)`

Creates a new working hours entry for a user.

**Parameters:**

- `userId: string` - The user ID to create working hours for
- `workingHours: Omit<NewWorkingHours, "id" | "userId" | "createdAt" | "updatedAt">` - Working hours data

**Returns:** `WorkingHours | null` - The created working hours or null if failed

### `getWorkingHoursByUserId(userId)`

Retrieves all working hours for a user, ordered by day of week.

**Parameters:**

- `userId: string` - The user ID to get working hours for

**Returns:** `WorkingHours[]` - Array of working hours entries

### `getWorkingHoursByDay(userId, dayOfWeek)`

Retrieves working hours for a specific day of the week.

**Parameters:**

- `userId: string` - The user ID
- `dayOfWeek: string` - Day number (0-6)

**Returns:** `WorkingHours[]` - Array of working hours for that day

### `updateWorkingHours(id, workingHours)`

Updates existing working hours.

**Parameters:**

- `id: string` - The working hours entry ID to update
- `workingHours: Partial<NewWorkingHours>` - The data to update

**Returns:** `WorkingHours | null` - The updated working hours or null if failed

### `deleteWorkingHours(id)`

Soft deletes working hours (marks as deleted but keeps record).

**Parameters:**

- `id: string` - The working hours entry ID to delete

**Returns:** `boolean` - True if successful, false otherwise

### `bulkUpdateWorkingHours(userId, workingHoursArray)`

Updates multiple working hours entries in a single operation.

**Parameters:**

- `userId: string` - The user ID
- `workingHoursArray: Array<Partial<WorkingHours>>` - Array of working hours to update/create

**Returns:** `WorkingHours[]` - Array of updated/created working hours

### `setDefaultWorkingHours(userId)`

Creates a default Monday-Friday 9 AM - 5 PM schedule for a user.

**Parameters:**

- `userId: string` - The user ID to create default schedule for

**Returns:** `WorkingHours[]` - Array of created default working hours (5 entries)

## Server Functions

### `getWorkingHours()`

Retrieves the current user's working hours. Requires authentication.

**Method:** GET

**Returns:** Array of working hours objects

**Example Usage:**

```tsx
import { useServerFn } from "@tanstack/react-start";

function WorkingHoursPage() {
  const getWorkingHours = useServerFn(getWorkingHours);

  const {
    data: workingHours,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["working-hours"],
    queryFn: () => getWorkingHours(),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {workingHours?.map((hours) => (
        <div key={hours.id}>
          <h3>
            Day {hours.dayOfWeek}: {hours.startTime} - {hours.endTime}
          </h3>
          <p>Active: {hours.isActive ? "Yes" : "No"}</p>
        </div>
      ))}
    </div>
  );
}
```

### `createWorkingHoursFn(data)`

Creates new working hours for the current user. Requires authentication.

**Method:** POST

**Parameters:**

```typescript
{
  dayOfWeek: string,    // "0"-"6" (Sunday-Saturday)
  startTime: string,    // "HH:mm" format (24-hour)
  endTime: string,      // "HH:mm" format (24-hour)
  isActive?: boolean,   // Optional, defaults to true
}
```

**Returns:** Created working hours object

**Example Usage:**

```tsx
import { useServerFn } from "@tanstack/react-start";

function CreateWorkingHoursForm() {
  const createWorkingHours = useServerFn(createWorkingHoursFn);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      const result = await createWorkingHours({
        data: {
          dayOfWeek: formData.get("dayOfWeek"),
          startTime: formData.get("startTime"),
          endTime: formData.get("endTime"),
          isActive: formData.get("isActive") === "true",
        },
      });

      console.log("Working hours created:", result);
    } catch (error) {
      console.error("Failed to create working hours:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <select name="dayOfWeek">
        <option value="0">Sunday</option>
        <option value="1">Monday</option>
        <option value="2">Tuesday</option>
        <option value="3">Wednesday</option>
        <option value="4">Thursday</option>
        <option value="5">Friday</option>
        <option value="6">Saturday</option>
      </select>
      <input name="startTime" type="time" required />
      <input name="endTime" type="time" required />
      <input name="isActive" type="checkbox" />
      <button type="submit">Create Working Hours</button>
    </form>
  );
}
```

### `updateWorkingHoursFn(data)`

Updates existing working hours. Requires authentication.

**Method:** POST

**Parameters:**

```typescript
{
  id: string,           // Required: Working hours ID to update
  dayOfWeek?: string,   // Optional
  startTime?: string,   // Optional
  endTime?: string,     // Optional
  isActive?: boolean,   // Optional
}
```

**Returns:** Updated working hours object

### `deleteWorkingHoursFn(data)`

Soft deletes working hours. Requires authentication.

**Method:** POST

**Parameters:**

```typescript
{
  id: string,  // Working hours ID to delete
}
```

**Returns:** `{ success: boolean }`

### `bulkUpdateWorkingHoursFn(data)`

Updates multiple working hours entries at once. Requires authentication.

**Method:** POST

**Parameters:**

```typescript
[
  {
    id?: string,         // Optional: If provided, updates existing entry
    dayOfWeek: string,   // Required
    startTime: string,   // Required
    endTime: string,     // Required
    isActive?: boolean,  // Optional
  },
  // ... more entries
]
```

**Returns:** Array of updated/created working hours objects

### `setDefaultWorkingHoursFn()`

Creates a default Monday-Friday 9 AM - 5 PM schedule. Requires authentication.

**Method:** POST

**Returns:** Array of created working hours objects

## Validation

All input data is validated using Zod schemas:

```typescript
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

const workingHoursSchema = z
  .object({
    id: z.string().optional(),
    dayOfWeek: z.string().refine(
      (val) => {
        const dayNum = parseInt(val);
        return !isNaN(dayNum) && dayNum >= 0 && dayNum <= 6;
      },
      { message: "Day of week must be a number between 0-6" },
    ),
    startTime: z.string().regex(timeRegex, {
      message: "Start time must be in HH:mm format (24-hour)",
    }),
    endTime: z.string().regex(timeRegex, {
      message: "End time must be in HH:mm format (24-hour)",
    }),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // Ensures end time is after start time
      const startTime = data.startTime.split(":").map(Number);
      const endTime = data.endTime.split(":").map(Number);
      const startMinutes = startTime[0] * 60 + startTime[1];
      const endMinutes = endTime[0] * 60 + endTime[1];
      return endMinutes > startMinutes;
    },
    { message: "End time must be after start time", path: ["endTime"] },
  );
```

## Default Values

When using `setDefaultWorkingHours()`, the following default schedule is created:

- **Monday (1)**: 09:00 - 17:00
- **Tuesday (2)**: 09:00 - 17:00
- **Wednesday (3)**: 09:00 - 17:00
- **Thursday (4)**: 09:00 - 17:00
- **Friday (5)**: 09:00 - 17:00

Weekend days (0 and 6) are not included in the default schedule.

## Error Handling

All server functions include proper error handling:

- Authentication errors are thrown when no valid token is provided
- Validation errors are automatically handled by Zod schemas
- Database errors are caught and returned as error messages
- All errors are serialized and returned to the client

## Security Considerations

- All working hours operations require authentication
- Users can only access and modify their own working hours
- Input validation prevents invalid values and time conflicts
- Working hours are scoped to individual users via userId foreign key
- Soft deletes preserve data integrity while removing entries from active queries

## Usage Patterns

### Getting All Working Hours

For most use cases, use `getWorkingHours()` to retrieve user's schedule:

```typescript
// In a route loader
export const Route = createFileRoute("/settings/working-hours")({
  loader: () => getWorkingHours(),
});
```

### Setting Up Default Schedule

Quickly set up a standard work week:

```typescript
const defaultSchedule = await setDefaultWorkingHoursFn();
// Returns array of 5 working hours entries for Mon-Fri 9-5
```

### Bulk Updates

When updating an entire weekly schedule, use bulk operations:

```typescript
const weeklySchedule = [
  { dayOfWeek: "1", startTime: "09:00", endTime: "17:00", isActive: true },
  { dayOfWeek: "2", startTime: "09:00", endTime: "17:00", isActive: true },
  { dayOfWeek: "3", startTime: "09:00", endTime: "17:00", isActive: true },
  { dayOfWeek: "4", startTime: "09:00", endTime: "17:00", isActive: true },
  { dayOfWeek: "5", startTime: "09:00", endTime: "17:00", isActive: true },
];

const results = await bulkUpdateWorkingHoursFn({ data: weeklySchedule });
```

### Partial Updates

Only send the fields you want to change:

```typescript
await updateWorkingHoursFn({
  data: {
    id: "working-hours-id",
    startTime: "10:00",
    endTime: "18:00",
  },
});
```

## Integration with Organizer Settings

Working hours complement the general organizer settings:

- **Organizer Settings**: Define global rules (meeting duration, buffers, notice periods)
- **Working Hours**: Define specific availability windows for each day of the week

Both work together to determine actual availability for booking:

1. Check if the requested date falls within working hours
2. Apply organizer settings constraints (buffers, notice periods, etc.)
3. Check for existing bookings in those time slots

## User Creation Integration

Working hours are automatically created during user registration:

### Automatic Default Creation

When a new user registers, the system automatically creates default working hours as part of the user creation transaction:

```typescript
// Inside createUser() function in src/service/user.ts
const defaultWorkingHours = [
  { dayOfWeek: "1", startTime: "09:00", endTime: "17:00", isActive: true }, // Monday
  { dayOfWeek: "2", startTime: "09:00", endTime: "17:00", isActive: true }, // Tuesday
  { dayOfWeek: "3", startTime: "09:00", endTime: "17:00", isActive: true }, // Wednesday
  { dayOfWeek: "4", startTime: "09:00", endTime: "17:00", isActive: true }, // Thursday
  { dayOfWeek: "5", startTime: "09:00", endTime: "17:00", isActive: true }, // Friday
];
```

### Transaction Safety

The working hours creation is part of the same database transaction as user creation and organizer settings. This means:

- If any step fails (user creation, settings creation, or working hours creation), the entire transaction is rolled back
- Users are never created without complete working hours
- Data integrity is maintained across all user-related tables

### Benefits

- **Complete Onboarding**: New users have a full availability setup immediately
- **Data Consistency**: All users will have working hours, preventing null/missing data issues
- **Atomic Operations**: All user data (user, settings, working hours) is created in a single transaction
- **Consistency**: Follows the same pattern as existing organizer settings creation
