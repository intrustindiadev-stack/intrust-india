## ADDED Requirements

### Requirement: KYC Terms Consent Acceptance
The system SHALL require that KYC records include proof of terms acceptance, capturing whether the terms were accepted, the timestamp of acceptance, and the version of terms accepted.

#### Scenario: Submitting KYC accepts terms
- **WHEN** user submits the KYC form with termsAccepted set to true
- **THEN** the system SHALL save the KYC record with terms_accepted as true, terms_accepted_at as the current timestamp, and terms_version matching the active version.
