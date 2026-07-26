## ADDED Requirements

### Requirement: Database-level audit logging for CRM
The system SHALL log all modifications to CRM data in a dedicated `audit_logs_crm` table using PostgreSQL triggers.

#### Scenario: Lead is updated
- **WHEN** a user updates a lead's status, assignment, or details
- **THEN** an entry is created in `audit_logs_crm` recording the actor, action, table name, record ID, and JSON diffs of old and new data.

#### Scenario: Lead is created
- **WHEN** a new lead is inserted
- **THEN** an entry is created in `audit_logs_crm` recording the creation action and the new data.
