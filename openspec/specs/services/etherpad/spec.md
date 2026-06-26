<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Etherpad

## Purpose

Real-time collaborative document editor for meeting notes, workshops, and live
editing sessions, with OIDC authentication and PostgreSQL backend.

## Requirements

### Requirement: Real-time collaborative editing

Multiple users SHALL edit the same Etherpad simultaneously without conflicts.

#### Scenario: Concurrent editing
- GIVEN two authenticated users accessing the same pad
- WHEN both users type simultaneously
- THEN changes appear in real-time for both users
- AND no conflict resolution is needed

### Requirement: OIDC authentication

Etherpad SHALL authenticate users via OIDC.

#### Scenario: User accesses Etherpad
- GIVEN an authenticated user
- WHEN the user navigates to the Etherpad portal tile
- THEN the user is authenticated via OIDC
- AND can create and edit pads

## Component Reference

| Property | Value |
|:---------|:------|
| Auth | OIDC |
| Database | PostgreSQL (`etherpad` DB, `etherpad_user`) |
| License | Apache-2.0 |
| Config | `databases.etherpad.*` |
