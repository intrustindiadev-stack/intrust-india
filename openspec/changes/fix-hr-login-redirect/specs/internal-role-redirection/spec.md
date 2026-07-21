## ADDED Requirements

### Requirement: Redirect HR Managers to HRM portal
The system SHALL automatically redirect users with the `hr_manager` role to the `/hrm` portal when they access the root landing page (`/`).

#### Scenario: HR Manager accesses root page
- **WHEN** an authenticated user with role `hr_manager` visits `/`
- **THEN** the system redirects them to `/hrm`

### Requirement: Redirect Sales to CRM portal
The system SHALL automatically redirect users with a sales role (e.g., `sales_exec`, `sales_agent`, or any role starting with `sales_`) to the `/crm` portal when they access the root landing page (`/`).

#### Scenario: Sales Executive accesses root page
- **WHEN** an authenticated user with role `sales_exec` visits `/`
- **THEN** the system redirects them to `/crm`

### Requirement: Redirect Employees to Employee portal
The system SHALL automatically redirect users with the `employee` role to the `/employee` portal when they access the root landing page (`/`).

#### Scenario: Employee accesses root page
- **WHEN** an authenticated user with role `employee` visits `/`
- **THEN** the system redirects them to `/employee`
