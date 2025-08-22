# Next.js App Router Best Practices
*Extracted from the Official Next.js App Router Tutorial (16 Chapters)*

## Project Structure & Organization

### File System Conventions

#### The `/app` Directory Structure
**Best Practice**: Organize code within `/app` using these subdirectories:
- `/app/lib` for data fetching and utility functions
- `/app/ui` for presentational components
- Route folders for pages

**Why**: This separation creates clear boundaries between routing logic, business logic, and presentation. Data fetching functions in `/lib` can be reused across routes, while `/ui` components remain pure and testable.

**Common Mistake**: Mixing data fetching logic directly in page components or scattering utility functions across route folders. This leads to code duplication and makes refactoring difficult when data sources change.

#### Colocation Strategy
**Best Practice**: Keep test files, styles, and supporting components directly alongside the routes they support within `/app`. Only `page.tsx` files create public routes.

**Why**: Related code stays together, making features self-contained and easier to maintain. You can safely add `utils.ts`, `helpers.test.ts`, or `components.tsx` files without accidentally creating routes.

**Common Mistake**: Creating a separate `/components` folder outside `/app` for all components. This breaks the connection between features and their components, making it harder to understand what code supports which routes.

## Routing Architecture

### Special File Conventions

#### Using `layout.tsx` Correctly
**Best Practice**: Use layouts for UI that genuinely needs to persist across navigation - navigation bars, sidebars, and wrapper elements. Each layout should have a clear, singular responsibility.

**Why**: Layouts don't re-render during navigation between their child routes, preserving expensive component state (like WebSocket connections or complex forms). This is a performance optimization, not just a code organization pattern.

**Common Mistake**: Creating layouts for every route folder even when no shared UI exists, or putting data fetching for child pages in parent layouts. Unnecessary layouts add complexity, and layout data fetching can create waterfalls since layouts and pages render sequentially.

#### Route Organization
**Best Practice**: Use folders to create route segments, with `page.tsx` defining the UI for each accessible route. Dynamic segments use `[paramName]` folder naming.

**Why**: The folder structure directly maps to URL structure, making routes discoverable by looking at the file system. No routing configuration means no route typos or configuration drift.

**Common Mistake**: Creating deeply nested route structures that mirror database relationships rather than user navigation patterns. URLs should be designed for users, not your data model.

## Data Fetching Patterns

### Server Components as Default

#### Direct Database Access
**Best Practice**: Fetch data directly in Server Components using your database client or ORM, without creating intermediate API routes.

```typescript
// In a Server Component
async function Page() {
  const data = await db.query('SELECT * FROM ...');
  return <div>{/* render data */}</div>;
}
```

**Why**: Eliminates the network hop between your backend and frontend. Database credentials and business logic never reach the browser. Type safety extends from database to UI without serialization boundaries.

**Common Mistake**: Creating Route Handlers (`/app/api/`) for every data need, then fetching from them in Server Components. This adds unnecessary complexity, network latency, and eliminates type safety benefits.

### Avoiding Request Waterfalls

#### Parallel Data Fetching
**Best Practice**: Initiate all data fetches simultaneously at the route level, then await them together:

```typescript
async function Page() {
  // Start all fetches immediately
  const userPromise = getUser();
  const postsPromise = getPosts();
  
  // Wait for all to complete
  const [user, posts] = await Promise.all([userPromise, postsPromise]);
}
```

**Why**: Network requests are the slowest part of most applications. Sequential fetching multiplies this latency - two 100ms queries in sequence take 200ms, but in parallel take only 100ms.

**Common Mistake**: Using await immediately after each fetch call, or fetching data in nested components where parent data determines child fetches. This creates cascading waterfalls that severely impact performance.

### Component-Level Data Fetching
**Best Practice**: Each component should fetch its own data independently rather than prop drilling from parent routes.

**Why**: Components become self-contained and reusable. Next.js automatically deduplicates identical requests made during the same render, so multiple components fetching the same data doesn't cause extra database queries.

**Common Mistake**: Fetching all data in the page component and passing it down through props. This creates tight coupling, makes components harder to reuse, and prevents granular streaming.

## Rendering Strategies

### Static vs Dynamic Rendering

#### Choosing Static Rendering
**Best Practice**: Use static rendering (the default) for content that doesn't change per-request: marketing pages, blog posts, documentation.

**Why**: Statically rendered pages are generated once at build time and served from CDN edge locations. This provides the fastest possible response times and reduces server load.

**Common Mistake**: Making pages dynamic unnecessarily by accessing headers or cookies when the data doesn't actually vary per request. This forces request-time rendering and eliminates CDN caching benefits.

#### When Dynamic Rendering is Required
**Best Practice**: Use dynamic rendering only when you need request-time information: user-specific content, real-time data, or cookie/header-dependent logic.

```typescript
import { cookies } from 'next/headers';

async function Page() {
  const cookieStore = cookies(); // Forces dynamic rendering
  // ...
}
```

**Why**: Dynamic rendering allows personalization and real-time data but requires server execution for every request.

**Common Mistake**: Using `force-dynamic` or `noStore()` globally when only specific components need fresh data. This makes the entire route dynamic, losing static optimization benefits for parts that could be cached.

### Streaming with Suspense

#### Component-Level Streaming
**Best Practice**: Wrap slow-loading components in Suspense boundaries with meaningful loading states:

```typescript
<Suspense fallback={<SkeletonCard />}>
  <SlowLoadingComponent />
</Suspense>
```

**Why**: Users see the page shell immediately while slow data loads in the background. This improves perceived performance and Core Web Vitals scores.

**Common Mistake**: Using a single `loading.tsx` file for the entire page, showing a spinner while all data loads. This creates an all-or-nothing loading experience instead of progressive enhancement.

## Form Handling & Mutations

### Server Actions

#### Form Submission Pattern
**Best Practice**: Use Server Actions as form action handlers, handling validation and database updates server-side:

```typescript
async function createItem(formData: FormData) {
  'use server';
  
  // Validate
  const validated = schema.parse({
    name: formData.get('name'),
  });
  
  // Mutate
  await db.insert(validated);
  
  // Revalidate
  revalidatePath('/items');
}
```

**Why**: Forms work without JavaScript (progressive enhancement). Validation happens server-side where it can't be bypassed. Type safety extends across the client-server boundary.

**Common Mistake**: Using client-side form libraries with `onSubmit` handlers that make fetch calls to API routes. This requires client-side JavaScript, duplicates validation logic, and loses type safety.

#### Cache Revalidation
**Best Practice**: Always call `revalidatePath()` or `revalidateTag()` after mutations to update cached data:

```typescript
async function updateItem(id: string, formData: FormData) {
  'use server';
  await db.update(id, data);
  revalidatePath(`/items/${id}`); // Update this specific page
  revalidatePath('/items'); // Update the list page
}
```

**Why**: Next.js aggressively caches for performance. Without revalidation, users won't see their changes reflected, leading to confusion.

**Common Mistake**: Forgetting revalidation, causing stale data to persist. Or using `revalidatePath('/')` which revalidates everything, causing unnecessary regeneration.

## URL State Management

### Search Parameters for UI State

#### Implementation Pattern
**Best Practice**: Store transient UI state (search, filters, pagination) in URL parameters:

```typescript
// In a Client Component
const searchParams = useSearchParams();
const router = useRouter();

function updateSearch(term: string) {
  const params = new URLSearchParams(searchParams);
  params.set('q', term);
  router.push(`?${params.toString()}`);
}
```

**Why**: Makes application state shareable via URL, enables browser back/forward navigation, and allows server-side access to filter/search parameters.

**Common Mistake**: Storing search/filter state in React state or context. This makes the state ephemeral - refreshing the page or sharing the URL loses the user's context.

#### Debouncing Search
**Best Practice**: Debounce search input to avoid excessive database queries:

```typescript
const debouncedSearch = useMemo(
  () => debounce((term: string) => {
    updateSearchParams(term);
  }, 300),
  []
);
```

**Why**: Without debouncing, every keystroke triggers a navigation and database query, overwhelming your backend and creating a poor user experience.

**Common Mistake**: Updating URL parameters on every keystroke without debouncing, causing excessive re-renders and server requests.

## Performance Optimizations

### Image Optimization

#### Using the Image Component
**Best Practice**: Always use `next/image` instead of HTML `img` tags:

```typescript
import Image from 'next/image';

<Image
  src="/hero.png"
  alt="Description"
  width={1200}
  height={600}
  priority // for above-the-fold images
/>
```

**Why**: Provides automatic lazy loading, responsive sizing, format optimization (WebP/AVIF), and prevents layout shift. Images are only loaded when approaching the viewport.

**Common Mistake**: Using HTML `img` tags directly, missing optimization benefits and causing layout shift. Or using `fill` without a positioned container, causing layout issues.

### Font Optimization

#### Local Font Loading
**Best Practice**: Import fonts using `next/font` for automatic optimization:

```typescript
import { Inter } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Prevent layout shift
});
```

**Why**: Fonts are downloaded at build time and self-hosted, eliminating external requests. The `display: swap` setting prevents invisible text during font load.

**Common Mistake**: Loading fonts via CSS `@import` or link tags, causing additional network requests and potential layout shift during font swap.

## Error Handling

### Error Boundaries

#### Route-Level Error Handling
**Best Practice**: Create `error.tsx` files to handle errors gracefully:

```typescript
'use client'; // Error boundaries must be Client Components

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

**Why**: Prevents errors from crashing the entire application. Users see a friendly error message instead of a blank page, and can attempt recovery.

**Common Mistake**: Not implementing error boundaries, causing unhandled errors to break the entire route. Or catching errors in try-catch blocks without re-throwing, hiding issues from error boundaries.

### Not Found Handling
**Best Practice**: Use `notFound()` function and `not-found.tsx` files for 404 scenarios:

```typescript
import { notFound } from 'next/navigation';

async function Page({ params }) {
  const data = await getData(params.id);
  
  if (!data) {
    notFound(); // Triggers not-found.tsx
  }
}
```

**Why**: Provides consistent 404 handling with proper HTTP status codes for SEO. Better user experience than showing empty states.

**Common Mistake**: Returning null or empty UI when data isn't found, giving users no indication of what went wrong and returning 200 status codes for missing content.

## Authentication & Security

### Middleware for Route Protection

#### Authentication Pattern
**Best Practice**: Implement authentication checks in middleware:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

**Why**: Runs at the edge before any rendering, preventing unauthorized access to protected routes. Centralized auth logic rather than scattered checks.

**Common Mistake**: Checking authentication inside each protected page component. This allows initial render before redirect and scatters auth logic across the codebase.

### Server Component Security
**Best Practice**: Keep sensitive operations in Server Components and Server Actions:

```typescript
// This stays on the server
async function Page() {
  const secretData = await fetchWithApiKey(process.env.SECRET_API_KEY);
  return <ClientComponent data={secretData} />;
}
```

**Why**: Environment variables and sensitive logic never reach the browser. API keys and business logic remain secure.

**Common Mistake**: Prefixing sensitive environment variables with `NEXT_PUBLIC_`, exposing them to the client bundle. Or implementing sensitive business logic in Client Components where it can be inspected.

## Metadata & SEO

### Dynamic Metadata Generation
**Best Practice**: Generate metadata based on page content:

```typescript
export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);
  
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      images: [post.image],
    },
  };
}
```

**Why**: Search engines and social platforms need accurate metadata for each page. Dynamic generation ensures metadata matches actual content.

**Common Mistake**: Using the same metadata for all pages, hurting SEO and social sharing. Or forgetting to handle cases where data might not exist, causing errors during metadata generation.

## Common Anti-Patterns to Avoid

1. **Creating API routes for Server Component data fetching** - Adds unnecessary network hops and complexity
2. **Using 'use client' everywhere** - Eliminates benefits of Server Components and increases bundle size
3. **Fetching all data in layouts** - Creates waterfalls and couples unrelated data fetching
4. **Storing application state in React state instead of URL** - Loses shareability and navigation benefits
5. **Using dynamic rendering when static would work** - Sacrifices performance unnecessarily
6. **Forgetting cache revalidation after mutations** - Causes stale data and user confusion
7. **Not implementing error boundaries** - Allows errors to crash entire routes
8. **Checking auth in components instead of middleware** - Permits unauthorized rendering
9. **Importing fonts and images traditionally** - Misses optimization opportunities
10. **Creating deeply nested layouts** - Adds complexity without benefit

## Key Decision Points

When building with Next.js App Router, ask yourself:

1. **"Does this need to be a Client Component?"** - Default to Server Components
2. **"Can this be statically rendered?"** - Default to static, opt into dynamic only when needed
3. **"Should this state be in the URL?"** - If it's shareable/bookmarkable, yes
4. **"Can these requests run in parallel?"** - Avoid waterfalls whenever possible
5. **"Does this need an API route?"** - Probably not if it's for Server Component data
6. **"Is this the right place for this layout?"** - Layouts should have clear, singular purposes
7. **"Have I revalidated the cache?"** - Always revalidate after mutations
8. **"Is this error handled?"** - Every route should have error boundaries