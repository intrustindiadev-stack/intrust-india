## ADDED Requirements

### Requirement: KYC_REMINDER_TEMPLATE sends correct variable parameters
`KYC_REMINDER_TEMPLATE.buildComponents(firstName, daysPending)` SHALL return a non-empty components array that includes a `body` component with `{{1}} = firstName` and `{{2}} = daysPending`, matching the approved Meta template's variable slots.

#### Scenario: buildComponents returns populated body parameters
- **WHEN** `KYC_REMINDER_TEMPLATE.buildComponents('Rahul', 7)` is called
- **THEN** the returned array contains exactly one element of `type='body'` with two `text` parameters: `'Rahul'` and `'7'`

### Requirement: UDHARI_DUE_REMINDER_TEMPLATE sends all four variable parameters
`UDHARI_DUE_REMINDER_TEMPLATE.buildComponents(merchantName, amount, dueDate, status)` SHALL return a `body` component array with all four arguments passed as ordered text parameters, ensuring no variable slot is silently omitted.

#### Scenario: buildComponents returns all four parameters
- **WHEN** `UDHARI_DUE_REMINDER_TEMPLATE.buildComponents('JJ Store', '₹500', '31 Jul 2026', 'overdue')` is called
- **THEN** the returned body parameters array contains four entries in the order: `'JJ Store'`, `'₹500'`, `'31 Jul 2026'`, `'overdue'`
