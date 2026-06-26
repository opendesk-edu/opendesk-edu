<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# OIDC Authentication

## Purpose

OpenID Connect authentication flow between Keycloak and OIDC-capable
applications (Nextcloud, OpenCloud, OX App Suite, SOGo, OpenProject, XWiki,
Element, Jitsi, Planka, Notes, TYPO3).

## Non-Goals

- SAML-based authentication (see `../saml/spec.md`)
- LDAP bind authentication (see `../ldap/spec.md`)
- Federation with external IdPs (see `../federation/spec.md`)

## Requirements

### Requirement: Keycloak as sole OIDC provider

All OIDC-capable applications SHALL delegate authentication to Keycloak.
Applications SHALL NOT implement their own authentication mechanisms.

#### Scenario: Unauthenticated user redirected to Keycloak
- GIVEN a user without an active session accessing an OIDC application
- WHEN the application receives the request
- THEN the application redirects the user to Keycloak's authorization endpoint
- AND upon successful authentication, Keycloak redirects back with an authorization code

#### Scenario: Token validation
- GIVEN an application receiving an OIDC callback with an authorization code
- WHEN the application exchanges the code for tokens
- THEN the application validates the ID token signature against Keycloak's JWKS endpoint
- AND rejects the token if signature validation fails

### Requirement: Single sign-on across applications

A user authenticated in one OIDC application SHALL be able to access any other
OIDC application without re-authentication within the session lifetime.

#### Scenario: Session reuse across apps
- GIVEN a user authenticated in Nextcloud
- WHEN the user navigates to OpenProject
- THEN OpenProject redirects to Keycloak
- AND Keycloak recognizes the existing session
- AND the user is redirected back to OpenProject without entering credentials

### Requirement: Group-based access enforcement

Applications SHALL enforce access control based on Keycloak group memberships
derived from OpenLDAP federation.

#### Scenario: User in authorized group
- GIVEN a user who is a direct member of the application's authorized Keycloak group
- WHEN the user authenticates
- THEN the application grants access

#### Scenario: User not in authorized group
- GIVEN a user who is NOT a member of the application's authorized Keycloak group
- WHEN the user authenticates
- THEN the application denies access

## Service Registry

Applications using OIDC auth: Nextcloud, OpenCloud, OX App Suite, SOGo, OpenProject,
XWiki, Element, Jitsi, Planka, Notes, TYPO3, Collabora (delegated via Nextcloud),
CryptPad (delegated via Nextcloud).
