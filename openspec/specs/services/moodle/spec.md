<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Moodle

## Purpose

Plugin-rich learning management system (LMS) with Shibboleth authentication,
providing assignments, workshops, gradebook, and extensive plugin ecosystem.

## Non-Goals

- Alternative LMS (see `../ilias/spec.md`)

## Requirements

### Requirement: Shibboleth authentication

Moodle SHALL authenticate users via Shibboleth SP SSO through Keycloak.

#### Scenario: Student accesses Moodle
- GIVEN a student enrolled in Moodle courses
- WHEN the student navigates to the Moodle portal tile
- THEN Moodle redirects to Keycloak via Shibboleth SP
- AND upon authentication, Moodle maps SAML attributes to the user profile

### Requirement: Persistent PostgreSQL storage

Moodle SHALL store course data, grades, and user preferences in PostgreSQL.

#### Scenario: Grade persistence
- GIVEN an instructor recording grades in Moodle's gradebook
- WHEN grades are saved
- THEN they are stored in PostgreSQL
- AND grades persist across pod restarts and upgrades

## Component Reference

| Property | Value |
|:---------|:------|
| Auth | Shibboleth SP |
| Database | PostgreSQL (`moodle` DB, `moodle_user`) |
| Storage | RWX PVC |
| License | GPL-3.0 |
| Config | `databases.moodle.*` |
| Alternative to | ILIAS |
