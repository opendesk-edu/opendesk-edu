<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Intercom Service

## Purpose

Backend-for-Frontend service enabling cross-application authentication via
silent login, token exchange, and centralized API access for filepicker,
navigation, and newsfeed.

## Non-Goals

- Direct user access to Intercom Service API

## Requirements

### Requirement: Silent login for cross-app auth

Applications SHALL use the Intercom Service to obtain authentication tokens for
other services without requiring the user to re-authenticate.

#### Scenario: OX App Suite accesses Nextcloud Filepicker
- GIVEN a user authenticated in OX App Suite
- WHEN the user invokes the Filepicker to select a Nextcloud file
- THEN the Intercom Service performs a silent login via iframe to Keycloak
- AND returns a valid Nextcloud OIDC token on behalf of the user
- AND the user is NOT prompted to re-authenticate

#### Scenario: Element accesses central navigation
- GIVEN a user authenticated in Element
- WHEN Element requests navigation data
- THEN the Intercom Service fetches navigation from the Portal API
- AND returns the user's authorized application tiles

### Requirement: Central navigation API

The Intercom Service SHALL proxy the Portal's navigation endpoint for frontend
services that cannot call the portal directly.

#### Scenario: Navigation request
- GIVEN a frontend service calling `/navigation.json`
- WHEN the request includes a shared secret and username
- THEN the Intercom Service queries the Portal's
      `/univention/portal/navigation.json` endpoint
- AND returns the user's portal contents as JSON

### Requirement: Newsfeed from XWiki

The Intercom Service SHALL proxy XWiki blog entries for the portal
newsfeed via the `/wiki` endpoint with silent login.

#### Scenario: Portal newsfeed renders
- GIVEN the portal rendering its newsfeed section
- WHEN the portal fetches news items
- THEN the Intercom Service calls XWiki via silent login
- AND XWiki blog entries are displayed in the portal

### Requirement: Shared secret authentication

Frontend services SHALL authenticate to the Intercom Service using a shared
secret passed via request header.

#### Scenario: Unauthenticated request rejected
- GIVEN a request to the Intercom Service without the shared secret
- WHEN the request arrives
- THEN the service returns HTTP 401 Unauthorized

#### Scenario: Invalid secret rejected
- GIVEN a request with an incorrect shared secret
- WHEN the request arrives
- THEN the service returns HTTP 403 Forbidden

### Requirement: Token caching via Redis

The Intercom Service SHALL cache Keycloak tokens in Redis to reduce
authentication overhead for repeated cross-app access.

#### Scenario: Cached token reuse
- GIVEN a user who previously authenticated via Intercom
- WHEN the token is still valid (within Keycloak's token TTL)
- THEN the Intercom Service returns the cached token
- AND no additional Keycloak request is made

#### Scenario: Token refresh
- GIVEN a cached token that has expired
- WHEN a cross-app request arrives
- THEN the Intercom Service performs a fresh silent login
- AND updates the Redis cache with the new token

## Component Reference

| Property | Value |
|---------|:------|
| Auth | Delegates to Keycloak |
| Cache | Redis (`redis-headless:6379`) |
| Part of | Nubus IAM stack |
