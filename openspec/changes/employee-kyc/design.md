## Context

Intrust India requires a secure Employee Document Management & KYC Verification system. The current system does not have an automated document collection and verification flow. We need a way for employees to upload critical documents (Aadhaar, PAN, Bank Proof, etc.) and for HR to systematically review and approve or reject them. Documents contain sensitive PII, so security and access control are paramount.

## Goals / Non-Goals

**Goals:**
- Provide a secure Supabase storage bucket (`employee-documents`) for employee uploads with RLS restricting access to the owner and HR/Admin.
- Implement an `employee_documents` table to track the metadata and status of each document.
- Build an Employee Panel component (`/employee/documents`) for uploading files with status indicators.
- Build an HRM Verification View component (`/hrm/documents`) with a pending approvals list and document viewer.
- Provide a clear Approve/Reject workflow with reasons for rejection.

**Non-Goals:**
- Automated OCR extraction of details from uploaded documents.
- Integration with third-party external KYC verification APIs (e.g., Digilocker or external Aadhaar APIs).

## Decisions

- **Storage Bucket Configuration**: Use a private Supabase Storage bucket. RLS policies will ensure employees can only write/read files in their own folder `[user_id]/[document_type].[ext]`. HR and Admins can read all files. Temporary signed URLs (`createSignedUrl`) will be used by the HRM panel to preview these files securely.
- **Database Schema (`employee_documents`)**:
  - `id`: UUID Primary Key
  - `user_id`: UUID Foreign Key (links to auth.users or profiles)
  - `document_type`: Enum ('aadhaar', 'pan', 'bank_proof', 'education', 'other')
  - `file_path`: String, path in the `employee-documents` bucket.
  - `status`: Enum ('pending', 'approved', 'rejected') defaulting to 'pending'.
  - `rejection_reason`: Nullable string.
  - `document_number`: Optional text for ID numbers.
- **UI Framework**: Use Next.js with Tailwind CSS for clean, enterprise-grade styling (white/slate aesthetic).
- **File Constraints**: Max 5MB, restricted to PDF, JPEG, and PNG. Validation enforced client-side before upload and ideally via Supabase Storage rules.

## Risks / Trade-offs

- **Security Risk (Data Leaks)**: Misconfigured RLS in Supabase Storage or DB could expose sensitive PII.
  - *Mitigation*: Strictly define and test RLS policies. The bucket must be explicitly created as private.
- **Large File Uploads**: Could hit storage limits.
  - *Mitigation*: Client-side and server-side constraints limiting files to 5MB.
- **Previewing Private Files**: Browsers can't render private bucket files directly via URL.
  - *Mitigation*: Use Supabase's `createSignedUrl` to dynamically generate temporary links when HR opens a document in the viewer modal.
