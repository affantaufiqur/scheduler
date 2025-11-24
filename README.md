# Meeting Scheduler

## How to book
Make sure that you've created a user, if you already has user registered, you can use the username of that account to make bookings

example:
https://localhost:3000/affan -> this will open the booking page for user with username "affan"

## Prerequisites

- Node.js v20+
- pnpm v9+
- Docker & Docker Compose

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Create `.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=3000

DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=postgres
```

### 3. Start Services

```bash
docker compose up -d
```

### 4. Run Migrations

```bash
pnpm db:migrate
```

## Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm serve
```

App runs at `http://localhost:3000`

## Architecture

**3-Layer Separation**

```
View (src/routes)
  ↓
API (src/functions) - Validation, Auth
  ↓
Service (src/service) - Business Logic, DB, Redis
```

**Concurrency Control**

- Redis locks prevent double-bookings
- Lock format: `lock:booking:{organizerId}:{timestamp}`
- Atomic `SET NX PX 10000` (10s expiry)

## Data Model

### users
- `id` (ULID), `username`, `email`, `password` (Argon2), `timezone`

### organizer_settings
- `userId` (FK), `workingTimezone`, `defaultMeetingDuration`
- `preBookingBuffer`, `postBookingBuffer`
- `minBookingNotice` (hours), `maxBookingAdvance` (days)

### working_hours
- `userId` (FK), `dayOfWeek` (0-6), `startTime`, `endTime`
- `isActive` - soft enable/disable

### blackout_dates
- `userId` (FK), `date`, `reason`

### bookings
- `organizerId` (FK), `attendantName`, `attendantEmail`
- `startTime`, `endTime` (UTC), `status`, `attendantTimezone`
- Index on `(organizerId, startTime)`

## Testing

```bash
pnpm test
```

Tests in `src/test/`:
- `availability.test.ts` - Core scheduling logic
- `utils/test-data-generators.ts` - Test factories

## Scripts

```bash
pnpm dev          # Development server
pnpm build        # Production build
pnpm test         # Run tests
pnpm format       # Format code
pnpm db:generate  # Generate migrations
pnpm db:migrate   # Apply migrations
```

## AI Usage
Almost most of the codebase was generated using AI, to make the LLM not stereed off course, I create an AGENTS.md file to guide the AI on how to behave while generating code.

### AI Tools
- [Droid](https://factory.ai/) + [GLM 4.6](https://z.ai/blog/glm-4.6) - This is the model that is mostly used to generate the code, I use the spec driven agentic approach using droid so that the LLM output what they are going to do before implement the code, if it's align with what i had in mind, then I let it generate the code. To verify the output, I read the code and use the app to make sure that it is working as intended, and also ask the LLM to write the docs on the reason they did certain things.
- [Copilot](https://github.com/features/copilot) - Using copilot to mostly fix syntax or type errors on editor level, by giving copilot the diagnostic. For the models, I use variation of claude sonnet 4.5, claude haiku 4.5 and grok code fast 1.
- [Gemini](https://aistudio.google.com/) - Used for asking general questions regarding architecture and best practices.

## Know Limitations / Issues
- The UI feels janky.
- Error message is not very friendly right now.
- Timezone and availability handling is really hard, and might have edge cases that are not covered. (DST, midnight bookings, etc)
- RPC style API, no REST endpoint.
- No seeder.
- Mobile UI is not optimized or checked.
- Deployment or CI/CD is not setup.

- No integration with calendar services like Google Calendar or Outlook.
- No email notifications for bookings yet.

## What's Next
- Revisit the availability logic to make sure it's solid, testable and maintainable.
- Improve the timezone and it's converstion better.
- Improve the UI/UX.
- Add email notifications for booking confirmations and reminders.
- Integrate with calendar services like Google Calendar and Outlook.
- Deploymend and CI/CD setup.
- Possibly make the service query able via REST.
