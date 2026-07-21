## Why

Candidates attempting to apply for job roles are encountering failures when uploading their resumes. Specifically, uploads larger than 1MB fail with a `413 Request Entity Too Large` error due to Nginx proxy limits on the VPS, and local development triggers CORS errors when hitting the production Supabase endpoint directly. This blocks candidates from completing the application workflow, causing a poor user experience and lost applicants.

## What Changes

- **Move Uploads to Server-Side:** Instead of the client uploading directly to Supabase storage (which triggers CORS and exposes storage bucket logic), the frontend will send the resume to a new Next.js API route (`/api/hrm/upload-resume`). The Next.js API will handle the upload to Supabase using the admin client.
- **Next.js Size Limit Configuration:** Ensure the Next.js API route correctly handles up to 5MB file sizes as intended by the UI limit.
- **UI/UX Error Handling:** Improve the career application page to handle upload errors gracefully, displaying user-friendly error messages (e.g., "File too large") instead of generic "Failed to fetch" toasts. Add a loading state specifically for the file upload process if needed.

## Capabilities

### New Capabilities
- `resume-upload`: A server-side capability to securely handle resume uploads and proxy them to the Supabase storage bucket, avoiding direct client-to-Supabase CORS and Nginx body size limitations.

### Modified Capabilities

## Impact
- **Affected Code:** `app/(customer)/career/apply/page.jsx` (Client upload logic)
- **New API:** `app/api/hrm/upload-resume/route.js`
- **Systems:** Supabase Storage (Resumes bucket), Next.js Server. By moving uploads server-side, we bypass the need to modify the VPS Nginx `client_max_body_size` limit for the `/api/supabase` proxy, fixing the issue purely within the application codebase.
