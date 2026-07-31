## ADDED Requirements

### Requirement: Award Employee Incentive
The system SHALL allow HR managers to award a financial incentive or bonus to an employee.

#### Scenario: Awarding a bonus
- **WHEN** an HR manager submits a valid incentive amount, type, description, and employee
- **THEN** a new incentive record is created and displayed as Pending

### Requirement: View Incentive History
The system SHALL display a history of all awarded incentives for employees in a data table.

#### Scenario: Viewing the history
- **WHEN** the HR manager navigates to the incentives dashboard
- **THEN** a table of past and current incentives is displayed with their respective statuses.
