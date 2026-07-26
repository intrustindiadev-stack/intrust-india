## ADDED Requirements

### Requirement: PII Encryption at Rest
The database MUST encrypt sensitive employee financial and identity fields at rest using `pgcrypto`.

#### Scenario: Storing and Reading PII Data
- **WHEN** an employee base salary or national ID is stored or queried
- **THEN** the database SHALL encrypt the raw value using `pgp_sym_encrypt` and decrypt via authorized functions only

### Requirement: MFA Session Enforcement via RLS
The database MUST enforce `aal2` MFA authentication level in JWT claims for sensitive updates to salary records or audit logs.

#### Scenario: Modifying Salary Records without MFA
- **WHEN** an authenticated user without an `aal2` MFA assurance level attempts to update `salary_records`
- **THEN** Supabase RLS SHALL reject the mutation with an authorization error

### Requirement: Runtime Zod Schema Validation
All HRM API endpoints and server actions MUST parse incoming request payloads using Zod schemas.

#### Scenario: Submitting Invalid API Payloads
- **WHEN** a client POSTs invalid data to `/api/hrm/*`
- **THEN** the server SHALL return a 400 response with structured Zod error details

### Requirement: Server Component Data Fetching with Suspense
The HRM dashboard and lists MUST use Next.js React Server Components with Suspense fallbacks for parallel data fetching.

#### Scenario: Loading HRM Dashboard
- **WHEN** a user visits `/hrm`
- **THEN** the page SHALL render server-side in parallel and display skeleton fallbacks until data streaming completes

### Requirement: Optimistic Status Updates
The UI MUST render state mutations optimistically for leave approvals and attendance status changes.

#### Scenario: Approving a Leave Request
- **WHEN** an HR manager clicks Approve on a leave request
- **THEN** the UI SHALL immediately display the updated state via `useOptimistic` while the server action executes in the background
