<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# LDAP User Store and Group Synchronization

## Purpose

OpenLDAP as the authoritative user directory, Keycloak LDAP federation, and
LDAP group synchronization to applications. Also covers LDAP bind authentication
for legacy applications.

## Non-Goals

- OIDC token management (see `../oidc/spec.md`)
- SAML attribute mapping (see `../saml/spec.md`)
- LDAP schema design (managed by Nubus upstream)

## Requirements

### Requirement: OpenLDAP as authoritative source

OpenLDAP SHALL be the authoritative user directory. Keycloak SHALL federate
with OpenLDAP for user lookup during authentication.

#### Scenario: User created in OpenLDAP
- GIVEN an administrator creating a user in OpenLDAP
- WHEN the user is assigned a DN and added to groups
- THEN the user is discoverable by Keycloak's LDAP federation
- AND the user can authenticate via any SSO method

### Requirement: No nested group support

Applications performing LDAP group synchronization SHALL NOT resolve nested
group memberships. Users MUST be direct members of the target group.

#### Scenario: Nested group member excluded
- GIVEN a user who is a member of `subgroup-a` which is a member of `app-access-group`
- WHEN the application synchronizes the `app-access-group`
- THEN the user is NOT included
- AND only direct members of `app-access-group` are synchronized

### Requirement: Application group synchronization schedules

Each application SHALL synchronize LDAP groups on its own schedule,
configured via the application's group sync interval.

#### Scenario: Nextcloud sync interval
- GIVEN Nextcloud configured with `background_sync_interval`
- WHEN the interval elapses
- THEN Nextcloud reads all groups enabled for Nextcloud access from Keycloak
- AND updates the local group cache

#### Scenario: XWiki daily sync
- GIVEN XWiki configured with the LDAP Group Import Job
- WHEN the nightly job executes
- THEN XWiki imports all groups enabled for XWiki use
- AND the Mapped Groups Daily Updater processes mapped groups

#### Scenario: OpenProject hourly sync
- GIVEN OpenProject configured with hourly LDAP group synchronization
- WHEN the hour elapses
- THEN OpenProject reads all groups enabled for OpenProject access

### Requirement: LDAP bind authentication

Applications that do not support SAML or OIDC SHALL authenticate via
direct LDAP bind with the user's DN and password.

#### Scenario: LDAP bind authentication
- GIVEN a user with credentials in OpenLDAP
- WHEN the user enters credentials in an LDAP-authenticated application
- THEN the application performs an LDAP bind with the user's DN and password
- AND authentication succeeds if bind completes without `invalidCredentials`
- AND authentication fails if bind returns any error

#### Scenario: Password change propagated
- GIVEN a user who changes their password via Self-Service Password
- WHEN the LDAP password is updated in OpenLDAP
- THEN subsequent LDAP bind attempts succeed with the new password
- AND fail with the old password

## Service Registry

Applications using LDAP: LimeSurvey, Self-Service Password, OpenLDAP consumers
(Nubus, Keycloak, Nextcloud, OpenProject, XWiki, OX App Suite, Dovecot, ILIAS).
