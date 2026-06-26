<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Zammad

## Purpose

Multi-channel helpdesk and ticketing system for IT support with SAML
authentication, PostgreSQL backend, and Redis cache.

## Requirements

### Requirement: Multi-channel ticketing

Zammad SHALL support ticket submission via email, chat, phone, and web form.

#### Scenario: User submits ticket
- GIVEN an authenticated user
- WHEN the user navigates to the Zammad portal tile
- THEN the user is authenticated via SAML SSO
- AND can create and track support tickets

#### Scenario: Redis for search performance
- GIVEN Zammad deployed
- THEN Redis SHALL be available at `redis-headless:6379`
- AND Zammad uses Redis for full-text search indexing

## Component Reference

| Property | Value |
|:---------|:------|
| Auth | SAML 2.0 (Shibboleth SP) |
| Database | PostgreSQL (`zammad` DB, `zammad_user`) |
| Cache | Redis (`redis-headless:6379`) |
| License | AGPL-3.0 |
| Config | `databases.zammad.*`, `cache.zammad.*` |
