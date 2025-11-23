# Project Context: Online Meeting Scheduler

## 1. Project Overview

We are building a meeting scheduler. The system prioritizes **data integrity** (preventing double-bookings) and **timezone accuracy**.

## 2. Tech Stack

- **Framework:** TanStack Start (React Server Components + Server Functions).
- **Language:** TypeScript (Strict mode).
- **Database:** PostgreSQL (via Drizzle ORM).
- **Infrastructure:** Redis (for Distributed Locking & Session Management).
- **Styling:** Tailwind CSS.
- **Date Handling:** `luxon` (Timezones are critical).

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

### D. Tanstack Start Server Functions Pattern

## What are Server Functions?

Server functions let you define server-only logic that can be called from anywhere in your application - loaders, components, hooks, or other server functions. They run on the server but can be invoked from client code seamlessly.

```tsx
import { createServerFn } from "@tanstack/react-start";

export const getServerTime = createServerFn().handler(async () => {
  // This runs only on the server
  return new Date().toISOString();
});

// Call from anywhere - components, loaders, hooks, etc.
const time = await getServerTime();
```

Server functions provide server capabilities (database access, environment variables, file system) while maintaining type safety across the network boundary.

## Basic Usage

Server functions are created with `createServerFn()` and can specify HTTP method:

```tsx
import { createServerFn } from "@tanstack/react-start";

// GET request (default)
export const getData = createServerFn().handler(async () => {
  return { message: "Hello from server!" };
});

// POST request
export const saveData = createServerFn({ method: "POST" }).handler(async () => {
  // Server-only logic
  return { success: true };
});
```

## Where to Call Server Functions

Call server functions from:

- **Route loaders** - Perfect for data fetching
- **Components** - Use with `useServerFn()` hook
- **Other server functions** - Compose server logic
- **Event handlers** - Handle form submissions, clicks, etc.

```tsx
// In a route loader
export const Route = createFileRoute("/posts")({
  loader: () => getPosts(),
});

// In a component
function PostList() {
  const getPosts = useServerFn(getServerPosts);

  const { data } = useQuery({
    queryKey: ["posts"],
    queryFn: () => getPosts(),
  });
}
```

## Parameters & Validation

Server functions accept a single `data` parameter. Since they cross the network boundary, validation ensures type safety and runtime correctness.

### Basic Parameters

```tsx
import { createServerFn } from "@tanstack/react-start";

export const greetUser = createServerFn({ method: "GET" })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    return `Hello, ${data.name}!`;
  });

await greetUser({ data: { name: "John" } });
```

### Validation with Zod

For robust validation, use schema libraries like Zod:

```tsx
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const UserSchema = z.object({
  name: z.string().min(1),
  age: z.number().min(0),
});

export const createUser = createServerFn({ method: "POST" })
  .inputValidator(UserSchema)
  .handler(async ({ data }) => {
    // data is fully typed and validated
    return `Created user: ${data.name}, age ${data.age}`;
  });
```

### Form Data

Handle form submissions with FormData:

```tsx
export const submitForm = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("Expected FormData");
    }

    return {
      name: data.get("name")?.toString() || "",
      email: data.get("email")?.toString() || "",
    };
  })
  .handler(async ({ data }) => {
    // Process form data
    return { success: true };
  });
```

## Error Handling & Redirects

Server functions can throw errors, redirects, and not-found responses that are handled automatically when called from route lifecycles or components using `useServerFn()`.

### Basic Errors

```tsx
import { createServerFn } from "@tanstack/react-start";

export const riskyFunction = createServerFn().handler(async () => {
  if (Math.random() > 0.5) {
    throw new Error("Something went wrong!");
  }
  return { success: true };
});

// Errors are serialized to the client
try {
  await riskyFunction();
} catch (error) {
  console.log(error.message); // "Something went wrong!"
}
```

### Redirects

Use redirects for authentication, navigation, etc:

```tsx
import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";

export const requireAuth = createServerFn().handler(async () => {
  const user = await getCurrentUser();

  if (!user) {
    throw redirect({ to: "/login" });
  }

  return user;
});
```

### Not Found

Throw not-found errors for missing resources:

```tsx
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";

export const getPost = createServerFn()
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const post = await db.findPost(data.id);

    if (!post) {
      throw notFound();
    }

    return post;
  });
```

## 4. Architecture: The Service Pattern

Do not put business logic inside UI components or Server Function definitions.
Do not create any migration files

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
