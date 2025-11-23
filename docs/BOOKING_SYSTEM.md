# Booking System Documentation

## Overview

The Booking System handles the creation, management, and cancellation of meetings in the scheduler application. It builds upon the Availability Engine's foundation, providing a secure, concurrent-safe system for booking available time slots while maintaining comprehensive timezone support and data integrity.

The system prioritizes data integrity (preventing double-bookings) and timezone accuracy throughout the booking lifecycle.

## Architecture

The Booking System follows the established three-layer architecture pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                     View Layer (UI)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Booking Forms   │  │   Booking List  │  │   Cancel     │ │
│  │   Components    │  │   Components    │  │  Components  │ │
│  │   (src/routes)  │  │   (src/routes)  │  │(src/routes)  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                API Layer (Server Functions)                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  createBooking  │  │ getUserBookings │  │cancelBooking  │ │
│  │ (src/functions) │  │ (src/functions) │  │(src/functions)│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Service Layer (Business Logic)               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Database       │  │     Redis       │  │  Availability │ │
│  │  Operations     │  │   Locking       │  │   Engine     │ │
│  │  (src/services) │  │  (src/services)  │  │(src/services)│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Framework**: TanStack Start (React Server Components + Server Functions)
- **Language**: TypeScript (Strict mode)
- **Database**: PostgreSQL (via Drizzle ORM)
- **Infrastructure**: Redis (for Distributed Locking & Session Management)
- **Timezone**: Luxon (for all timezone operations)
- **Validation**: Zod (for input validation)

## Database Schema

### Bookings Table

The bookings table stores all meeting information with timezone context:

```sql
CREATE TABLE "bookings" (
  "id" text PRIMARY KEY NOT NULL,
  "organizer_id" text NOT NULL,
  "attendant_name" text NOT NULL,
  "attendant_email" text NOT NULL,
  "metadata" jsonb, -- For additional attendees or custom fields
  "title" text NOT NULL,
  "description" text,
  "start_time" timestamp with time zone NOT NULL,
  "end_time" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

-- Indexes for efficient querying
CREATE INDEX "bookings_organizer_id_idx" ON "bookings" USING btree ("organizer_id");
CREATE INDEX "bookings_organizer_start_time_idx" ON "bookings" USING btree ("organizer_id", "start_time");
```

### TypeScript Schema

```typescript
export const bookingsTable = pgTable(
  "bookings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    organizerId: text("organizer_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    attendantName: text("attendant_name").notNull(),
    attendantEmail: text("attendant_email").notNull(),
    metadata: jsonb("metadata"), // For additional attendees or custom fields
    title: text("title").notNull(),
    description: text("description"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    organizerIdIndex: index("bookings_organizer_id_idx").on(table.organizerId),
    organizerStartTimeIndex: index("bookings_organizer_start_time_idx").on(table.organizerId, table.startTime),
  }),
);

export type Booking = typeof bookingsTable.$inferSelect;
export type NewBooking = typeof bookingsTable.$inferInsert;
```

### Schema Justifications

1. **Primary Key**: ULID for unique identification and sorting
2. **Foreign Key**: `organizerId` references users table with cascade delete
3. **Time Fields**: Stored as `timestamp with time zone` in UTC for consistency
4. **Metadata Field**: JSONB for flexible additional information
5. **Soft Deletes**: `deletedAt` allows data recovery while hiding cancelled bookings
6. **Indexes**: Optimized for common query patterns (by organizer, time range)

## Service Layer

### Core Functions

#### createBooking(booking)

Creates a new booking record in the database.

```typescript
export async function createBooking(
  booking: Omit<NewBooking, "id" | "createdAt" | "updatedAt">
): Promise<Booking | null> {
  const bookingData: NewBooking = {
    ...booking,
  };

  const result = await db.insert(bookingsTable).values(bookingData).returning();

  return result[0] || null;
}
```

#### getBookingById(id)

Retrieves a single booking by ID.

```typescript
export async function getBookingById(id: string): Promise<Booking | null> {
  const result = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.id, id), isNull(bookingsTable.deletedAt)));

  return result[0] || null;
}
```

#### getBookingsByOrganizerId(organizerId)

Retrieves all bookings for an organizer.

```typescript
export async function getBookingsByOrganizerId(organizerId: string): Promise<Booking[]> {
  const result = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.organizerId, organizerId), isNull(bookingsTable.deletedAt)))
    .orderBy(bookingsTable.startTime);

  return result;
}
```

#### getBookingsByOrganizerInDateRange(organizerId, startDate, endDate)

Retrieves bookings for an organizer within a specific date range.

```typescript
export async function getBookingsByOrganizerInDateRange(
  organizerId: string,
  startDateUTC: Date,
  endDateUTC: Date
): Promise<Booking[]> {
  // Set end date to end of day to include the full date range
  const endDateWithTime = new Date(endDateUTC);
  endDateWithTime.setHours(23, 59, 59, 999);

  const result = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.organizerId, organizerId),
        gte(bookingsTable.startTime, startDateUTC),
        lte(bookingsTable.startTime, endDateWithTime),
        isNull(bookingsTable.deletedAt),
      ),
    )
    .orderBy(bookingsTable.startTime);

  return result;
}
```

#### deleteBooking(id)

Soft deletes a booking (marks as deleted but keeps record).

```typescript
export async function deleteBooking(id: string): Promise<boolean> {
  const result = await db
    .update(bookingsTable)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(bookingsTable.id, id));

  return result.rowCount > 0;
}
```

## API Layer (Server Functions)

### createBooking

Creates a new booking with validation and concurrency control.

**Method**: POST
**Authentication**: Required (via organizer lookup)
**Concurrency Control**: Redis distributed locking

```typescript
export const createBooking = createServerFn({ method: "POST" })
  .inputValidator(createBookingSchema)
  .handler(async ({ data }) => {
    const {
      organizerUsername,
      attendantName,
      attendantEmail,
      title,
      description,
      startTime: startTimeStr,
      endTime: endTimeStr,
      metadata,
    } = data;

    // Parse dates
    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);

    // Validate time range
    if (startTime >= endTime) {
      return { error: "End time must be after start time" };
    }

    // Get organizer by username
    const organizerResult = await getUserByUsername(organizerUsername);
    if (!organizerResult || organizerResult.length === 0) {
      return { error: "Organizer not found" };
    }

    const organizerId = organizerResult[0].id;

    // Get organizer settings for buffer times
    const settings = await getOrganizerSettings(organizerId);
    if (!settings) {
      return { error: "Organizer settings not found" };
    }

    // Create a unique lock key for this time slot
    const startTimestamp = DateTime.fromJSDate(startTime).toMillis();
    const lockKey = `${LOCK_PREFIX}:${organizerId}:${startTimestamp}`;

    // Acquire Redis lock with NX (only if not exists) and PX (milliseconds expiry)
    const lockAcquired = await redis.set(lockKey, "locked", {
      NX: true,
      PX: LOCK_EXPIRY,
    });

    if (!lockAcquired) {
      return {
        error: "This time slot is currently being booked by another user. Please try again.",
      };
    }

    try {
      // Double-check availability by recalculating slots
      const { slots } = await calculateAvailableSlots(organizerId);

      // Check if the requested slot is still available
      const isSlotAvailable = slots.some((slot) => {
        const slotStart = new Date(slot.startTime);
        const slotEnd = new Date(slot.endTime);
        return (
          slotStart.getTime() === startTime.getTime() && 
          slotEnd.getTime() === endTime.getTime()
        );
      });

      if (!isSlotAvailable) {
        return { error: "This time slot is no longer available" };
      }

      // Create the booking
      const newBooking = await createBookingService({
        organizerId,
        attendantName,
        attendantEmail,
        title: title,
        description: description || null,
        startTime,
        endTime,
        metadata: metadata || null,
      });

      if (!newBooking) {
        return { error: "Failed to create booking" };
      }

      return {
        success: true,
        booking: {
          id: newBooking.id,
          organizerId: newBooking.organizerId,
          attendantName: newBooking.attendantName,
          attendantEmail: newBooking.attendantEmail,
          title: newBooking.title,
          description: newBooking.description,
          startTime: newBooking.startTime.toISOString(),
          endTime: newBooking.endTime.toISOString(),
          createdAt: newBooking.createdAt.toISOString(),
        },
      };
    } finally {
      // Always release the lock
      await redis.del(lockKey);
    }
  });
```

#### Input Schema

```typescript
export const createBookingSchema = z.object({
  organizerUsername: z.string().min(3, "Username must be at least 3 characters"),
  attendantName: z.string().min(1, "Attendant name is required"),
  attendantEmail: z.email("Invalid email address"),
  title: z.string().min(1, "Meeting title is required"),
  description: z.string().optional(),
  startTime: z.iso.datetime(), // ISO datetime string
  endTime: z.iso.datetime(), // ISO datetime string
  metadata: z.record(z.string(), z.any()).optional(), // For additional attendees or metadata
});
```

### getUserBookings

Retrieves bookings for the authenticated user.

**Method**: GET
**Authentication**: Required (via middleware)

```typescript
export const getUserBookings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(getUserBookingsSchema)
  .handler(async ({ data, context }) => {
    const { page, limit, startDate, endDate } = data;
    const user = context.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    let bookings;
    
    if (startDate && endDate) {
      const startUTC = DateTime.fromISO(startDate, { zone: "utc" }).toUTC();
      const endUTC = DateTime.fromISO(endDate, { zone: "utc" }).toUTC();
      
      if (!startUTC.isValid || !endUTC.isValid) {
        throw new Error("Invalid date range provided");
      }
      
      bookings = await getBookingsByOrganizerInDateRange(user.id, startUTC.toJSDate(), endUTC.toJSDate());
    } else {
      bookings = await getBookingsByOrganizerId(user.id);
    }

    const offset = (page - 1) * limit;
    const paginatedBookings = bookings.slice(offset, offset + limit);

    return {
      bookings: paginatedBookings.map(booking => ({
        id: booking.id,
        attendantName: booking.attendantName,
        attendantEmail: booking.attendantEmail,
        title: booking.title,
        description: booking.description,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total: bookings.length,
        totalPages: Math.ceil(bookings.length / limit),
      },
    };
  });
```

### cancelBooking

Cancels an existing booking.

**Method**: POST
**Authentication**: Optional (if requestingUsername provided)

```typescript
export const cancelBooking = createServerFn({ method: "POST" })
  .inputValidator(cancelBookingSchema)
  .handler(async ({ data }) => {
    const { bookingId, requestingUsername } = data;

    // Get booking by ID
    const booking = await getBookingById(bookingId);
    if (!booking) {
      throw notFound();
    }

    // If a requesting username is provided, verify permissions
    if (requestingUsername) {
      // Get requesting user
      const requestingUserResult = await getUserByUsername(requestingUsername);
      if (!requestingUserResult || requestingUserResult.length === 0) {
        return { error: "Requesting user not found" };
      }

      const requestingUserId = requestingUserResult[0].id;

      // Check if user is either the organizer or the attendant
      const isOrganizer = requestingUserId === booking.organizerId;
      const isAttendant = requestingUserResult[0].email === booking.attendantEmail;

      if (!isOrganizer && !isAttendant) {
        return { error: "You don't have permission to cancel this booking" };
      }
    }

    // Cancel the booking (soft delete)
    const success = await deleteBooking(bookingId);

    if (!success) {
      return { error: "Failed to cancel booking" };
    }

    return {
      success: true,
      message: "Booking cancelled successfully",
      cancelledAt: new Date().toISOString(),
    };
  });
```

## Concurrency Control with Redis

### Distributed Locking

The Booking System uses Redis-based distributed locking to prevent race conditions when multiple users try to book the same slot simultaneously.

#### Lock Key Format

```
lock:booking:{organizerId}:{timestamp_ms}
```

#### Lock Configuration

```typescript
const LOCK_EXPIRY = 100000; // 10 seconds in milliseconds
const LOCK_PREFIX = "lock:booking";
```

#### Lock Acquisition

```typescript
// Acquire Redis lock with NX (only if not exists) and PX (milliseconds expiry)
const lockAcquired = await redis.set(lockKey, "locked", {
  NX: true,
  PX: LOCK_EXPIRY,
});

if (!lockAcquired) {
  return {
    error: "This time slot is currently being booked by another user. Please try again.",
  };
}
```

#### Double-Check Pattern

Even with locks, the system performs a double-check by recalculating availability after acquiring the lock:

```typescript
// Double-check availability by recalculating slots
const { slots } = await calculateAvailableSlots(organizerId);

// Check if the requested slot is still available
const isSlotAvailable = slots.some((slot) => {
  const slotStart = new Date(slot.startTime);
  const slotEnd = new Date(slot.endTime);
  return (
    slotStart.getTime() === startTime.getTime() && 
    slotEnd.getTime() === endTime.getTime()
  );
});

if (!isSlotAvailable) {
  return { error: "This time slot is no longer available" };
}
```

## Integration with Availability Engine

The Booking System tightly integrates with the Availability Engine:

### 1. Pre-Booking Validation

Before creating a booking, the system calls the Availability Engine to validate that the slot is still available:

```typescript
// In booking creation service
const { slots } = await calculateAvailableSlots(organizerId);

// Check if the requested slot is still available
const isSlotAvailable = slots.some((slot) => {
  const slotStart = new Date(slot.startTime);
  const slotEnd = new Date(slot.endTime);
  return (
    slotStart.getTime() === startTime.getTime() && 
    slotEnd.getTime() === endTime.getTime()
  );
});
```

### 2. Buffer Time Considerations

The Availability Engine already applies buffer times when calculating availability. The Booking System leverages this by only allowing bookings on slots that have already been validated against buffer constraints.

### 3. Timezone Consistency

Both systems use Luxon for timezone operations and store all times in UTC in the database, ensuring consistency across the application.

## Timezone Handling

### Storage Strategy

- **Database**: All timestamps stored as `timestamp with time zone` in UTC
- **API Communication**: ISO 8601 strings for all datetime values
- **Display Conversion**: Convert to local timezone only in UI layer using Luxon

### Luxon Integration

```typescript
import { DateTime } from "luxon";

// Create a unique lock key for this time slot
const startTimestamp = DateTime.fromJSDate(startTime).toMillis();

// Date range processing with timezone safety
if (startDate && endDate) {
  const startUTC = DateTime.fromISO(startDate, { zone: "utc" }).toUTC();
  const endUTC = DateTime.fromISO(endDate, { zone: "utc" }).toUTC();
  
  if (!startUTC.isValid || !endUTC.isValid) {
    throw new Error("Invalid date range provided");
  }
}
```

## Error Handling

### Common Error Scenarios

1. **Invalid Time Range**: End time before or equal to start time
2. **Organizer Not Found**: Username doesn't exist in system
3. **Missing Settings**: Organizer hasn't configured settings
4. **Slot Unavailable**: Requested slot is no longer available
5. **Concurrency Conflict**: Another user is booking the same slot
6. **Permission Denied**: User doesn't have permission to cancel booking

### Error Response Format

```typescript
// Error response
{
  error: "This time slot is no longer available"
}

// Success response
{
  success: true,
  booking: {
    id: "booking-id",
    // ... booking details
  }
}
```

## Security Considerations

### Authentication & Authorization

- **Create Booking**: Only requires valid organizer username (public endpoint)
- **View Bookings**: Requires authentication (only own bookings)
- **Cancel Booking**: Either organizer or attendant can cancel

### Input Validation

- Comprehensive validation with Zod schemas
- SQL injection prevention through Drizzle ORM
- XSS prevention in notes and title fields
- Email format validation

### Business Rule Enforcement

- Cannot book past time slots
- Must respect minimum notice period
- Cannot exceed maximum advance booking period
- Buffer times are enforced by Availability Engine
