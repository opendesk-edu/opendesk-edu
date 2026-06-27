<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# BookStack

## Purpose

Structured knowledge base platform with book/chapter/page hierarchy for course
materials, SOPs, and documentation. Authenticated via SAML 2.0 (Keycloak as
Shibboleth SP) with MariaDB backend. Supports rich text editing, image uploads,
WYSIWYG editing, and role-based access control (Admin, Editor, Viewer).

## Scope

This spec defines:
- ✅ **In scope**: BookStack deployment, SAML 2.0 authentication, MariaDB backend, rich text editing, role-based access control (Admin/Editor/Viewer), Book→Chapter→Page hierarchy
- ❌ **Out of scope**: Alternative documentation platforms (toBit, Docusaurus, etc.), multi-site knowledge bases (single-tenant only)

## Non-Goals

- Alternative documentation platforms (use toBit, Docusaurus, etc.)
- Multi-site knowledge bases (single-tenant deployment)

## Requirements

### Requirement: Book → Chapter → Page hierarchy

BookStack content SHALL be organized in a three-level hierarchy:
- **Books** (top level, organized by topic)
- **Chapters** (within a book, organized by module)
- **Pages** (within a chapter, individual content items)

#### Scenario: User browses knowledge base
- GIVEN an authenticated user with BookStack access (role `bookstack-viewer`)
- WHEN the user navigates to `bookstack.opendesk.hrz.uni-marburg.de`
- THEN the user is authenticated via SAML SSO (Keycloak acts as Shibboleth SP)
- AND the user can browse books, expand chapters, and view pages
- AND the navigation sidebar shows the full content tree

#### Scenario: Editor creates content
- GIVEN an authenticated user with `bookstack-editor` role
- WHEN the user creates a new book
- THEN the user can add chapters to the book
- AND pages can be added to chapters
- AND the hierarchy is preserved in MariaDB

### Requirement: SAML 2.0 authentication via Keycloak

BookStack SHALL authenticate via SAML 2.0, with Keycloak acting as the Shibboleth
Service Provider (SP).

The SAML entity ID for BookStack is
`https://bookstack.opendesk.hrz.uni-marburg.de`.

#### Scenario: SAML SP to Keycloak IdP
- GIVEN a user navigating to BookStack
- WHEN BookStack's SAML SP initiates authentication (`/saml2/login`)
- THEN the user is redirected to Keycloak SSO
- AND Keycloak returns a SAML assertion with BookStack claims
- AND BookStack maps the SAML assertion to a local user (auto-provisioned)
- AND the user is logged in without manual account creation

#### Scenario: SAML attribute mapping
- GIVEN a SAML assertion from Keycloak
- THEN BookStack SHALL extract `mail` (email)
- AND `displayName` (display name)
- AND map these to BookStack user properties
- AND the user is assigned the default role (`bookstack-viewer`)

### Requirement: Persistent MariaDB storage

BookStack SHALL store all content (books, chapters, pages, roles, audit logs) in
MariaDB (NOT the shared MariaDB cluster — separate database).

#### Scenario: Content persistence
- GIVEN a BookStack deployment with MariaDB
- WHEN an editor creates or edits a page
- THEN content (HTML, images via BLOB) is stored in the `bookstack` MariaDB DB
- AND persists across pod restarts, upgrades, and database migrations

### Requirement: Rich text / WYSIWYG editing

BookStack editors SHALL use a WYSIWYG HTML editor (summernote or similar)
for page editing.

#### Scenario: Rich text editing
- GIVEN an editor creating a new page
- WHEN the editor opens the page editor
- THEN a WYSIWYG editor is available
- AND supports formatting:
  - Headings (H1, H2, H3)
  - Bold, italic, underline
  - Lists (ordered, unordered)
  - Links, code blocks
  - Image uploads (stored as BLOB in MariaDB)

### Requirement: Role-based access control

BookStack SHALL support three built-in roles:
- **Admin**: Full control, user management, system settings
- **Editor**: Create and edit books/chapters/pages
- **Viewer**: Read-only access

SAML-authenticated users are assigned a default role on first login (typically
`bookstack-viewer`), adjustable via SAML attribute mapping.

#### Scenario: Admin user access
- GIVEN an authenticated user with SAML role claim `bookstack:role=admin`
- WHEN the user logs in
- THEN the user has full administrative access
- AND can manage users and roles

#### Scenario: Auto-provisioned viewer
- GIVEN a new user authenticating via SAML for the first time
- WHEN no explicit role claim is present
- THEN the user is auto-provisioned as `bookstack-viewer`
- AND can read but not edit content

## Component Reference

| Component | Purpose | Replicas | Storage |
|-----------|---------|----------|---------|
| BookStack Web | PHP-FPM backend (nginx/Apache) | 1 | RWO PVC (MariaDB data) |
| MariaDB | Content storage | 1 (StatefulSet) | RWO PVC (2Gi) |
| Chart | `helmfile/charts/bookstack/` (local chart) |

## Security Context

| Component | RunAsUser | Capabilities | Seccomp |
|-----------|-----------|--------------|---------|
| BookStack Web | 33 (www-data) | drop: ALL | RuntimeDefault |
| MariaDB | 999 (mysql) | drop: ALL | RuntimeDefault |

## Configuration Reference

| Property | Value |
|----------|-------|
| SAML entity ID | `https://bookstack.opendesk.hrz.uni-marburg.de` |
| SAML SP endpoint | `/saml2/login` |
| Keycloak SAML IdP URL | `https://keycloak.opendesk.hrz.uni-marburg.de/realms/opendesk/protocol/saml` |
| MariaDB database | `bookstack` |
| MariaDB user | `bookstack` |
| PVC size | 2Gi (mariadb persistence) |
| Storage class | `ceph-rbd-ssd` |

## Known Quirks

- **Images in MariaDB**: BookStack stores uploaded images as BLOB objects in
  MariaDB (not in S3). This is acceptable for small KB images but not for
  large files (>10MB).
- **SAML to Keycloak**: BookStack uses SAML SP that points to Keycloak SAML IdP.
  BookStack does NOT directly integrate with Keycloak OIDC — it uses Shibboleth
  protocol to Keycloak's SAML endpoint.

## Depends On

Keycloak (SAML 2.0 IdP, acting as Shibboleth SP), MariaDB (separate database),
HAProxy Ingress

## Integrates With

Nubus Portal (tile, role mapping `bookstack-editor`)
