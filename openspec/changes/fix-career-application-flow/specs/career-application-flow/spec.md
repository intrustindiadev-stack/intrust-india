## ADDED Requirements

### Requirement: Early Authentication Gate
The system SHALL require users to be authenticated before filling out any personal or professional details on the career application form.

#### Scenario: Unauthenticated user accesses application flow
- **WHEN** an unauthenticated user visits `/career/apply`
- **THEN** the system redirects them to the login page or displays a persistent login modal blocking access to Step 2 and beyond

### Requirement: Step 2 Personal Info Validation
The system SHALL strictly validate the applicant's name, phone, and email on Step 2 before allowing progression.

#### Scenario: User submits invalid personal info
- **WHEN** the user attempts to proceed with an empty, whitespace-only name, invalid email format, or a phone number that is not exactly 10 digits
- **THEN** the system prevents progression to Step 3 and displays inline error messages indicating which fields are invalid

### Requirement: Step 3 Professional Info Validation
The system SHALL strictly validate the applicant's professional details and require a valid resume upload on Step 3 before allowing progression.

#### Scenario: User attempts to skip resume upload
- **WHEN** the user clicks Continue without uploading a valid resume file (e.g. PDF/DOC < 5MB)
- **THEN** the system prevents progression to Step 4 and displays an inline error message requiring the resume

### Requirement: Form Keyboard Submission
The system SHALL wrap the multi-step inputs in an HTML form to support native browser submission mechanics.

#### Scenario: User presses Enter key
- **WHEN** the user presses the Enter key while focused on a form input
- **THEN** the system attempts to validate the current step and proceed to the next step if valid
