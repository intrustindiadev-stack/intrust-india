## ADDED Requirements

### Requirement: career_applications has all hire-workflow columns
The `career_applications` table SHALL contain the columns `hired_at`, `offered_salary`, `commission_percent`, `joining_bonus`, `offer_letter_notes`, `interview_date`, and `interview_notes` so that the hire-candidate API route can write to them without error.

#### Scenario: Hire candidate API writes all fields
- **WHEN** a POST request is made to `/api/hrm/hire-candidate` with `stage='hired'`, `offeredSalary=35000`, `commissionPercent=5`, and `joiningBonus=10000`
- **THEN** the `career_applications` record is updated with all provided values and no database error is raised

### Requirement: audit_logs_hrm has canonical column set
The `audit_logs_hrm` table SHALL contain the columns `actor_name TEXT`, `module TEXT`, and `severity TEXT CHECK (severity IN ('low','medium','high'))` so that the HRM dashboard leave-approval handler can log a structured audit entry.

#### Scenario: Leave approval audit log includes actor_name and module
- **WHEN** an HR manager approves a leave request via the HRM dashboard
- **THEN** an entry is inserted into `audit_logs_hrm` with non-null `actor_name`, `module='Leaves'`, and `severity='low'`

### Requirement: Leave approval sets reviewed_by
The leave-approval update payload SHALL include `reviewed_by` set to the currently authenticated user's ID.

#### Scenario: reviewed_by is populated on approval
- **WHEN** an HR manager clicks "Approve" on a leave request
- **THEN** the `leave_requests` row is updated with `reviewed_by = <manager's user_id>` and `reviewed_at = <current timestamp>`

#### Scenario: reviewed_by is populated on rejection
- **WHEN** an HR manager clicks "Reject" on a leave request
- **THEN** the `leave_requests` row is updated with `reviewed_by = <manager's user_id>` and `reviewed_at = <current timestamp>`
