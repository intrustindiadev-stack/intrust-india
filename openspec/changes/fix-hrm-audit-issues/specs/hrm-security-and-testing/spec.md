## ADDED Requirements

### Requirement: Unified HR Role Permissions on Profiles
The system MUST allow users with role `hr`, `hr_manager`, `admin`, or `super_admin` to select and update employee user profiles via Supabase RLS.

#### Scenario: HR Role Accessing Employee Profiles
- **WHEN** an authenticated user with role `hr` or `hr_manager` queries or updates `user_profiles` for an employee
- **THEN** Supabase RLS SHALL permit the operation without throwing permission errors

### Requirement: Validation Safeguards for Employee Creation
The system MUST validate email syntax, phone format, and base salary non-negativity before submitting new employee records to `user_profiles`.

#### Scenario: Validating New Employee Form Inputs
- **WHEN** an HR user submits an employee form with an invalid email, negative base salary, or duplicate email
- **THEN** the system SHALL reject the submission with an explicit toast error message before contacting the database or handle the unique constraint error gracefully

### Requirement: Payroll Net Payable Guard
The system MUST guarantee that calculated net salary is never negative and that payslip PDF generation handles null profile attributes gracefully.

#### Scenario: Processing Salary with High Deductions
- **WHEN** an HR manager enters deductions greater than the sum of base salary, HRA, and allowances
- **THEN** the system SHALL clamp net payable salary to zero and prevent negative payroll payouts

### Requirement: Leave Duration Calculation Accuracy
The system MUST validate date ranges for leave requests and display valid integer day counts regardless of input formatting.

#### Scenario: Calculating Days for Invalid or Reverse Dates
- **WHEN** a leave request contains invalid date strings or end date prior to start date
- **THEN** the system SHALL return a fallback display value instead of `NaN` or negative values

### Requirement: Comprehensive HRM Testing Suite
The system MUST provide a structured testing plan covering auth bypass, onboarding validation, attendance override audit logs, leave workflow, and salary processing.

#### Scenario: Executing Pre-Testing Verification Suite
- **WHEN** a tester follows the testing guide for HRM panel
- **THEN** all critical paths (Auth, Onboarding, Attendance, Leaves, Salary) SHALL pass without unhandled UI errors or permission errors
