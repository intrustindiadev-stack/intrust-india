## 1. Implementation

- [x] 1.1 Open `app/api/hrm/resume/[fileName]/route.js`.
- [x] 1.2 Change `const { fileName } = params;` to `const resolvedParams = await params; const { fileName } = resolvedParams;`.

## 2. Verification

- [x] 2.1 Attempt to open a resume from the HR panel and ensure the file downloads correctly without a 500 error.
