<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Planka

## Purpose

Kanban project management boards for student project management, research
planning, and task tracking. Features OIDC authentication (Keycloak client:
`planka`), PostgreSQL backend, and an intuitive drag-and-drop board interface.

## Requirements

### Requirement: Kanban board management

Users SHALL create boards with lists and cards for project tracking.

#### Scenario: User manages project board
- GIVEN an authenticated user
- WHEN the user navigates to the Planka portal tile
- THEN the user is authenticated via OIDC (client: `planka`)
- AND can create boards, add lists, and manage cards with drag-and-drop

#### Scenario: Card details
- GIVEN a user creating a card
- THEN the card supports labels, due dates, descriptions, checklists, and
  attachments

### Requirement: OIDC authentication

Planka SHALL authenticate via OIDC with Keycloak client `planka`.
Secret stored in `planka-planka-secrets` K8s secret under
`planka-oidc-client-secret` key.

## Depends On

Keycloak (OIDC, client: `planka`), PostgreSQL (`planka` DB), HAProxy Ingress, Nubus Portal (tile)

## Integrates With

Nubus Portal (tile)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | OIDC (client: `planka`) |
| Database | PostgreSQL (`planka` DB, `planka` user) |
| Storage | None |
| Cache | None |
| License | AGPL-3.0 |
| Config | `databases.planka.*`, `helmfile/apps/planka/values.yaml.gotmpl` |
| Chart | Upstream `kola-enterprise/planka` or community |
