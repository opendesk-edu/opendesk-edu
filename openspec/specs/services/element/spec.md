<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
 SPDX-License-Identifier: Apache-2.0
-->

# Element (Matrix/Synapse)

## Purpose

Secure instant messaging platform via Element Web frontend and Synapse homeserver,
with OIDC authentication and PostgreSQL backend.

## Non-Goals

- Jitsi video conferencing (separate service)
- Federation configuration with other Matrix homeservers

## Requirements

### Requirement: Real-time messaging

Users SHALL send and receive messages in real-time via the Matrix protocol.

#### Scenario: Message delivery
- GIVEN two authenticated users in a 1:1 or group chat
- WHEN user A sends a message
- THEN the message is delivered through Synapse to user B in real-time

### Requirement: Direct audio/video calling

Users SHALL make direct audio and video calls via WebRTC through Element.

#### Scenario: 1:1 video call
- GIVEN two users in a 1:1 chat
- WHEN one user initiates a video call
- THEN the other user receives a call notification
- AND the call is established via WebRTC

### Requirement: Nordeck meeting room integration

Element SHALL integrate Nordeck widgets for meeting room management.

#### Scenario: Meeting bot manages rooms
- GIVEN the `meeting-bot` Matrix account configured
- WHEN meeting rooms are created or modified
- THEN the Nordeck Meeting-Bot manages room state in Synapse


## Depends On

Keycloak (OIDC), PostgreSQL, MinIO/S3, Redis, Synapse (Matrix)

## Integrates With

Intercom Service (silent login, navigation), Nextcloud (file sharing via Intercom)
## Component Reference

| Property | Value |
|:---------|:------|
| Auth | OIDC |
| Database | PostgreSQL (`matrix` DB, `matrix_user`) |
| License | AGPL-3.0 (Element) / Apache-2.0 (Synapse) |
| Config | `databases.synapse.*` |
