# Availability Engine Documentation

## Overview

The Availability Engine is the core algorithmic component of the meeting scheduler that determines which time slots are available for booking. It combines organizer settings, working hours, blackout dates, and existing bookings to generate a list of available time slots within a configurable window.

The engine is designed with data integrity as the top priority, ensuring that no double-bookings can occur and that all timezone calculations are handled correctly across the globe.

## Architecture

The Availability Engine resides in the Service Layer (`src/service/availability.ts`) and follows the established three-layer architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     View Layer (UI)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Components    │  │    Routes       │  │   Hooks      │ │
│  │   (src/routes)  │  │   (src/routes)  │  │   (src/hooks)│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                API Layer (Server Functions)                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   getAvailable  │  │   Validation    │  │  Error       │ │
│  │  SlotsByUsername│  │   (Zod schemas) │  │  Handling    │ │
│  │(src/functions) │  │ (src/functions) │  │(src/functions)│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Service Layer (Business Logic)               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Availability   │  │   Working Hours │  │  Organizer   │ │
│  │     Engine      │  │    Service      │  │   Settings   │ │
│  │(src/services)   │  │ (src/services)  │  │(src/services)│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Timezone Library**: Luxon (Immutable timezone-safe date operations)
- **Database**: PostgreSQL with Drizzle ORM
- **Language**: TypeScript (Strict mode)
- **Date Format**: ISO 8601 strings for API communication

## Core Algorithm

### High-Level Flow

1. **Fetch Organizer Settings**: Get working timezone, meeting duration, buffers, notice periods
2. **Initialize Time Window**: Generate configurable window (default: 14 days) in organizer's timezone using Luxon
3. **Fetch Supporting Data**: Get working hours, blackout dates, existing bookings
4. **Generate Candidate Slots**: Create discrete slots within working hours, respecting timezone
5. **Filter Blackout Dates**: Remove slots falling on blocked dates
6. **Filter Booking Collisions**: Remove slots overlapping with existing meetings (with buffers)
7. **Apply Business Rules**: Filter by notice period and other constraints
8. **Convert to UTC**: Ensure all returned slots are in UTC for database storage
9. **Return Results**: Format slots ready for storage/display

### Detailed Algorithm

```typescript
import { DateTime } from "luxon";

export async function calculateAvailableSlots(organizerId: string): Promise<{
  slots: AvailableSlot[];
  settings: OrganizerSettings;
}> {
  // 1. Fetch organizer settings (contains timezone and business rules)
  const settings = await getOrganizerSettings(organizerId);
  if (!settings) throw new Error("Organizer settings not found");

  // 2. Initialize time window in organizer's timezone
  const { startInTZ, endInTZ, startUTC, endUTC } = getTimeWindowInTimezone(settings);

  // 3. Fetch all supporting data in parallel
  const [workingHours, blackoutDates, existingBookings] = await Promise.all([
    getWorkingHoursByUserId(organizerId),
    getBlackoutDatesByUserIdAndDateRange(organizerId, startUTC.toJSDate(), endUTC.toJSDate()),
    getBookingsByOrganizerInDateRange(organizerId, startUTC.toJSDate(), endUTC.toJSDate()),
  ]);

  // 4. Generate candidate slots from working hours
  let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);

  // 5. Apply blackout dates (remove entire blocked days)
  candidateSlots = filterSlotsByBlackoutDates(
    candidateSlots,
    blackoutDates,
    settings.workingTimezone,
  );

  // 6. Filter out colliding slots with existing bookings (buffers already applied here)
  const bufferedBookings = applyBufferTimes(existingBookings, settings);
  const availableSlots = filterCollidingSlots(candidateSlots, bufferedBookings);

  // 7. Apply business rules (notice period, no past slots)
  const finalSlots = applyBusinessRulesToSlots(availableSlots, settings);

  // 8. Convert to return format and sort
  const slots = finalSlots
    .map((slot) => ({
      startTime: slot.startTimeUTC.toJSDate(),
      endTime: slot.endTimeUTC.toJSDate(),
      duration: slot.duration,
      timezone: settings.workingTimezone,
      available: true,
    }))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return {
    slots,
    settings,
  };
}
```

## Critical: Timezone Handling Pattern

The Availability Engine uses Luxon for all timezone operations. This is critical for correctness:

**IMPORTANT:** Working hours are stored as simple `TIME` values (HH:mm format) without timezone context. The timezone context comes from `organizerSettingsTable.workingTimezone`. This means:

1. Working hours (e.g., "09:00" to "17:00") are interpreted in the **organizer's timezone**, not UTC
2. Day-of-week must be calculated in the **organizer's timezone**, not server/local timezone
3. All final slot times must be converted to **UTC** for database storage
4. **Use Luxon** (`DateTime`) for all timezone operations - it handles DST, offsets, and timezone conversions correctly

### Component Breakdown

#### 1. Time Window Generation (Luxon-Safe)

```typescript
import { DateTime } from "luxon";

export function getTimeWindowInTimezone(settings: OrganizerSettings): TimeWindow {
  // Get current time in organizer's timezone
  const nowInTZ = DateTime.now().setZone(settings.workingTimezone);

  // Start of today in their timezone
  const startInTZ = nowInTZ.startOf("day");

  // Start of the day at maxBookingAdvance days in future
  const endInTZ = startInTZ.plus({ days: settings.maxBookingAdvance }).startOf("day");

  // Get UTC equivalents for database queries
  const startUTC = startInTZ.toUTC();
  const endUTC = endInTZ.toUTC();

  return { startInTZ, endInTZ, startUTC, endUTC };
}
```

**Design Decisions:**

- Luxon's `DateTime.now().setZone()` converts to organizer's timezone automatically
- `startOf("day")` gets midnight in that timezone context (handles DST automatically)
- `.toUTC()` returns the equivalent UTC DateTime
- `.toJSDate()` converts to native Date for Drizzle queries when needed

#### 2. Candidate Slot Generation (Luxon-Safe)

```typescript
import { DateTime } from "luxon";

export function generateCandidateSlotsUTC(
  windowStartInTZ: DateTime,
  windowEndInTZ: DateTime,
  workingHours: WorkingHours[],
  settings: OrganizerSettings,
): CandidateSlot[] {
  const slots: CandidateSlot[] = [];
  const timezone = settings.workingTimezone;

  // Iterate through each calendar day in organizer's timezone
  let currentDayInTZ = windowStartInTZ;

  while (currentDayInTZ < windowEndInTZ) {
    // Get day-of-week (0=Sunday, 1=Monday, ... 6=Saturday) in organizer's timezone
    const dayOfWeek = currentDayInTZ.weekday === 7 ? "0" : currentDayInTZ.weekday.toString();

    // Find working hours for this day
    const dayWorkingHours = workingHours.filter((wh) => wh.dayOfWeek === dayOfWeek && wh.isActive);

    // Generate slots for each working hour block
    for (const wh of dayWorkingHours) {
      // Parse start/end times (stored as "HH:mm" strings)
      const [startHour, startMin] = wh.startTime.split(":").map(Number);
      const [endHour, endMin] = wh.endTime.split(":").map(Number);

      // Create working hour boundaries in organizer's timezone
      const workStartInTZ = currentDayInTZ.set({
        hour: startHour,
        minute: startMin,
        second: 0,
        millisecond: 0,
      });

      const workEndInTZ = currentDayInTZ.set({
        hour: endHour,
        minute: endMin,
        second: 0,
        millisecond: 0,
      });

      // Generate discrete slots within this working hour block
      let slotStartInTZ = workStartInTZ;

      while (slotStartInTZ.plus({ minutes: settings.defaultMeetingDuration }) <= workEndInTZ) {
        const slotEndInTZ = slotStartInTZ.plus({ minutes: settings.defaultMeetingDuration });

        // Convert slot times to UTC
        const slotStartUTC = slotStartInTZ.toUTC();
        const slotEndUTC = slotEndInTZ.toUTC();

        slots.push({
          startTimeUTC: slotStartUTC,
          endTimeUTC: slotEndUTC,
          duration: settings.defaultMeetingDuration,
        });

        slotStartInTZ = slotEndInTZ;
      }
    }

    // Move to next day
    currentDayInTZ = currentDayInTZ.plus({ days: 1 });
  }

  return slots;
}
```

#### 3. Blackout Date Filtering

```typescript
import { DateTime } from "luxon";

export function filterSlotsByBlackoutDates(
  candidateSlots: CandidateSlot[],
  blackoutDates: BlackoutDates[],
  timezone: string,
): CandidateSlot[] {
  return candidateSlots.filter((slot) => {
    // Convert slot to organizer's timezone to check day
    const slotInTZ = slot.startTimeUTC.setZone(timezone);
    const slotDay = slotInTZ.startOf("day");

    // Check if slot falls on any blackout date
    return !blackoutDates.some((blackout) => {
      // Convert blackout date (UTC) to organizer's timezone
      const blackoutInTZ = DateTime.fromJSDate(blackout.date).setZone(timezone);
      const blackoutDay = blackoutInTZ.startOf("day");

      // Compare day boundaries
      return slotDay.equals(blackoutDay);
    });
  });
}
```

#### 4. Buffer Time Application

```typescript
import { DateTime } from "luxon";

export function applyBufferTimes(
  bookings: Booking[],
  settings: OrganizerSettings,
): BufferedBooking[] {
  return bookings.map((booking) => {
    // Convert to DateTime for easier manipulation
    const startUTC = DateTime.fromJSDate(booking.startTime).toUTC();
    const endUTC = DateTime.fromJSDate(booking.endTime).toUTC();

    return {
      ...booking,
      bufferedStartUTC: startUTC.minus({ minutes: settings.preBookingBuffer }),
      bufferedEndUTC: endUTC.plus({ minutes: settings.postBookingBuffer }),
      originalStartUTC: startUTC,
      originalEndUTC: endUTC,
    };
  });
}
```

#### 5. Collision Filtering

```typescript
import { DateTime } from "luxon";

export function filterCollidingSlots(
  candidateSlots: CandidateSlot[],
  bufferedBookings: BufferedBooking[],
): CandidateSlot[] {
  return candidateSlots.filter((slot) => {
    // Check if slot collides with any buffered booking
    return !bufferedBookings.some((booking) => {
      return isSlotCollidingWithBooking(slot, booking);
    });
  });
}

function isSlotCollidingWithBooking(slot: CandidateSlot, booking: BufferedBooking): boolean {
  // All times are DateTime objects in UTC
  const slotStart = slot.startTimeUTC;
  const slotEnd = slot.endTimeUTC;
  const bookingStart = booking.bufferedStartUTC;
  const bookingEnd = booking.bufferedEndUTC;

  // Overlap occurs if slot starts before booking ends AND ends after booking starts
  return slotStart < bookingEnd && slotEnd > bookingStart;
}
```

#### 6. Business Rules Application

```typescript
import { DateTime } from "luxon";

export function applyBusinessRulesToSlots(
  availableSlots: CandidateSlot[],
  settings: OrganizerSettings,
): CandidateSlot[] {
  const nowUTC = DateTime.now().toUTC();
  const minNoticeUTC = nowUTC.plus({ hours: settings.minBookingNotice });

  return availableSlots.filter((slot) => {
    // Filter slots entirely in the past
    if (slot.endTimeUTC <= nowUTC) return false;

    // Filter slots that don't meet minimum notice requirement
    if (slot.startTimeUTC < minNoticeUTC) return false;

    // Note: max advance booking is already handled by window generation

    return true;
  });
}
```

## Type Definitions

```typescript
interface CandidateSlot {
  startTimeUTC: DateTime; // UTC timestamp for storage
  endTimeUTC: DateTime; // UTC timestamp for storage
  duration: number; // Minutes
}

interface BufferedBooking extends Booking {
  bufferedStartUTC: DateTime; // Start minus pre-buffer
  bufferedEndUTC: DateTime; // End plus post-buffer
  originalStartUTC: DateTime; // Original booking start
  originalEndUTC: DateTime; // Original booking end
}

interface AvailableSlot {
  startTime: Date; // UTC (JS Date for DB)
  endTime: Date; // UTC (JS Date for DB)
  duration: number; // Minutes
  timezone: string; // Organizer's timezone (for reference)
  available: boolean;
}

interface TimeWindow {
  startInTZ: DateTime; // Window start in organizer's timezone
  endInTZ: DateTime; // Window end in organizer's timezone
  startUTC: DateTime; // Window start in UTC
  endUTC: DateTime; // Window end in UTC
}
```

## API Layer Integration

### Server Function

The Availability Engine is exposed through the `getAvailableSlotsByUsername` server function:

```typescript
export const getAvailableSlotsByUsername = createServerFn({ method: "GET" })
  .inputValidator(getAvailableSlotsByUsernameSchema)
  .handler(async ({ data }) => {
    const { username, startDate, endDate } = data;

    // Get user by username
    const userResult = await getUserByUsername(username);
    if (!userResult || userResult.length === 0) {
      throw notFound();
    }

    const userId = userResult[0].id;

    // Calculate available slots for the user
    const userSlots = await calculateAvailableSlots(userId);

    // Filter by date range if provided
    let filteredSlots = userSlots.slots;
    if (startDate || endDate) {
      filteredSlots = filteredSlots.filter((slot) => {
        const slotStart = new Date(slot.startTime);
        if (startDate && slotStart < new Date(startDate)) return false;
        if (endDate && slotStart > new Date(endDate)) return false;
        return true;
      });
    }

    return {
      username,
      settings: userSlots.settings,
      slots: filteredSlots.map((slot) => ({
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        duration: slot.duration,
        timezone: slot.timezone,
        available: slot.available,
      })),
    };
  });
```

### Input Schema

```typescript
export const getAvailableSlotsByUsernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  startDate: z.iso.datetime().optional(), // ISO date string
  endDate: z.iso.datetime().optional(), // ISO date string
});
```

## Performance Optimizations

### Database Query Optimization

```typescript
async function getBookingsByOrganizerInDateRange(
  organizerId: string,
  startDateUTC: DateTime,
  endDateUTC: DateTime,
): Promise<Booking[]> {
  // Convert DateTime to native Date for Drizzle
  const startDate = startDateUTC.toJSDate();
  const endDate = endDateUTC.toJSDate();

  return db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.organizerId, organizerId),
        gte(bookingsTable.startTime, startDate),
        lte(bookingsTable.startTime, endDate),
        isNull(bookingsTable.deletedAt),
      ),
    );
}
```

**Optimizations:**

- Composite index on (organizerId, startTime) required
- Filters for active bookings only
- Limits query to time window
- Parameterized queries prevent injection

### Parallel Data Fetching

All supporting data is fetched in parallel to minimize latency:

```typescript
const [workingHours, blackoutDates, existingBookings] = await Promise.all([
  getWorkingHoursByUserId(organizerId),
  getBlackoutDatesByUserIdAndDateRange(organizerId, startUTC.toJSDate(), endUTC.toJSDate()),
  getBookingsByOrganizerInDateRange(organizerId, startUTC.toJSDate(), endUTC.toJSDate()),
]);
```

## Edge Cases and Solutions

### Overlapping Working Hours

```typescript
function mergeOverlappingWorkingHours(workingHours: WorkingHours[]): WorkingHours[] {
  // Group by day of week
  const byDay = new Map<string, WorkingHours[]>();

  for (const wh of workingHours) {
    if (!byDay.has(wh.dayOfWeek)) {
      byDay.set(wh.dayOfWeek, []);
    }
    byDay.get(wh.dayOfWeek)!.push(wh);
  }

  // For each day, merge overlapping ranges
  const merged: WorkingHours[] = [];

  for (const [dayOfWeek, hours] of byDay.entries()) {
    const sorted = hours.sort((a, b) => {
      const aStart = a.startTime.localeCompare(b.startTime);
      return aStart !== 0 ? aStart : a.endTime.localeCompare(b.endTime);
    });

    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];

      // Check if ranges overlap (comparing HH:mm strings)
      if (next.startTime <= current.endTime) {
        // Merge: extend current range to include next
        current.endTime = next.endTime > current.endTime ? next.endTime : current.endTime;
      } else {
        merged.push(current);
        current = { ...next };
      }
    }

    merged.push(current);
  }

  return merged;
}
```

### Working Hours Spanning Midnight

Working hours should not span midnight in the schema. If needed, store as two separate entries for different days:

- Day 1: 22:00 to 23:59:59
- Day 2: 00:00 to 02:00

### Timezones with Half-Hour Offsets

Luxon handles all IANA timezone offsets automatically, including:

- UTC+5:30 (India)
- UTC+9:45 (Australia/Eucla)
- UTC+5:45 (Nepal)

No special handling is needed beyond using Luxon consistently.

## Integration with Booking System

The Availability Engine is tightly integrated with the Booking System:

1. **Pre-booking Validation**: The Booking System calls the Availability Engine to validate slot availability before creating a booking
2. **Double-Check Pattern**: After acquiring a Redis lock, the Booking System recalculates availability to ensure the slot is still available
3. **Consistent Timezone Handling**: Both systems use Luxon for all timezone operations, ensuring consistency

```typescript
// In booking creation service
const { slots } = await calculateAvailableSlots(organizerId);

// Check if the requested slot is still available
const isSlotAvailable = slots.some((slot) => {
  const slotStart = new Date(slot.startTime);
  const slotEnd = new Date(slot.endTime);
  return slotStart.getTime() === startTime.getTime() && slotEnd.getTime() === endTime.getTime();
});

if (!isSlotAvailable) {
  return { error: "This time slot is no longer available" };
}
```
