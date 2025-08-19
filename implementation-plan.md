# POC Database Management Implementation Plan
*Converting Dashboard App from Raw SQL to Prisma with Database Management*

## Overview

This plan converts the existing Next.js dashboard POC from raw SQL queries to Prisma ORM, while adding database branching capabilities and a CLI management tool. The work is structured for Claude Code execution with clear, incremental steps.

## Prerequisites

- Current POC has all SQL in `app/lib/data.ts`
- Schema types defined in `app/lib/definitions.ts`
- Single Neon database instance
- No real users (safe for big-bang migration)

## Phase 1: Database Branching Setup
*Goal: Create separate dev/staging environments*

### Task 1.1: Create Database Branches (Manual)
**Duration**: 15 minutes  
**Tool**: Neon Web Console

**Steps**:
1. Log into Neon console
2. Create branch `staging` from `main`
3. Create branch `dev` from `main`
4. Document connection strings for each environment

**Deliverable**: Three database environments with connection strings

### Task 1.2: Environment Configuration
**Duration**: 30 minutes  
**Claude Code Prompt**:

```
Set up environment-specific database configuration for a Next.js app. 

Current setup:
- Single DATABASE_URL in .env.local
- Need to support dev/staging/production environments

Requirements:
1. Create environment configuration system
2. Add new env vars for each database branch
3. Update any existing database connection code to use environment-aware URLs
4. Create .env.example with all required variables

Files to modify/create:
- .env.local (add new DATABASE_URLs)
- .env.example 
- app/lib/config.ts (new file for environment management)
- Any existing database connection code

Make sure the default behavior uses the existing DATABASE_URL for backward compatibility.
```

## Phase 2: Prisma Setup and Schema Generation
*Goal: Set up Prisma and generate schema from existing TypeScript definitions*

### Task 2.1: Prisma Installation and Initialization
**Duration**: 20 minutes  
**Claude Code Prompt**:

```
Install and initialize Prisma in this Next.js project.

Current state:
- Raw SQL queries in app/lib/data.ts
- TypeScript types in app/lib/definitions.ts
- PostgreSQL database on Neon

Tasks:
1. Install Prisma packages (@prisma/client, prisma)
2. Initialize Prisma (npx prisma init)
3. Configure prisma/schema.prisma for PostgreSQL
4. Add Prisma scripts to package.json
5. Add prisma/ to .gitignore appropriately

Set up the basic configuration but don't generate models yet - we'll do that in the next step.
```

### Task 2.2: Schema Conversion
**Duration**: 45 minutes  
**Claude Code Prompt**:

```
Convert TypeScript type definitions to Prisma schema models.

Source file: app/lib/definitions.ts
Target: prisma/schema.prisma

Requirements:
1. Analyze the TypeScript types in definitions.ts
2. Create equivalent Prisma models with proper relationships
3. Use appropriate Prisma field types and constraints
4. Add necessary indexes for performance
5. Follow Prisma naming conventions (camelCase for fields, snake_case for database)
6. Add proper @@map directives for table names

Important:
- Preserve all existing relationships between entities
- Ensure the schema can generate TypeScript types that match current usage
- Add created_at/updated_at fields where appropriate
- Use UUIDs for primary keys if that's the current pattern

After creating the schema, generate the Prisma client but don't run migrations yet.
```

### Task 2.3: Database Introspection and Validation
**Duration**: 30 minutes  
**Claude Code Prompt**:

```
Validate the Prisma schema against the existing database.

Tasks:
1. Use Prisma introspection to see current database structure: npx prisma db pull
2. Compare introspected schema with our hand-written schema
3. Identify any discrepancies
4. Update our schema to match the existing database exactly
5. Generate Prisma client: npx prisma generate

Goal: Ensure our Prisma schema perfectly matches the existing database before we start the migration.

If there are major discrepancies, document them and suggest the best approach to resolve them.
```

## Phase 3: SQL to Prisma Migration
*Goal: Replace all raw SQL with Prisma queries*

### Task 3.1: Create Prisma Database Client
**Duration**: 20 minutes  
**Claude Code Prompt**:

```
Create a shared Prisma database client for the application.

Requirements:
1. Create app/lib/db.ts that exports a configured Prisma client
2. Add proper connection configuration for different environments
3. Add appropriate logging for development
4. Handle connection errors gracefully
5. Export common types from @prisma/client

This will be the new database interface that replaces direct SQL usage.
```

### Task 3.2: Convert Data Access Functions (Part 1)
**Duration**: 60 minutes  
**Claude Code Prompt**:

```
Convert the first half of SQL functions in app/lib/data.ts to use Prisma.

Current file: app/lib/data.ts (contains raw SQL queries)
New approach: Use Prisma client from app/lib/db.ts

Process:
1. Import the new Prisma client
2. Convert each SQL function to equivalent Prisma query
3. Maintain exact same function signatures and return types
4. Test each conversion by comparing the generated SQL (use Prisma's logging)
5. Add error handling

Focus on the simpler queries first (fetches, basic inserts/updates).
Leave complex queries with JOINs and aggregations for the next task.

Do not change any files outside of app/lib/data.ts yet - we want to maintain the same API.
```

### Task 3.3: Convert Data Access Functions (Part 2)
**Duration**: 60 minutes  
**Claude Code Prompt**:

```
Convert the remaining complex SQL functions in app/lib/data.ts to use Prisma.

Focus on:
1. Complex queries with JOINs
2. Aggregation functions
3. Any raw SQL that couldn't be converted in Part 1
4. Performance-critical queries

For each function:
1. Convert to Prisma syntax using include/select for relations
2. Verify the query performance is acceptable
3. If Prisma can't handle a query efficiently, use $queryRaw as a fallback
4. Document any trade-offs or compromises

Goal: Complete conversion of app/lib/data.ts to Prisma while maintaining all existing functionality.
```

### Task 3.4: Remove SQL Dependencies
**Duration**: 15 minutes  
**Claude Code Prompt**:

```
Clean up SQL-related dependencies and imports.

Tasks:
1. Remove the raw SQL client import from app/lib/data.ts
2. Remove any unused SQL-related packages from package.json
3. Update any remaining SQL imports throughout the codebase
4. Remove the /app/query/route.ts debugging endpoint (mentioned as anti-pattern)

Verify that the application still works with only Prisma database access.
```

## Phase 4: Database Management CLI
*Goal: Create CLI tool for database operations*

### Task 4.1: CLI Project Structure
**Duration**: 30 minutes  
**Claude Code Prompt**:

```
Create a database management CLI tool structure.

Requirements:
1. Create apps/db-manager/ directory
2. Set up package.json with CLI configuration
3. Install dependencies: commander, inquirer, chalk
4. Create basic CLI entry point with --help functionality
5. Set up TypeScript configuration
6. Create executable script in bin/

Structure:
apps/db-manager/
├── src/
│   ├── cli/
│   │   ├── index.ts (main CLI entry)
│   │   └── commands/ (individual commands)
│   ├── core/ (business logic)
│   └── utils/ (helpers)
├── bin/db-manager
└── package.json

Initial CLI should just show help and version, no actual functionality yet.
```

### Task 4.2: Database Reset Command
**Duration**: 45 minutes  
**Claude Code Prompt**:

```
Implement the database reset command for the CLI.

Requirements:
1. Create reset command that can target dev/staging (never production)
2. Add safety confirmations
3. Implement the reset logic:
   - Connect to target environment database
   - Clear all data in correct order (respecting foreign keys)
   - Optionally reseed with baseline data
4. Add proper error handling and user feedback

Command usage: `db-manager reset dev`

Use the Prisma client from the main app to ensure consistency.
Make sure it connects to the correct environment database.
```

### Task 4.3: Migration Command
**Duration**: 30 minutes  
**Claude Code Prompt**:

```
Add database migration command to the CLI.

Requirements:
1. Command to run Prisma migrations on specific environments
2. Support for --dry-run flag to preview changes
3. Migration status checking
4. Proper error handling for failed migrations

Command usage: 
- `db-manager migrate dev`
- `db-manager migrate staging --dry-run`

This should use Prisma's migration system under the hood.
```

### Task 4.4: Environment Management Commands
**Duration**: 30 minutes  
**Claude Code Prompt**:

```
Add environment and status commands to the CLI.

Commands to implement:
1. `db-manager status` - Show status of all environments
2. `db-manager env list` - List available environments
3. `db-manager env switch <env>` - Switch local development to different environment

Each command should:
- Show database connection status
- Display recent migration history
- Show basic metrics (table counts, etc.)
- Use colored output for better UX

Add these commands to the existing CLI structure.
```

## Phase 5: Testing and Validation
*Goal: Ensure everything works correctly*

### Task 5.1: Application Testing
**Duration**: 30 minutes  
**Claude Code Prompt**:

```
Test the converted application thoroughly.

Testing checklist:
1. Start the Next.js application
2. Test all major user flows that involve database operations
3. Check that all pages load correctly
4. Verify that data displays properly
5. Test any forms/mutations to ensure they still work
6. Check browser network tab for any errors

If any issues are found:
1. Document them clearly
2. Trace back to the likely cause in the Prisma conversion
3. Fix the issues

Goal: Confirm that the application works identically to before the conversion.
```

### Task 5.2: CLI Testing
**Duration**: 20 minutes  
**Claude Code Prompt**:

```
Test all CLI commands to ensure they work correctly.

Test scenarios:
1. Reset dev database and verify it's empty
2. Run migrations on dev environment
3. Check status commands show correct information
4. Verify error handling (try to reset production, invalid commands, etc.)
5. Test help text and command documentation

Document any issues and fix them.
Create a simple README for the CLI tool with usage examples.
```

### Task 5.3: Environment Switching Test
**Duration**: 15 minutes  
**Claude Code Prompt**:

```
Test environment switching functionality.

Test plan:
1. Switch local app to dev database
2. Verify it connects to the correct database
3. Switch to staging database
4. Confirm data isolation between environments
5. Document the process for switching environments

Create documentation for:
- How to switch between environments
- How to set up new environments
- Best practices for environment management
```

## Phase 6: Documentation and Cleanup
*Goal: Document the new system and clean up*

### Task 6.1: Migration Documentation
**Duration**: 30 minutes  
**Claude Code Prompt**:

```
Create comprehensive documentation for the new database system.

Documents to create:
1. README.md for the database management CLI
2. Database setup and environment guide
3. Prisma migration workflow documentation
4. Troubleshooting guide for common issues

Each document should include:
- Clear step-by-step instructions
- Command examples
- Common pitfalls and solutions
- Links to relevant Prisma/Neon documentation
```

### Task 6.2: Code Cleanup and Best Practices
**Duration**: 20 minutes  
**Claude Code Prompt**:

```
Final cleanup and optimization.

Tasks:
1. Review all new code for best practices
2. Add appropriate TypeScript types where missing
3. Ensure consistent error handling patterns
4. Add JSDoc comments to public functions
5. Remove any debugging code or console.logs
6. Optimize any inefficient Prisma queries found during testing

Goal: Leave the codebase in a clean, maintainable state.
```

## Summary

**Total Estimated Duration**: ~7-8 hours of focused work

**Key Deliverables**:
- Multi-environment database setup (dev/staging/prod)
- Complete migration from raw SQL to Prisma
- Database management CLI tool
- Comprehensive documentation

**Risk Mitigation**:
- Each phase builds incrementally
- Big-bang migration is safe due to no real users
- CLI provides easy rollback via database reset
- Extensive testing phase ensures functionality preservation

**Success Criteria**:
- Application functions identically to before
- Database operations are more maintainable
- Easy environment management via CLI
- Clear documentation for future development

## Post-Implementation

After completion, you'll have:
1. A robust foundation for database management
2. Experience with Prisma that transfers to larger projects
3. Understanding of environment isolation patterns
4. CLI tooling experience for database operations

This foundation will be valuable when building the full Sortie architecture later.