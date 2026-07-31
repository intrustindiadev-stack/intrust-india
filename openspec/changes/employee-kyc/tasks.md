## 1. Storage & Database Setup

- [x] 1.1 Create migration script for `employee_documents` table and `employee-documents` storage bucket setup.
- [x] 1.2 Apply migrations to the Supabase Database and configure RLS policies (employee read/write own files, HR full access).

## 2. Shared Utilities

- [x] 2.1 Implement server-side action to generate signed URLs for HR preview.
- [x] 2.2 Implement server-side actions for document submission (employee) and document status update (HR).

## 3. Employee Panel Component

- [x] 3.1 Create `/employee/documents` page structure with grid layout.
- [x] 3.2 Build Document Card component with status badges (Not Uploaded, Pending, Approved, Rejected).
- [x] 3.3 Implement client-side file upload logic with size (< 5MB) and type (PDF, JPEG, PNG) validation.
- [x] 3.4 Integrate frontend upload with Supabase Storage and create DB record.

## 4. HRM Verification View Component

- [x] 4.1 Create `/hrm/documents` page with a directory/table of employees with pending documents.
- [x] 4.2 Build a Document Viewer Modal/Drawer that safely displays private documents using signed URLs.
- [x] 4.3 Implement Approval Controls (Approve button).
- [x] 4.4 Implement Reject Controls (Prompt for reason, Reject button) and status updates.
