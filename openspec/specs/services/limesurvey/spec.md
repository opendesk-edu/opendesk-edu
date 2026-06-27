<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# LimeSurvey

## Purpose

Survey platform for course evaluations, academic research, institutional feedback,
and student questionnaires. Authenticated via LDAP bind (direct to OpenLDAP,
NOT via Keycloak), with MariaDB backend for survey definitions and responses.

## Scope

This spec defines:
- ✅ **In scope**: LimeSurvey deployment, survey creation and management, question types (single/multi-select, text, Likert scales), response collection configuration, URL-based survey distribution, LDAP authentication, MariaDB backend
- ❌ **Out of scope**: Alternative survey platforms (REDCap, SurveyMonkey, etc.), advanced statistical analysis (R, SPSS, etc.), survey analytics and reporting beyond basic response viewing

## Non-Goals

- Alternative survey platforms (use REDCap, SurveyMonkey, etc.)
- Advanced statistical analysis (use R, SPSS, etc.)

## Requirements

### Requirement: Survey creation and management

LimeSurvey SHALL support creating surveys, adding questions (single/multi-select,
text,Likert scales), configuring response collection settings (public vs.
authenticated, one-time vs. multiple responses), and distributing surveys via URL.

#### Scenario: Instructor creates survey
- GIVEN an instructor with an LDAP account in the `limesurvey-admins` group
- WHEN the instructor logs in via LDAP bind to `limesurvey.opendesk.hrz.uni-marburg.de`
- THEN the instructor can create a new survey
- AND can add questions (question types: single-choice, multi-choice, text textarea, Likert scales)
- AND can configure response collection:
  - "Public survey" (no auth required)
  - "Authenticated only" (guest access disabled)
  - "One-time responses" (prevent re-submission)
- AND can distribute the survey via URL (`/limesurvey/index.php/survey/{surveyId}/newtest`)

#### Scenario: Student completes survey
- GIVEN a student with an LDAP account accessing an active survey
- WHEN the student submits responses
- THEN responses are stored in the `limesurvey` MariaDB DB
- AND the survey is anonymous (unless configured to collect user ID)
- AND the student cannot resubmit (if one-time responses configured)

### Requirement: LDAP bind authentication (NOT OIDC)

LimeSurvey SHALL authenticate via **direct LDAP bind** to OpenLDAP, NOT via
Keycloak OIDC.

LimeSurvey's LDAP plugin binds to OpenLDAP at
`ldap://opendesk-ldap.opendesk-hrz.uni-marburg.de` and verifies credentials.

#### Scenario: LDAP bind authentication
- GIVEN a user with an LDAP account `student123`
- WHEN the user logs in to LimeSurvey
- THEN LimeSurvey's LDAP plugin attempts a bind to OpenLDAP:
  - Bind DN: `uid=student123,ou=users,dc=opendesk,dc=opendesk-hrz,dc=uni-marburg,dc=de`
  - Bind password: user-supplied password
- AND if the bind succeeds, the user is logged in
- AND LimeSurvey imports user attributes (mail, displayName) from LDAP
- AND if the bind fails (wrong password), authentication fails

### Requirement: Persistent MariaDB storage

LimeSurvey SHALL store all content in MariaDB:
- Survey definitions (questions, options, logic)
- Responses (submitted answers)
- User profiles (imported from LDAP)
- Audit logs

#### Scenario: Content persistence
- GIVEN a LimeSurvey deployment with MariaDB
- WHEN an instructor creates a survey and students submit responses
- THEN all data is stored in the `limesurvey` MariaDB DB
- AND persists across pod restarts, upgrades, and database migrations

### Requirement: Anonymous survey responses

LimeSurvey SHALL support anonymous survey responses (user IDs NOT stored) by
default.

#### Scenario: Anonymous response collection
- GIVEN a survey configured for anonymous responses
- WHEN a student submits responses
- THEN the MariaDB response table does NOT store the user ID
- AND responses cannot be traced back to individual students
- AND this satisfies data protection requirements (GDPR)

## Component Reference

| Component | Purpose | Replicas | Storage |
|-----------|---------|----------|---------|
| LimeSurvey Web | PHP-FPM backend (Apache) | 1 | RWO PVC (MariaDB data) |
| MariaDB | Survey data storage | 1 (StatefulSet) | RWO PVC (8Gi) |
| Chart | Upstream LimeSurvey (OCI registry: `opencode.de`) |

## Security Context

| Component | RunAsUser | Capabilities | Seccomp |
|-----------|-----------|--------------|---------|
| LimeSurvey Web | 33 (www-data) | drop: ALL | RuntimeDefault |
| MariaDB | 999 (mysql) | drop: ALL | RuntimeDefault |

## Configuration Reference

| Property | Value |
|----------|-------|
| LDAP server | `ldap://opendesk-ldap.opendesk-hrz.uni-marburg.de` |
| LDAP bind DN pattern | `uid={username},ou=users,dc=opendesk,dc=opendesk-hrz,dc=uni-marburg,dc=de` |
| LDAP attribute mapping | `mail → email`, `displayName → name` |
| LDAP group filter | `(memberOf=cn=limesurvey-admins,cn=groups,...)` |
| MariaDB database | `limesurvey` |
| MariaDB user | `limesurvey` |
| PVC size | 8Gi (mariadb persistence) |
| Storage class | `ceph-rbd-ssd` |

## Known Quirks

- **Direct LDAP bind**: LimeSurvey does NOT use Keycloak OIDC. It directly binds
  to OpenLDAP. This means user profiles are NOT synced via Keycloak group attributes.
- **Embedded MariaDB**: The LimeSurvey chart includes an embedded MariaDB
  StatefulSet (NOT the shared MariaDB cluster). This is self-contained.
- **Anonymous by default**: Surveys are anonymous by default. Data protection
  compliance is achieved automatically (no user ID storage in responses).

## Depends On

OpenLDAP (direct bind), MariaDB (separate database),
HAProxy Ingress

## Integrates With

Nubus Portal (tile, not role-based — LDAP group filter)
