## ADDED Requirements

### Requirement: Server-side Layout Access Check
The system SHALL verify the user's true database role during the server-side rendering of the `employee` layout.

#### Scenario: Stale JWT Role Revoked
- **WHEN** a user accesses `/employee` and their JWT token indicates they are an `employee`, but the real-time database check reveals they are a `user`.
- **THEN** the system redirects them to `/dashboard` (or the default portal) without rendering the employee panel.

#### Scenario: Valid Access Allowed
- **WHEN** a user accesses `/employee` and both their JWT token and the real-time database check confirm they are an `employee`.
- **THEN** the system renders the employee portal normally.
