## ADDED Requirements

### Requirement: Upload KYC Documents
Employees MUST be able to upload required KYC documents (Aadhaar, PAN, Bank Proof, Education, etc.).

#### Scenario: Successful upload
- **WHEN** an employee selects a valid document (PDF/JPG/PNG < 5MB) and submits
- **THEN** the file is uploaded to their private path in the `employee-documents` storage bucket and a `pending` record is created in the `employee_documents` table.

#### Scenario: Invalid file format or size
- **WHEN** an employee attempts to upload a file > 5MB or an unsupported format
- **THEN** the system rejects the upload with a client-side error and no file is saved.

### Requirement: Document Review by HR
HR MUST be able to review pending documents, approve them, or reject them with a reason.

#### Scenario: Approve document
- **WHEN** HR clicks 'Approve' on a pending document
- **THEN** the document status in the `employee_documents` table is updated to `approved`.

#### Scenario: Reject document
- **WHEN** HR clicks 'Reject' on a pending document and provides a reason (e.g., "Blurry image")
- **THEN** the document status is updated to `rejected` and the reason is saved in `rejection_reason`.

### Requirement: Employee Views Document Status
Employees MUST be able to view the status of their uploaded documents (Pending, Approved, Rejected) and read any rejection reasons.

#### Scenario: Re-uploading a rejected document
- **WHEN** an employee sees a `rejected` document and uploads a new file
- **THEN** the status resets to `pending` and the rejection reason is cleared.

### Requirement: Secure Access Control
Access to uploaded documents MUST be restricted.

#### Scenario: Unauthorized access attempt
- **WHEN** an employee tries to access another employee's document path in the storage bucket
- **THEN** the system denies access due to RLS policies.

#### Scenario: HR secure preview
- **WHEN** HR opens a document in the verification modal
- **THEN** the system generates a temporary signed URL to securely preview the file without exposing it publicly.
