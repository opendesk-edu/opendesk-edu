<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# LimeSurvey

## Purpose

Survey platform for course evaluations, academic research, and institutional
feedback, with LDAP bind authentication and MariaDB backend.

## Requirements

### Requirement: Survey creation and response collection

Users SHALL create surveys, distribute them, and collect responses.

#### Scenario: Student completes survey
- GIVEN a student with an LDAP account
- WHEN the student accesses an active LimeSurvey survey
- THEN the student is authenticated via LDAP bind
- AND can submit responses
- AND responses are stored in MariaDB


## Depends On

Keycloak (LDAP bind), MariaDB, OpenLDAP

## Integrates With

Nubus Portal (tile)
## Component Reference

| Property | Value |
|:---------|:------|
| Auth | LDAP bind |
| Database | MariaDB (`limesurvey` DB, `limesurvey_user`) |
| License | GPL-2.0 |
| Config | `databases.limesurvey.*` |
