# Changelog

All notable changes to the Meeting Scheduler application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-21

### Added
- Three-layer architecture implementation for authentication system
- Separation of server functions from UI components
- Centralized authentication server functions in `src/functions/auth/`
- Barrel exports for server functions in `src/functions/index.ts`
- Authentication middleware server function for protected routes
- Comprehensive architecture documentation

### Changed
- **Breaking**: Refactored login server function from `src/routes/(auth)/login/index.tsx` to `src/functions/auth/login.ts`
- **Breaking**: Refactored register server function from `src/routes/(auth)/register/index.tsx` to `src/functions/auth/register.ts`
- Updated login component to use `useServerFn` hook instead of direct server function call
- Updated register component to use `useServerFn` hook instead of direct server function call
- Removed server function definitions from route components

### Refactored
- Extracted authentication server functions from UI components to dedicated API layer
- Improved separation of concerns between View, API, and Service layers
- Enhanced code organization following the three-layer architecture pattern
- Improved maintainability and testability of authentication functionality

### Documentation
- Added `docs/ARCHITECTURE.md` with comprehensive explanation of the three-layer architecture
- Added `docs/CHANGELOG.md` to track all changes, refactors, and features
- Documented authentication flow and patterns for future development

### Technical Details
- Server functions now use consistent input validation with Zod schemas
- Authentication logic is properly separated between API layer (transport) and Service layer (business logic)
- UI components are now "dumb" and only handle presentation and user interaction
- All authentication operations follow the established patterns for future feature development

## [0.0.1] - 2025-11-21

### Added
- Initial project setup with TanStack Start
- Basic authentication UI (login/register forms)
- User registration and login functionality
- Session management with Redis
- Database schema for users
- Basic middleware for authentication checking
- Project structure and configuration

---

## Versioning Guidelines

### Major Version (X.0.0)
- Breaking changes to the API or architecture
- Major refactorings that require updates to existing code
- Changes that require database migrations
- Removal of existing features

### Minor Version (0.X.0)
- New features that don't break existing functionality
- New server functions and service methods
- New UI components and pages
- Additional middleware functionality

### Patch Version (0.0.X)
- Bug fixes and small improvements
- Documentation updates
- Performance optimizations
- Code refactoring that doesn't change public APIs

---

## Change Categories

### Added
- New features and functionality
- New components, server functions, or services
- New documentation

### Changed
- Modifications to existing functionality
- Updates to implementation details
- Non-breaking API changes

### Deprecated
- Features that will be removed in future versions
- API changes with migration path

### Removed
- Deleted features or functionality
- Breaking changes (should be major version)

### Fixed
- Bug fixes and error corrections
- Issues that were not working as intended

### Refactored
- Code restructuring without changing functionality
- Improvements to code organization and maintainability
- Architecture improvements

### Documentation
- Updates to existing documentation
- New documentation files
- API documentation improvements

### Security
- Security fixes and improvements
- Vulnerability patches
- Authentication and authorization enhancements
