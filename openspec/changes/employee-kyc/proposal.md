## Why

We need to build a secure Employee Document Management & KYC Verification system. Employees must be able to upload required documents (PAN Card, Aadhaar Card, Bank Passbook/Cheque, Educational Certificates, etc.), and HR must be able to review, approve, or reject them. This ensures compliance and smooth onboarding.

## What Changes

- Create a private Supabase Storage bucket named `employee-documents` with strict RLS policies (employees read/write their own path, HR/Admin full read access).
- Add an `employee_documents` database table to track document metadata, type, status, and rejection reasons with proper RLS.
- Create an Employee Panel component (`/employee/documents`) for uploading files, showing status badges, and validation.
- Create an HRM Verification View component (`/hrm/documents`) with a pending approvals directory, document viewer modal, and approve/reject workflows.

## Capabilities

### New Capabilities
- `employee-kyc`: Secure employee document uploading, storage, and HRM verification workflow.

### Modified Capabilities

## Impact

- Supabase Storage and Database schema (new table and bucket).
- New routes for Employee and HRM portals in the Next.js app.
- Introduces document upload and review dependencies and state.
