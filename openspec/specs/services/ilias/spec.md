<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# ILIAS

## Purpose

Full-featured learning management system (LMS) with SAML SSO, providing
courses, assessments, forums, SCORM support, and S3 object storage for
course materials.

## Non-Goals

- Alternative LMS (see `../moodle/spec.md`)

## Requirements

### Requirement: SAML authentication

ILIAS SHALL authenticate users via SAML 2.0 SP-initiated SSO through Keycloak.

#### Scenario: Student accesses ILIAS
- GIVEN a student enrolled in ILIAS courses
- WHEN the student navigates to the ILIAS portal tile
- THEN ILIAS redirects to Keycloak via SAML SP
- AND upon authentication, ILIAS receives SAML attributes (mail, displayName, eduPersonAffiliation)
- AND the student can access enrolled courses

### Requirement: Persistent PostgreSQL storage

ILIAS SHALL store course data in a dedicated PostgreSQL database.

#### Scenario: Data persistence across restarts
- GIVEN ILIAS deployed with PostgreSQL
- WHEN the application stores course content, assessments, and forums
- THEN data persists across pod restarts and upgrades
- AND the connection uses `databases.ilias.*` configuration

### Requirement: S3 object storage for course materials

ILIAS SHALL store uploaded course materials (files, SCORM packages) in
S3-compatible object storage.

#### Scenario: Course file upload
- GIVEN an instructor uploading course materials
- WHEN the upload completes
- THEN files are stored in the configured S3 bucket (`ilias-data`)
- AND files survive pod eviction

### Requirement: Cron job resilience

ILIAS cron jobs SHALL retry on transient database connection errors.

#### Scenario: Transient connection failure
- GIVEN an ILIAS cron job encountering `Connection refused` on first attempt
- WHEN the job retries
- THEN it retries up to 5 times with 10-second sleep intervals
- AND succeeds if the database becomes available within the retry window


## Depends On

Keycloak (SAML 2.0), PostgreSQL, MinIO/S3

## Integrates With

Nubus Portal (tile), Provisioning API (semester courses), HISinOne (enrollment webhooks)
## Component Reference

| Property | Value |
|:---------|:------|
| Auth | SAML 2.0 (Shibboleth SP) |
| Database | PostgreSQL (`ilias` DB, `ilias_user`) |
| Storage | S3 (`ilias-data` bucket) |
| License | GPL-3.0 |
| Config | `databases.ilias.*`, `objectstores.ilias.*` |
