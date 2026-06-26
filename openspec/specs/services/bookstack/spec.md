<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# BookStack

## Purpose

Structured knowledge base with book/chapter/page hierarchy for course materials,
SOPs, and documentation. Authenticated via SAML 2.0 (Shibboleth SP) with
MariaDB backend. Supports rich text editing, image uploads, and
role-based access control.

## Requirements

### Requirement: Hierarchical knowledge structure

Users SHALL organize content as Books containing Chapters containing Pages.

#### Scenario: User browses knowledge base
- GIVEN an authenticated user with BookStack access
- WHEN the user navigates to the BookStack portal tile
- THEN the user is authenticated via SAML SSO
- AND can browse books, chapters, and pages

#### Scenario: Rich text editing
- GIVEN a user editing a page
- THEN the WYSIWYG editor supports rich text formatting
- AND image uploads are supported

### Requirement: Persistent MariaDB storage

BookStack SHALL store all content in MariaDB.

#### Scenario: Content persistence
- GIVEN a user creating or editing a page
- WHEN changes are saved
- THEN content is stored in MariaDB
- AND persists across pod restarts

## Depends On

Keycloak (SAML 2.0 Shibboleth SP), MariaDB (`bookstack` DB), HAProxy Ingress, Nubus Portal (tile)

## Integrates With

Nubus Portal (tile)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | SAML 2.0 (Shibboleth SP) |
| Database | MariaDB (`bookstack` DB, `bookstack` user) |
| Storage | None (images in MariaDB) |
| Cache | None |
| License | MIT |
| Config | `databases.bookstack.*` |
