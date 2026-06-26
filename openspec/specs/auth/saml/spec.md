<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# SAML 2.0 Authentication

## Purpose

SAML 2.0 Service Provider authentication via Shibboleth SP for applications
that do not natively support OIDC: ILIAS, Moodle, BigBlueButton, BookStack, Zammad.

## Non-Goals

- OIDC-based authentication (see `../oidc/spec.md`)
- Federation with external SAML IdPs (see `../federation/spec.md`)

## Requirements

### Requirement: Shibboleth SP SSO

Applications that do not support OIDC SHALL authenticate via SAML 2.0
SP-initiated SSO with Keycloak as the SAML IdP.

#### Scenario: Student accesses ILIAS via SAML
- GIVEN a student with an active OpenLDAP account
- WHEN the student navigates to the ILIAS URL
- THEN ILIAS (Shibboleth SP) initiates SAML SSO
- AND the student is redirected to Keycloak's SAML IdP endpoint
- AND upon authentication, Keycloak returns a SAML assertion
- AND ILIAS maps SAML attributes to the local user profile

#### Scenario: SAML attribute mapping
- GIVEN a SAML assertion received from Keycloak
- THEN the following attributes SHALL be mapped:
  - `mail` to the user's email address
  - `displayName` to the user's display name
  - `eduPersonAffiliation` to group memberships

#### Scenario: SAML session timeout
- GIVEN a user with an expired SAML session
- WHEN the user accesses a SAML-protected application
- THEN the user is redirected to Keycloak for re-authentication

### Requirement: SAML application isolation

Each SAML application SHALL have its own Service Provider configuration in Keycloak.
SAML sessions SHALL NOT grant access to non-SAML applications.

#### Scenario: SAML session does not grant OIDC access
- GIVEN a user authenticated via SAML to ILIAS
- WHEN the user navigates to Nextcloud (OIDC)
- THEN a separate OIDC authentication is required
- AND the SAML session is NOT reused

## Service Registry

Applications using SAML auth: ILIAS, Moodle, BigBlueButton, BookStack, Zammad.
