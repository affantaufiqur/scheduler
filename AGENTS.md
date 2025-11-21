# Project Context: Online Meeting Scheduler

## 1. Project Overview

We are building a meeting scheduler. The system prioritizes **data integrity** (preventing double-bookings) and **timezone accuracy**.

## 2. Tech Stack

- **Framework:** TanStack Start (React Server Components + Server Functions).
- **Language:** TypeScript (Strict mode).
- **Database:** PostgreSQL (via Drizzle ORM).
- **Infrastructure:** Redis (for Distributed Locking & Session Management).
- **Styling:** Tailwind CSS.
- **Date Handling:** `date-fns` + `date-fns-timezone` (Timezones are critical).

## 3. Coding Standards & Style

**Strictly adhere to these rules when generating code:**

### A. Control Flow

- **Early Returns:** Always use guard clauses to exit functions early.
- **No Nesting:** Avoid `else` blocks. If an `if` block returns, the code following it is implicitly the `else`.
- **Happy Path Last:** The main logic should be at the bottom indentation level (Level 0).

```typescript
// ❌ Bad (Nested)
const bookSlot = (user, time) => {
  if (user) {
    if (isValid(time)) {
       return db.insert(...);
    } else {
       throw Error("Invalid time");
    }
  }
}

// ✅ Good (Early Return)
const bookSlot = (user, time) => {
  if (!user) throw Error("Unauthorized");
  if (!isValid(time)) throw Error("Invalid time");

  return db.insert(...);
}
```

### B. React / State Management

- **No `useEffect`:** Do not use `useEffect` for data fetching or state synchronization.
  - **Derived State:** Calculate values directly in the render body.
  - **Events:** Handle side effects in Event Handlers (`onClick`, `onSubmit`), not effects.

### C. Date/Time Handling

- **Database:** Always store dates as `timestamp with time zone` (UTC).
- **Application:** Generate defaults (like `createdAt`) in the application layer (`new Date()`), not `defaultNow()` in SQL, to avoid migration/driver desync.
- **Display:** Convert to User's Local Timezone only at the very last step (in the React Component).

## 4. Architecture: The Service Pattern

Do not put business logic inside UI components or Server Function definitions.

1.  **The View (UI):** `src/routes/*`. Dumb components. Calls Server Functions.
2.  **The API (Transport):** `src/functions/*`. TanStack Server Functions. Validates Zod schemas, checks Auth, calls Service.
3.  **The Brain (Service):** `src/services/*`. Pure TypeScript. Contains the SQL queries, Redis locking, and algorithm logic.

## 5. Core Business Logic

### A. Availability Engine (The 14-Day Window)

To determine valid slots:

1.  **Fetch:** Organizer's `availability_slots` (Weekly template) + `blackout_dates`.
2.  **Filter:** Remove dates that match `blackout_dates`.
3.  **Subtract Bookings:** Remove time ranges that overlap with existing bookings in Postgres.
4.  **Subtract Buffers:**
    - Effective Occupied Time = `[BookingStart - PreBuffer, BookingEnd + PostBuffer]`.
5.  **Result:** A list of available UTC start times.

### B. Concurrency (Redis Locking)

**CRITICAL:** We must prevent race conditions.

- **Key Format:** `lock:booking:{organizerId}:{timestamp_ms}` (Lock the **Slot**, not the User).
- **Mechanism:** atomic `SET NX PX 10000`.
- **Flow:**
  1.  Acquire Lock.
  2.  If fail -> Throw "Slot Taken".
  3.  If success -> Check Postgres (Double check) -> Insert Booking -> Release Lock.

### C. Authentication

- **Method:** Hand-rolled Session based.
- **Storage:** Redis Key `session:{token}` -> Value `{ userId }`.
- **Transport:** HTTP-Only Cookie.

## 6. Database Schema (Mental Model)

- **Users:** Identity, Password Hash, Default Timezone.
- **OrganizerSettings:** Global rules (Buffer, Min Notice, Meeting Duration).
- **AvailabilitySlots:** Normalized weekly schedule (Mon 9-5, Tue 9-5).
  - _Columns:_ `day_of_week` (0-6), `start_time` (Time), `end_time` (Time).
- **BlackoutDates:** Specific dates the organizer is off.
- **Bookings:** The actual scheduled events.
  - _Indexes:_ Composite index on `(user_id, start_time)` is mandatory.

## 7. Environment

- **Current Date:** November 2025.
- **Testing:** All logic must be testable without a browser (Service layer tests).
