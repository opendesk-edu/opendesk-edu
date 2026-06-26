<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Planka

## Purpose

Kanban project boards for student project management, research planning, and task
tracking, with OIDC authentication (Keycloak client: `planka`) and PostgreSQL backend.

## Requirements

### Requirement: Kanban board management

Users SHALL create boards with lists and cards for project tracking.

#### Scenario: User manages project board
- GIVEN an authenticated user
- WHEN the user navigates to the Planka portal tile
- THEN the user is authenticated via OIDC (client: `planka`)
- AND can create boards, add lists, and manage cards


## Depends On

Keycloak (OIDC, client: planka), PostgreSQL

## Integrates With

Nubus Portal (tile)
## Component Reference

| Property | Value |
|:---------|:------|
| Auth | OIDC (client: `planka`) |
| Database | PostgreSQL (`planka` DB, `planka_user`) |
| License | AGPL-3.0 |
| Config | `databases.planka.*` |
