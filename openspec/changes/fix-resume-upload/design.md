## Context

The current `app/(customer)/career/apply/page.jsx` uploads resume files directly to Supabase storage from the client using the `supabase-js` client. The local `.env` configuration sets `NEXT_PUBLIC_SUPABASE_URL` to `https://intrustindia.com/api/supabase` to proxy requests to the production Supabase instance.
However, the VPS Nginx proxying this route has a default 1MB `client_max_body_size` limit, which triggers a `413 Request Entity Too Large` error for any file > 1MB. Additionally, CORS errors occur during local development when uploading directly to the proxied URL. 
Because the Nginx config is managed at the VPS level and we want a clean code-level solution that also hides our storage bucket structures, moving the upload to the server-side via Next.js is optimal. Next.js is configured with a 5MB body size limit.

## Goals / Non-Goals

**Goals:**
- Fix the 413 Payload Too Large error for resume uploads under 5MB.
- Eliminate CORS issues during local development for file uploads.
- Provide clear error messaging in the UI for upload failures (e.g. file too large, invalid format).

**Non-Goals:**
- Changing the Nginx configuration on the production VPS.
- Migrating all existing client-side uploads across the app (this is scoped only to resume uploads on the career page).
- Storing files anywhere other than the existing Supabase `resumes` bucket.

## Design Decisions

1. **Server-Side Proxy**: By removing Supabase client usage from the frontend and shifting the upload to a Next.js API route (`/api/hrm/upload-resume`), we bypass CORS and gain full control over file-size validation and database interactions.
2. **Admin Role Bypass**: Using `createAdminClient` inside the API route ensures the upload to the `resumes` bucket will always succeed regardless of complex client-side RLS rules, provided the request itself comes from an authenticated user.
3. **Private Bucket & Download Proxy (NEW)**: The `resumes` bucket is strictly private to protect candidate PII. Instead of generating a broken public URL, the upload route will return a local proxy URL (`/api/hrm/resume/[fileName]`). A new Next.js route will securely stream the private file to authorized HR managers on demand.

**1. Create a Next.js API Route for Uploads (`/api/hrm/upload-resume`)**
- *Rationale*: By proxying the upload through a Next.js Server API route, the Next.js backend (which has no CORS restrictions to the external domain) communicates directly with Supabase. The Next.js API route itself respects the `5mb` limit we have configured in `next.config.mjs`, avoiding the Nginx 1MB limitation on the `/api/supabase` proxy because the backend will use the Supabase Admin client directly or bypass the proxy restriction via internal routing or handling the chunking gracefully. (Wait, if the Next.js API route uploads to `NEXT_PUBLIC_SUPABASE_URL` which is the proxy, it might still hit Nginx. However, we can use the `adminSupabase` client initialized with internal URLs or we can just send it as a multi-part form data which the backend handles. Actually, `SUPABASE_URL` internally might still hit the proxy unless we use the direct DB URL. But moving it to Next.js ensures CORS is fixed, and if the Next.js backend still hits 413, we might need to adjust the Supabase URL on the server, but let's assume the API route resolves the immediate client-side limits).
- *Alternative*: Altering Nginx config on the VPS. This was rejected because it requires out-of-band infrastructure changes rather than code-level fixes, and doesn't solve the exposure of the storage bucket to the client.

**2. Improved Error Handling in `CareerApplyForm`**
- *Rationale*: We need to capture exceptions specifically related to file size and network issues and display a readable toast error, rather than failing silently with a CORS error or "Failed to fetch".

## Risks / Trade-offs

- **Risk:** Server-side file parsing consumes more memory on the Next.js Node.js server.
  - *Mitigation:* The file size is strictly limited to 5MB, which is small enough to parse safely in memory before piping to Supabase.
- **Risk:** The Next.js API route might still encounter the 413 error if it uses the same proxy URL.
  - *Mitigation:* We will verify the API route utilizes the internal Supabase URL or the direct Supabase instance URL available in the server environment variables, bypassing the external Nginx ingress.
