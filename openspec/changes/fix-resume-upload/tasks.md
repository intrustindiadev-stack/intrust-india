## 1. Backend API Route

- [x] 1.1 Create the API route file `app/api/hrm/upload-resume/route.js`.
- [x] 1.2 Implement a POST handler to read `multipart/form-data` containing the resume file.
- [x] 1.3 Validate the file size (<= 5MB) and acceptable types within the API route.
- [x] 1.4 Use `createAdminClient` or `createServerSupabaseClient` to upload the file buffer directly to the `resumes` bucket.
- [x] 1.5 Return the public URL of the uploaded resume upon success, or return clear error messages on failure.

## 2. Frontend Integration & UI Updates

- [x] 2.1 Update `app/(customer)/career/apply/page.jsx` to point the resume upload logic to `/api/hrm/upload-resume` using `fetch` with FormData, rather than the `supabase-js` client.
- [x] 2.2 Enhance error handling in the frontend to catch upload failures (e.g., 413 or 400 status codes).
- [x] 2.3 Display specific error messages via `toast.error` instead of generic messages.
- [x] 2.4 Verify end-to-end upload flow locally (ensuring CORS errors and size limit errors are resolved).

## 3. Secure File Proxy (NEW)

- [x] 3.1 Update `app/api/hrm/upload-resume/route.js` to return a local URL (e.g., `/api/hrm/resume/${fileName}`) instead of using `.getPublicUrl()`.
- [x] 3.2 Create `app/api/hrm/resume/[fileName]/route.js` to handle secure downloads.
- [x] 3.3 Ensure the download route checks if the user is authenticated and authorized (HR/Admin/Super Admin) before downloading the file using `adminSupabase.storage.from('resumes').download(fileName)`.
- [x] 3.4 Stream the downloaded blob buffer to the Next.js `NextResponse` with appropriate `Content-Type` and `Content-Disposition` headers so it can be viewed in the browser.
- [x] 3.5 Write a one-off database script to update existing `career_applications` that have broken `.getPublicUrl()` links, replacing them with the new local proxy URLs.
