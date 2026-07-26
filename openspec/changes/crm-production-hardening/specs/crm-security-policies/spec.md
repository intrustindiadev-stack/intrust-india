## ADDED Requirements

### Requirement: Manager-only lead deletion policy
The database SHALL restrict hard deletions on the `crm_leads` table to users with `sales_manager`, `admin`, or `super_admin` roles via RLS policies.

#### Scenario: Sales exec attempts to delete a lead
- **WHEN** a user with the `sales_exec` role attempts to execute a DELETE on `crm_leads`
- **THEN** the database blocks the operation.

#### Scenario: Manager deletes a lead
- **WHEN** a user with the `sales_manager` role attempts to execute a DELETE on `crm_leads`
- **THEN** the database allows the operation.

### Requirement: Soft-delete support for leads
The system SHALL support soft-deleting leads by setting an `archived_at` timestamp.

#### Scenario: User soft-deletes a lead
- **WHEN** a user initiates a lead deletion from the UI
- **THEN** the system updates the `archived_at` column instead of performing a hard DELETE, and the lead is excluded from active views.
