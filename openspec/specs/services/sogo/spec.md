<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# SOGo (Alternative to OX App Suite)

## Purpose

Email-focused groupware alternative to OX App Suite with modern UI, tight LDAP
integration, OIDC authentication, PostgreSQL backend, and Memcached cache.

## Non-Goals

- OX App Suite features (see `../ox-appsuite/spec.md`)

## Requirements

### Requirement: Mutual exclusivity with OX App Suite

SOGo and OX App Suite SHALL NOT be deployed simultaneously.

#### Scenario: Only one groupware active
- GIVEN both SOGo and OX App Suite charts available
- WHEN the environment configuration is applied
- THEN exactly one groupware service is deployed

### Requirement: OIDC authentication

SOGo SHALL authenticate via OIDC with Keycloak client ID `sogo`.

#### Scenario: User accesses SOGo
- GIVEN an authenticated user
- WHEN the user navigates to the SOGo portal tile
- THEN the user is authenticated via OIDC
- AND email, calendar, and address book are accessible

### Requirement: Calendar support

SOGo SHALL provide calendar management with event creation, editing,
and sharing.

#### Scenario: Calendar event persistence
- GIVEN a user creating a calendar event
- WHEN the event is saved
- THEN the event is stored in PostgreSQL
- AND the event is visible in SOGo's calendar view


## Depends On

Keycloak (OIDC), MariaDB, Redis, OpenLDAP

## Integrates With

Nubus Portal (tile), SMTP Relay (mail delivery)
## Component Reference

| Property | Value |
|:---------|:------|
| Auth | OIDC (client: `sogo`) |
| Database | PostgreSQL (`sogo` DB, `sogo_user`) |
| Cache | Memcached (`memcached:11211`) |
| License | LGPL-2.1 |
| Config | `databases.sogo.*`, `cache.sogo.*` |
| Alternative to | OX App Suite |
