<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# User Provisioning

## Purpose

Automated user lifecycle management including account creation, modification,
deprovisioning, and semester-based enrollment management via the OX Connector
and SAML account linking.

## Non-Goals

- SCIM provisioning (planned future)
- Campus management system integration (planned v1.5)

## Requirements

### Requirement: OX Connector provisioning

The OX Connector SHALL provision users to OX App Suite from OpenLDAP via the
SOAP API, creating contexts, groups, and mailboxes.

#### Scenario: New user auto-provisioned
- GIVEN a new user created in OpenLDAP
- WHEN the provisioning service detects the change
- THEN the OX Connector creates a user context in OX App Suite
- AND the user can immediately access email, calendar, and contacts

#### Scenario: Group change propagated
- GIVEN a user added to an OX-authorized group in OpenLDAP
- WHEN the OX Connector processes the change
- THEN the user is added to the corresponding OX App Suite group

### Requirement: Two-phase deprovisioning

Users SHALL be deprovisioned in two phases: disable with grace period,
then permanent deletion.

#### Scenario: Account disabled
- GIVEN a user who leaves the university (exmatriculation)
- WHEN the deprovisioning process starts
- THEN the user's account is DISABLED but preserved for 6 months
- AND the user cannot authenticate to any service

#### Scenario: Account permanently deleted
- GIVEN a user whose 6-month grace period has expired
- WHEN the cleanup process runs
- THEN the user's data is permanently deleted from OpenLDAP
- AND all service accounts are removed

### Requirement: SAML account linking

Federated users authenticated via DFN-AAI SHALL have their SAML identity linked
to a local Keycloak account via the Keycloak admin API.

#### Scenario: Federated user first login
- GIVEN a federated user authenticating for the first time
- WHEN Keycloak receives the SAML assertion
- THEN the SAML identity is linked to a Keycloak user via `federated-identity` endpoints
- AND the user gains access to platform services on subsequent logins

### Requirement: Semester-based course provisioning

The platform SHALL support automated course creation and archival aligned with
university semester cycles.

#### Scenario: Semester start course creation
- GIVEN the start of a new semester
- WHEN the course provisioning API is invoked
- THEN courses are created in ILIAS/Moodle with correct semester metadata
- AND enrolled students are added to the correct course rosters

#### Scenario: Semester end archival
- GIVEN the end of a semester
- WHEN the archival process runs
- THEN course content is frozen
- AND access is restricted to read-only for the archived semester
