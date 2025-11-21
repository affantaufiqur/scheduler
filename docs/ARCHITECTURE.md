# Three-Layer Architecture for Meeting Scheduler

This document describes the three-layer architecture implemented in the meeting scheduler application to ensure separation of concerns, testability, and maintainability.

## Architecture Overview

The application follows a strict three-layer architecture:

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
│  │   Validation    │  │   Authentication│  │  Error       │ │
│  │   (Zod schemas) │  │   (Middleware)  │  │  Handling    │ │
│  │ (src/functions) │  │ (src/middleware)│  │(src/functions)│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Service Layer (Business Logic)               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Database       │  │     Redis       │  │  Core        │ │
│  │  Operations     │  │   Operations     │  │  Algorithms  │ │
│  │  (src/services) │  │  (src/services)  │  │(src/services)│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. View Layer (UI Components)
**Location**: `src/routes/*`

**Responsibilities**:
- Render UI components and handle user interactions
- Manage UI state (form inputs, loading states, etc.)
- Call server functions via `useServerFn` hook
- Display data returned from server functions
- Handle user navigation and routing

**Key Patterns**:
- No business logic in components
- Use `useServerFn` to call server functions
- Use `Route.useLoaderData()` for initial data
- Use `Route.useRouteContext()` for context from middleware

**Example**:
```tsx
function LoginComponent() {
  const loginFn = useServerFn(login);
  const navigate = useNavigate();
  
  const handleSubmit = async (data) => {
    const result = await loginFn({ data });
    if (result.error) {
      // Handle error
      return;
    }
    navigate({ to: "/app" });
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 2. API Layer (Server Functions)
**Location**: `src/functions/*`

**Responsibilities**:
- Define server functions with input validation
- Handle authentication and authorization
- Manage session cookies and redirects
- Call service layer functions
- Transform data for API consumption
- Handle error responses and HTTP status codes

**Key Patterns**:
- Use Zod schemas for input validation
- Use middleware for authentication/authorization
- Call service layer functions for business logic
- Return standardized response formats
- Handle errors appropriately for client consumption

**Example**:
```tsx
export const login = createServerFn({ method: "POST" })
  .inputValidator(loginSchema)
  .handler(async ({ data }) => {
    // Business logic is delegated to service layer
    const result = await loginUser(data);
    
    if (result.error) {
      return { error: "Invalid credentials" };
    }
    
    // Set authentication cookie
    setCookie("token", result.token, {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    
    return { error: null };
  });
```

### 3. Service Layer (Business Logic)
**Location**: `src/services/*`

**Responsibilities**:
- Implement core business logic and algorithms
- Handle database operations (PostgreSQL via Drizzle)
- Manage Redis operations (sessions, locking, caching)
- Implement timezone handling
- Ensure data integrity and consistency
- Implement concurrency control and locking

**Key Patterns**:
- Pure TypeScript functions without framework dependencies
- Database operations via Drizzle ORM
- Redis operations for sessions and distributed locking
- Early returns and guard clauses for clean control flow
- No direct HTTP framework dependencies

**Example**:
```tsx
export async function loginUser(userData: LoginData): Promise<LoginResult> {
  // Guard clauses for early returns
  if (!userData.email || !userData.password) {
    return { error: "Email and password required" };
  }
  
  // Database operations
  const user = await getUserByEmail(userData.email);
  if (!user) {
    return { error: "Invalid credentials" };
  }
  
  // Password verification
  const isValid = await argon2.verify(user.password, userData.password);
  if (!isValid) {
    return { error: "Invalid credentials" };
  }
  
  // Session management
  const token = createSessionToken();
  await redis.set(`session:${token}`, user.id, { EX: SESSION_EXPIRY });
  
  return { token, user: { id: user.id, username: user.username } };
}
```

## Data Flow

1. **User Interaction**: User interacts with UI component
2. **Server Function Call**: Component calls server function via `useServerFn`
3. **Input Validation**: Server function validates input using Zod schemas
4. **Authentication**: Middleware checks authentication and authorization
5. **Service Call**: Server function calls service layer for business logic
6. **Database Operations**: Service layer performs database/Redis operations
7. **Response**: Data flows back through layers to the UI

## Benefits of This Architecture

### 1. Separation of Concerns
- Clear boundaries between UI, API, and business logic
- Each layer has a single, well-defined responsibility
- Easy to understand and maintain

### 2. Testability
- Service layer can be unit tested independently
- Server functions can be tested with mock services
- UI components can be tested with mocked server functions

### 3. Reusability
- Service functions can be called from multiple server functions
- Server functions can be called from multiple UI components
- Common validation schemas can be reused

### 4. Maintainability
- Changes to business logic only affect the service layer
- UI changes don't impact business logic
- API changes don't require UI component modifications

### 5. Security
- Authentication and authorization are centralized
- Input validation happens at the API boundary
- Sensitive operations are isolated in the service layer

## Implementation Guidelines

### File Organization
```
src/
├── functions/           # API Layer
│   ├── auth/           # Authentication server functions
│   ├── booking/        # Booking related server functions
│   ├── availability/   # Availability calculation server functions
│   └── index.ts        # Barrel exports
├── services/           # Service Layer
│   ├── auth.ts         # Authentication business logic
│   ├── booking.ts      # Booking business logic
│   ├── availability.ts # Availability calculation logic
│   └── timezone.ts     # Timezone handling utilities
├── routes/             # View Layer
│   ├── (auth)/         # Authentication routes
│   ├── app/            # Protected app routes
│   └── public/         # Public routes
└── middleware/         # Shared middleware
    └── auth.ts         # Authentication middleware
```

### Naming Conventions
- **Server Functions**: Descriptive names matching the action (`login`, `register`, `bookSlot`)
- **Service Functions**: Domain-specific names (`loginUser`, `createBooking`, `calculateAvailability`)
- **Schemas**: Descriptive names with `Schema` suffix (`loginSchema`, `bookingSchema`)
- **Types**: Descriptive names with appropriate suffixes (`LoginData`, `BookingResult`)

### Error Handling
- Service layer returns structured error objects
- Server functions transform errors for client consumption
- UI components display user-friendly error messages
- Use early returns and guard clauses throughout

This architecture provides a solid foundation for building a robust, scalable meeting scheduler application with clear separation of concerns and excellent maintainability.
