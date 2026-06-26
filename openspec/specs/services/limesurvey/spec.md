<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# LimeSurvey

## Purpose

Survey platform for course evaluations, academic research, and institutional
feedback. Authenticated via LDAP bind (NOT OIDC), with MariaDB backend
for survey definitions and responses.

## Requirements

### Requirement: Survey creation and response collection

Authenticated users SHALL create surveys, distribute them, and collect
responses.

#### Scenario: Instructor creates survey
- GIVEN an instructor with an LDAP account
- WHEN the instructor logs in via LDAP bind
- THEN the instructor can create surveys, add questions, and configure
  response collection settings

#### Scenario: Student completes survey
- GIVEN a student with an LDAP account accessing an active survey
- WHEN the student submits responses
- THEN responses are stored in MariaDB
- AND the survey remains anonymous unless configured otherwise

### Requirement: LDAP authentication

LimeSurvey SHALL authenticate via LDAP bind using the OpenLDAP directory.

#### Scenario: LDAP bind authentication
- GIVEN a user with an LDAP account
- WHEN the user logs in
- THEN LimeSurvey performs an LDAP bind to verify credentials
- AND the user's profile is imported from LDAP

## Depends On

OpenLDAP (LDAP bind), MariaDB (`limesurvey` DB), HAProxy Ingress, Nubus Portal (tile)

## Integrates With

Nubus Portal (tile)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | LDAP bind |
| Database | MariaDB (`limesurvey` DB, `limesurvey` user) |
| Storage | None |
| Cache | None |
| License | GPL-2.0 |
| Config | `databases.limesurvey.*` |
