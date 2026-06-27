<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# User Provisioning

## Purpose

Automated user lifecycle management including account creation, modification,
deprovisioning, and semester-based enrollment management via OX Connector + LDAP
sync and SAML account linking.

## Non-Goals

- SCIM provisioning (planned future)
- Campus management system integration (planned v1.5)

## Requirements

### Requirement: OX Connector provisioning for OX AppSuite

The OX Connector SHALL provision users to OX AppSuite from OpenLDAP via the SOAP
API, creating contexts, groups, and mailboxes.

OX Connector runs as a CronJob triggered by LDAP changes.

#### Scenario: New user auto-provisioned to OX
- GIVEN a new user `alice` created in OpenLDAP with mail `alice@opendesk.hrz.uni-marburg.de`
- WHEN the OX Connector CronJob executes (triggered by LDAP change detection)
- THEN the OX Connector calls the OX AppSuite SOAP API
- AND creates a user context for alice
- AND creates a mailbox with IMAP/SMTP access
- AND alice can immediately access email, calendar, and contacts

#### Scenario: Group change propagated
- GIVEN a user added to the `ox-authorized-users` LDAP group
- WHEN the OX Connector processes the change
- THEN the user is added to the corresponding OX AppSuite group
- AND the user gains access to OX AppSuite (portal tile appears)

#### Scenario: Email address change synced
- GIVEN an existing user whose email address changes in OpenLDAP
- WHEN the OX Connector processes the change
- THEN the OX AppSuite account email is updated via SOAP API
- AND the user can still authenticate with the new email

### Requirement: Two-phase deprovisioning

Users SHALL be deprovisioned in two phases: disable with grace period,
then permanent deletion after 6 months.

#### Scenario: Account disabled on exmatriculation
- GIVEN a user who leaves the university (exmatriculation)
- WHEN the deprovisioning process is triggered (via HISinOne webhook or manual)
- THEN the user's OpenLDAP account is SPECIAL (marked as disabled)
- AND the user's `shadowExpire` or OX AppSuite account is set to disabled state
- AND the user cannot authenticate to any service
- AND the user's data is preserved for 6 months

#### Scenario: Account permanently deleted after grace period
- GIVEN a disabled user whose 6-month grace period has expired
- WHEN the cleanup CronJob runs (daily)
- THEN the user's LDAP entry is removed
- AND the OX AppSuite account is permanently deleted
- AND data from secondary services (Nextcloud, ILIAS, Moodle) is archived or deleted

### Requirement: SAML account linking for federated users

Federated users authenticated via DFN-AAI/eduGAIN SHALL have their SAML identity
linked to a local Keycloak account via the Keycloak admin API's
`federated-identity` endpoints.

`eduPersonPrincipalName` is used as the stable identifier.

#### Scenario: Federated user first login
- GIVEN a federated user from ETH Zurich with `eduPersonPrincipalName: bob@ethz.ch`
- WHEN Shibboleth IdP authenticates the user and forwards the SAML assertion to Keycloak
- THEN Keycloak calls `PUT /admin/realms/opendesk/users/{userId}/federated-identity/shibboleth`
- AND the SAML identity is linked to a Keycloak user with `username: bob@ethz.ch`
- AND the user is added to the `managed-by-attribute-federated-users` group
- AND the user gains access to platform services on subsequent logins

#### Scenario: Federated user Login preserves NameID
- GIVEN a federated user with an existing Keycloak linked account
- WHEN the user logs in again via federation
- THEN the SAML `NameID` (persistent) is validated
- AND the same Keycloak user session is created (no duplicate account)

### Requirement: Semester-based course provisioning

The platform SHALL support automated course creation and archival aligned with
university semester cycles (SS 2026, WS 2026/2027, etc.).

This is primarily for ILIAS and Moodle; manual interventions are acceptable for
non-automated observables.

#### Scenario: Semester start course creation (planned)
- GIVEN the start of a new semester (e.g., WS 2026/2027)
- WHEN the semester provisioning script runs (manual or scheduled)
- THEN courses are created in ILIAS with correct semester metadata in course title
- AND courses are created in Moodle with correct semester categories
- AND enrolled students are added to course rosters based on the previous semester

#### Scenario: Semester end archival
- GIVEN the end of a semester (e.g., SS 2026)
- WHEN the archival process runs
- THEN course content is frozen in ILIAS
- AND course mode in Moodle is set to read-only
- AND access is restricted to students who were enrolled during the semester

### Requirement: Enrollment synchronization (future)

The platform SHALL synchronize student enrollments from the campus management
system (HISinOne or similar) to LMS course rosters.

This requires a CMS integration adapter; currently manual enrollment is acceptable.

#### Scenario: Student enrolls via campus system (planned)
- GIVEN a student enrolled in a course in HISinOne
- WHEN the enrollment webhook fires to the provisioning service
- THEN the student's OpenLDAP entry is updated with the course group membership
- AND ILIAS/Moodle are configured to sync group memberships
- AND the student is added to the corresponding ILIAS/Moodle course

## OX Connector Integration Details

### OX Connector Deployment

| Property | Value |
|----------|-------|
| Deployment | CronJob in `opendesk` namespace |
| Schedule | Hourly (adjustable via `envVars`) |
| Image | `registry.opencode.de/opendesk/ox-connector` |
| Credentials | `secrets.ox_appsuite.{adminUser, adminPassword}` |

### OX Connector SOAP API Endpoints

The OX Connector uses the following SOAP endpoints:

| Operation | Endpoint | Purpose |
|-----------|----------|---------|
| Create Context | `/soap/user?name=createContext` | Create user context |
| Create User | `/soap/user?name=createUser` | Create mailbox |
| Update User | `/soap/user?name=updateUser` | Sync properties |
| Delete User | `/soap/user?name=deleteUser` | Deprovision |

### LDAP Filter for OX Sync

OX Connector queries OpenLDAP with filter:
```
(&(objectClass=inetOrgPerson)(mail=*@opendesk.hrz.uni-marburg.de)(memberOf=cn=ox-authorized-users,cn=groups,dc=opendesk,dc=opendesk-hrz,dc=uni-marburg,dc=de))
```

## HISinOne Integration (Future)

### HISinOne Webhook Configuration

To enable enrollment synchronization, HISinOne shall be configured to fire webhooks
to the provisioning service:

| Event | Webhook URL | Payload |
|-------|-------------|---------|
| Student enrollment created | `https://provisioning.opendesk.hrz.uni-marburg.de/webhooks/hisinone/enrollment` | `{studentId, courseId, semester}` |
| Student enrollment removed | `https://provisioning.opendesk.hrz.uni-marburg.de/webhooks/hisinone/unenroll` | `{studentId, courseId}` |

### Provisioning Service (To Be Implemented)

A lightweight provisioning service to receive HISinOne webhooks and update LDAP
entries with course group memberships.

## Known Limitations

- Manual course creation: ILIAS and Moodle courses are currently created
  manually; automated semester course provisioning is planned.
- CMS integration: HISinOne integration is not yet implemented; enrollments
  are manual.

## Depends On

- OpenLDAP (user + group directory)
- OX AppSuite (SOAP API endpoint)
- OX Connector (provisioning cronjob)
- Keycloak (federated account linking)
- Shibboleth IdP (federation authentication)

## Integrates With

- [File Store](../file-store/spec.md) (OpenProject-Nextcloud integration)
- [Intercom](../intercom/spec.md) (silent login)
- [LDAP]( ../../auth/ldap/spec.md) (group sync from OSS)
- `../_registry/interconnection-matrix.md` (LDAP SYNC relationships)
