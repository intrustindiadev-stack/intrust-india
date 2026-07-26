## ADDED Requirements

### Requirement: Role-Based Scope Enforcement for Sales Executives
The system SHALL restrict Sales Executives (`sales_exec`) to viewing, updating, and interacting only with leads assigned to them or created by them.

#### Scenario: Sales Executive viewing lead directory
- **WHEN** a sales executive navigates to the CRM leads directory
- **THEN** system filters data to display only leads where assigned_to or created_by equals their user ID

#### Scenario: Sales Manager viewing lead directory
- **WHEN** a sales manager or admin navigates to the CRM leads directory
- **THEN** system displays all leads across the organization and permits reassignment
