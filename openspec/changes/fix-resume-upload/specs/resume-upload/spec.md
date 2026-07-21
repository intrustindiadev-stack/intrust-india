## ADDED Requirements

### Requirement: Server-Side File Proxying
The system SHALL accept a multipart/form-data upload via the Next.js API route (`/api/hrm/upload-resume`) and securely proxy the upload to the Supabase `resumes` storage bucket using the admin client.

#### Scenario: Successful Resume Upload
- **WHEN** the user submits an application with a valid PDF or DOCX file under 5MB.
- **THEN** the Next.js API successfully proxies the file to the Supabase bucket and returns a public URL to be saved with the application record.

### Requirement: Client-Side Size and Format Enforcement
The UI MUST enforce file size (5MB max) and file types (.pdf, .doc, .docx) before attempting an upload, and provide user-friendly error messages if validation fails.

#### Scenario: File Too Large Error handling
- **WHEN** the user selects a file larger than 5MB or the server returns a 413 error (Payload Too Large).
- **THEN** the UI displays a clear toast message stating "File size must be less than 5MB" and stops the submission process.
