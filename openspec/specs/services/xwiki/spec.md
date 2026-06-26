<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# XWiki

## Purpose

Knowledge management and wiki platform with OIDC authentication, PostgreSQL
backend, and LDAP group synchronization for multi-wiki setups.

## Non-Goals

- Newsfeed integration (see integration specs)

## Requirements

### Requirement: Wiki page management

Users SHALL create, edit, and organize pages in wiki structures with
sub-wiki support.

#### Scenario: Page persistence
- GIVEN a user creating a wiki page
- WHEN the page is saved
- THEN the page is stored in PostgreSQL
- AND the page is accessible to authorized users

#### Scenario: Multi-wiki support (PostgreSQL)
- GIVEN XWiki configured with PostgreSQL
- WHEN sub-wikis are created
- THEN sub-wiki data is stored as separate schemas within a single database
- AND root access is NOT required (unlike MariaDB)

### Requirement: Daily LDAP group synchronization

XWiki SHALL synchronize LDAP groups on a daily schedule via the LDAP Group Import
Job and Mapped Groups Daily Updater.

#### Scenario: Group sync
- GIVEN users who are direct members of XWiki-authorized LDAP groups
- WHEN the nightly job runs
- THEN those users are imported into XWiki
- AND mapped groups are updated

## Component Reference

| Property | Value |
|:---------|:------|
| Auth | OIDC |
| Database | PostgreSQL (`xwiki` DB, `xwiki_user`) |
| License | LGPL-2.1 |
| Config | `databases.xwiki.*` |
