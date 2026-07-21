## Context

Next.js 15 has moved `params` and `searchParams` in dynamic API routes to asynchronous promises. The current implementation in `/api/hrm/resume/[fileName]` assumes it's a standard synchronous object, leading to runtime server crashes during destructuring.

## Goals / Non-Goals

**Goals:**
- Fix the API route crash.
- Ensure compliance with Next.js 15 dynamic routing best practices.

**Non-Goals:**
- Modifying any of the underlying authentication or Supabase storage fetching logic.

## Decisions

**1. Await Params Object**
- We will update the route handler signature to extract the parameters asynchronously:
  ```javascript
  const resolvedParams = await params;
  const { fileName } = resolvedParams;
  ```
- *Rationale*: This is the exact required fix per Next.js documentation for dynamic routes in version 15.

## Risks / Trade-offs

- **Risk**: Minimal risk. This is a straightforward API breaking change fix.
