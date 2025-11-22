# Organizer Settings

## Overview

Organizer settings control the default behavior and constraints for meeting scheduling. These settings include meeting duration, buffer times, notice requirements, and advance booking limits.

## Database Schema

The organizer settings are stored in the `organizer_settings` table with the following structure:

```typescript
{
  id: string,                    // ULID primary key
  userId: string,                // Foreign key to users table (unique)
  defaultMeetingDuration: number, // Default meeting duration in minutes (15-240)
  preBookingBuffer: number,       // Buffer time before meetings in minutes (0-120)
  postBookingBuffer: number,      // Buffer time after meetings in minutes (0-120)
  minBookingNotice: number,       // Minimum notice required for bookings in hours (0-168)
  maxBookingAdvance: number,      // Maximum advance booking in days (1-365)
  createdAt: Date,               // Creation timestamp (UTC)
  updatedAt: Date,               // Last update timestamp (UTC)
  deletedAt: Date?,              // Soft delete timestamp (optional)
}
```

## Service Layer

The service layer provides the following functions for managing organizer settings:

### `createOrganizerSettings(userId, settings)`

Creates a new organizer settings record for a user.

**Parameters:**

- `userId: string` - The user ID to create settings for
- `settings: Partial<NewOrganizerSettings>` - Optional settings overrides

**Returns:** `OrganizerSettings | null` - The created settings or null if failed

### `getOrganizerSettings(userId)`

Retrieves organizer settings for a user.

**Parameters:**

- `userId: string` - The user ID to get settings for

**Returns:** `OrganizerSettings | null` - The user's settings or null if not found

### `updateOrganizerSettings(userId, settings)`

Updates organizer settings for a user.

**Parameters:**

- `userId: string` - The user ID to update settings for
- `settings: Partial<NewOrganizerSettings>` - The settings to update

**Returns:** `OrganizerSettings | null` - The updated settings or null if failed

### `deleteOrganizerSettings(userId)`

Soft deletes organizer settings for a user.

**Parameters:**

- `userId: string` - The user ID to delete settings for

**Returns:** `boolean` - True if successful, false otherwise

### Settings are created automatically during user registration

When a new user is created, organizer settings are automatically created in the same transaction as user creation. This ensures that every user always has associated settings from the moment they register.

## Server Functions

### `getOrganizerSettings()`

Retrieves the current user's organizer settings. Requires authentication.

**Method:** GET

**Returns:** Organizer settings object

**Example Usage:**

```tsx
import { useServerFn } from "@tanstack/react-start";

function OrganizerSettingsPage() {
  const getSettings = useServerFn(getOrganizerSettings);

  const {
    data: settings,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["organizer-settings"],
    queryFn: () => getSettings(),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Meeting Duration: {settings?.defaultMeetingDuration} minutes</h2>
      <h2>Pre-booking Buffer: {settings?.preBookingBuffer} minutes</h2>
      {/* Render other settings */}
    </div>
  );
}
```

### `updateOrganizerSettings(data)`

Updates the current user's organizer settings. Requires authentication.

**Method:** POST

**Parameters:**

```typescript
{
  defaultMeetingDuration?: number, // 15-240 minutes
  preBookingBuffer?: number,       // 0-120 minutes
  postBookingBuffer?: number,      // 0-120 minutes
  minBookingNotice?: number,       // 0-168 hours
  maxBookingAdvance?: number,      // 1-365 days
}
```

**Returns:** Updated organizer settings object

**Example Usage:**

```tsx
import { useServerFn } from "@tanstack/react-start";

function UpdateSettingsForm() {
  const updateSettings = useServerFn(updateOrganizerSettings);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.target);
      const result = await updateSettings({
        data: {
          defaultMeetingDuration: parseInt(formData.get("duration")),
          preBookingBuffer: parseInt(formData.get("preBuffer")),
          postBookingBuffer: parseInt(formData.get("postBuffer")),
          minBookingNotice: parseInt(formData.get("notice")),
          maxBookingAdvance: parseInt(formData.get("advance")),
        },
      });

      // Handle success
      console.log("Settings updated:", result);
    } catch (error) {
      // Handle error
      console.error("Failed to update settings:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="duration" type="number" min="15" max="240" placeholder="Duration (min)" />
      <input name="preBuffer" type="number" min="0" max="120" placeholder="Pre-buffer (min)" />
      <input name="postBuffer" type="number" min="0" max="120" placeholder="Post-buffer (min)" />
      <input name="notice" type="number" min="0" max="168" placeholder="Min notice (hours)" />
      <input name="advance" type="number" min="1" max="365" placeholder="Max advance (days)" />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Updating..." : "Update Settings"}
      </button>
    </form>
  );
}
```

## Validation

All input data is validated using Zod schemas:

```typescript
const organizerSettingsSchema = z.object({
  defaultMeetingDuration: z.number().int().min(15).max(240).optional(),
  preBookingBuffer: z.number().int().min(0).max(120).optional(),
  postBookingBuffer: z.number().int().min(0).max(120).optional(),
  minBookingNotice: z.number().int().min(0).max(168).optional(),
  maxBookingAdvance: z.number().int().min(1).max(365).optional(),
});
```

## Default Values

When creating new organizer settings, the following default values are used:

- `defaultMeetingDuration`: 30 minutes
- `preBookingBuffer`: 0 minutes
- `postBookingBuffer`: 0 minutes
- `minBookingNotice`: 2 hours
- `maxBookingAdvance`: 14 days

## Error Handling

All server functions include proper error handling:

- Authentication errors are thrown when no valid token is provided
- Validation errors are automatically handled by Zod schemas
- Database errors are caught and returned as error messages
- All errors are serialized and returned to the client

## Security Considerations

- All organizer settings operations require authentication
- Users can only access and modify their own settings
- Input validation prevents invalid values
- Settings are scoped to individual users via userId foreign key

## Usage Patterns

### Getting Settings

For most use cases, use `getOrganizerSettings()` to retrieve user settings:

```typescript
// In a route loader
export const Route = createFileRoute("/settings")({
  loader: () => getOrganizerSettings(),
});
```

### Updating Multiple Settings

When updating multiple settings at once, send all relevant fields:

```typescript
await updateOrganizerSettings({
  data: {
    defaultMeetingDuration: 45,
    preBookingBuffer: 10,
    postBookingBuffer: 20,
  },
});
```

### Partial Updates

Only send the fields you want to change:

```typescript
await updateOrganizerSettings({
  data: {
    defaultMeetingDuration: 60,
  },
});
```
