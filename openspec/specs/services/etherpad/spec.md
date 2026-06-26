<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Etherpad

## Purpose

Real-time collaborative document editor for meeting notes, workshops, and
live editing sessions. Uses operational transform (OT) algorithm for
conflict-free concurrent editing. Authenticated via OIDC with PostgreSQL
backend for pad metadata and content.

## Requirements

### Requirement: Real-time collaborative editing

Multiple users SHALL edit the same Etherpad simultaneously without conflicts.

#### Scenario: Concurrent editing
- GIVEN two authenticated users accessing the same pad
- WHEN both users type simultaneously
- THEN changes appear in real-time via operational transform
- AND no conflict resolution is needed by users

### Requirement: OIDC authentication

Etherpad SHALL authenticate users via OIDC with Keycloak.

#### Scenario: User accesses Etherpad
- GIVEN an authenticated user
- WHEN the user navigates to the Etherpad portal tile
- THEN the user is authenticated via OIDC
- AND can create and edit pads
- AND pads are attributed to the authenticated user

### Requirement: Persistent content storage

Pad content SHALL be stored in PostgreSQL for persistence across restarts.

#### Scenario: Pad content persistence
- GIVEN a user editing a pad
- WHEN the pad is saved
- THEN content is stored in PostgreSQL
- AND the pad is accessible after pod restart

## Depends On

Keycloak (OIDC), PostgreSQL (`etherpad` DB), HAProxy Ingress, Nubus Portal (tile)

## Integrates With

Nubus Portal (tile)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | OIDC |
| Database | PostgreSQL (`etherpad` DB, `etherpad` user) |
| Storage | None (pads in PostgreSQL) |
| Cache | None |
| License | Apache-2.0 |
| Config | `databases.etherpad.*` |
| Chart | `helmfile/charts/etherpad/` (local, self-contained with PostgreSQL) |
| Health | Port 9001 |
