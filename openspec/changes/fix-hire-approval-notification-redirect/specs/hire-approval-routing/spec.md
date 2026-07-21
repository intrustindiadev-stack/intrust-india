## ADDED Requirements

### Requirement: Handle hire_approval notification click
The system SHALL navigate the user to the `/admin/careers` page when they click on a notification of type `hire_approval`.

#### Scenario: Admin clicks pending approval notification
- **WHEN** an Admin clicks the "New Hire Pending Approval" notification
- **THEN** the system redirects them to `/admin/careers`
