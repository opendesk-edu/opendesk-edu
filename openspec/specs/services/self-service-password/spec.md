<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Self-Service Password (LTB SSP)

## Purpose

LDAP password reset tool allowing users to change their OpenLDAP password
without helpdesk intervention, reducing support ticket volume.

## Requirements

### Requirement: Password reset via LDAP bind

Users SHALL reset their password by authenticating with the current password
and providing a new password meeting LDAP policy requirements.

#### Scenario: Successful password change
- GIVEN a user who knows their current password
- WHEN the user enters the current password and a new valid password
- THEN the LDAP password is updated in OpenLDAP
- AND the user can immediately authenticate with the new password

#### Scenario: Password policy enforcement
- GIVEN a user attempting to set a weak password
- WHEN the password does not meet LDAP password policy
- THEN the change is rejected
- AND an error message indicates the policy violation


## Depends On

OpenLDAP

## Integrates With

Nubus Portal (tile), Keycloak (user must have valid LDAP account)
## Component Reference

| Property | Value |
|---------|:------|
| Auth | LDAP bind |
| Database | None |
| Storage | None |
| License | GPL-3.0 |
