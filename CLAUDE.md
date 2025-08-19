# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Next.js 15 dashboard application built with the App Router, following the official Next.js Learn course curriculum. It's a full-stack application demonstrating modern web development patterns including authentication, database operations, and server actions.

## Development Commands
- `npm run dev` - Start development server with Turbopack (recommended)
- `npm run build` - Build the application for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint to check code quality

## Architecture

### Database Layer
- **Database**: PostgreSQL with SSL required
- **Connection**: Direct SQL queries using the `postgres` library (not an ORM)
- **Environment Variable**: `POSTGRES_URL` required for database connection
- **Data Layer**: Located in `app/lib/data.ts` - contains all database query functions
- **Schema**: Core entities are Users, Customers, Invoices, and Revenue

### Authentication
- **Provider**: NextAuth.js v5 (beta) with credentials provider
- **Configuration**: Split between `auth.config.ts` (shared config) and `auth.ts` (full setup)
- **Password Hashing**: bcrypt for secure password storage
- **Middleware**: `middleware.ts` protects `/dashboard/*` routes
- **Login Flow**: Custom login form at `/login` with server-side validation

### App Router Structure
- **Layout Pattern**: Nested layouts with `/app/layout.tsx` (root) and `/app/dashboard/layout.tsx` (dashboard-specific)
- **Route Groups**: Uses `(overview)` route group for default dashboard page
- **Dynamic Routes**: `[id]` segments for individual invoice editing
- **Parallel Routes**: Not currently used but structure supports them

### Server Actions & Forms
- **Location**: All server actions in `app/lib/actions.ts`
- **Validation**: Zod schemas for form validation with detailed error handling
- **State Management**: Uses `useFormState` and `useFormStatus` for form UX
- **Cache Management**: `revalidatePath()` after mutations, `redirect()` for navigation

### UI Component Structure
- **Design System**: Tailwind CSS with custom color palette and grid extensions
- **Component Organization**: Organized by feature in `/app/ui/` directory
  - `dashboard/` - Dashboard-specific components (nav, cards, charts)
  - `invoices/` - Invoice management components (forms, tables, pagination)
  - `customers/` - Customer-related components
- **Icons**: Heroicons React library
- **Fonts**: Custom Inter font loading via `app/ui/fonts.ts`

### Key Patterns
- **Data Fetching**: Server components fetch data directly in page components
- **Error Boundaries**: `error.tsx` files for route-level error handling
- **Loading States**: `loading.tsx` files and skeleton components for better UX
- **Search & Pagination**: URL search params for stateful search with pagination
- **TypeScript**: Comprehensive type definitions in `app/lib/definitions.ts`

### Environment Setup
- Requires `POSTGRES_URL` environment variable
- NextAuth requires additional auth-related environment variables (not shown in codebase)
- Development uses `next dev --turbopack` for faster builds

### Testing
No test framework is currently configured. If adding tests, check if there are existing test commands or ask user for preferred testing approach.

## Data Flow
1. **Pages** (Server Components) fetch data using functions from `app/lib/data.ts`
2. **Forms** submit to Server Actions in `app/lib/actions.ts`
3. **Server Actions** validate with Zod, interact with database, revalidate cache, and redirect
4. **Authentication** handled by NextAuth middleware and server actions
5. **Navigation** primarily handled through Next.js `redirect()` after mutations

## Important Notes
- All database operations use raw SQL queries, not an ORM
- Form validation errors are returned as part of form state, not thrown
- Authentication state is managed by NextAuth and available throughout the app
- The app uses the new Next.js App Router patterns consistently

## Documentation
- Check the `docs/` directory for additional reference materials, best practices, and architectural guidance when needed