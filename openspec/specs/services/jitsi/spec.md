<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Jitsi

## Purpose

Open-source video conferencing for online meetings, supporting screen sharing,
SIP dial-in via Jigasi, and session recording via Jibri. Uses a custom
Keycloak adapter for OIDC authentication with Matrix User Verification Service
(UVS) for secure meeting room validation.

## Non-Goals

- Alternative video conferencing (see `../bigbluebutton/spec.md`)
- TURN server deployment (external infrastructure)
- SIP server / IVR deployment (external infrastructure)

## Requirements

### Requirement: OIDC authentication via Keycloak adapter

Jitsi Meet SHALL authenticate all participants via OIDC using a dedicated
Keycloak adapter sidecar.

The Keycloak client `opendesk-jitsi` SHALL be registered in realm `opendesk`
with scope `opendesk-jitsi-scope`, role `opendesk-jitsi-access-control`, and
group mapping `managed-by-attribute-Videoconference`.

#### Scenario: Authenticated user joins meeting
- GIVEN an authenticated user clicking a Jitsi meeting link
- WHEN the Jitsi Keycloak adapter validates the user's OIDC token
- THEN the user is granted access to the meeting
- AND can participate in audio/video

#### Scenario: Unauthenticated access denied
- GIVEN an unauthenticated user attempting to access Jitsi Meet
- WHEN the Keycloak adapter processes the request
- THEN the user is redirected to Keycloak login
- AND no meeting access is granted without valid OIDC session

### Requirement: Matrix User Verification Service (UVS) integration

The Prosody XMPP server SHALL validate JWT tokens via Element's Matrix User
Verification Service to ensure only authenticated Matrix users can create or
join meeting rooms.

`AUTH_TYPE` SHALL be set to `hybrid_matrix_token` to enable both JWT app
authentication and Matrix UVS power-level sync.

`MATRIX_UVS_SYNC_POWER_LEVELS` SHALL be `true` to synchronize Matrix power
levels with Prosody room ownership.

#### Scenario: Meeting room creation validated via UVS
- GIVEN an authenticated Matrix user creating a Jitsi meeting room
- WHEN Prosody validates the user via Matrix UVS
- THEN the room is created with the user as moderator
- AND power levels are synced from Matrix

### Requirement: Video bridge (JVB) with public IP patching

Jitsi Video Bridge (JVB) SHALL handle media routing with a post-install patch
job (`patchJVB`) that updates the JVB public IP to match the ingress gateway
IP.

The patch job SHALL have a `backoffLimit` of 12 and run with restricted
security context (uid 1001, non-root, ALL capabilities dropped).

JVB SHALL be deployed with 1 replica by default and expose its service on a
dedicated port for media traffic.

#### Scenario: JVB media traffic routed correctly
- GIVEN a Jitsi meeting with multiple participants
- WHEN the patchJVB job has completed successfully
- THEN JVB advertises the correct public IP for media routing
- AND participants can exchange audio/video streams

### Requirement: Jicofo conference focus

Jicofo SHALL allocate JVB resources and manage conference focus for each
meeting. It SHALL run as a Java process with 3GB heap memory and connect to
Prosody via XMPP using authenticated component secrets.

#### Scenario: Conference allocation
- GIVEN a user starting a new Jitsi meeting
- WHEN Jicofo receives the room creation request from Prosody
- THEN Jicofo allocates JVB capacity for the conference
- AND assigns the user as the conference moderator

### Requirement: TURN server for NAT traversal

Jitsi Meet SHALL use an external TURN server for WebRTC NAT traversal.
`TURN_ENABLE` SHALL be `true`.

Prosody SHALL be configured with both TURN (UDP, port 3478) and TURNS (TLS,
port 5349) endpoints, with credentials sourced from environment variable
`TURN_CREDENTIALS`.

#### Scenario: Participant behind NAT joins meeting
- GIVEN a participant behind a symmetric NAT
- WHEN the participant connects to the meeting
- THEN TURN relay is used for media transport
- AND the participant can send/receive audio and video

### Requirement: SIP dial-in via Jigasi (optional)

Jigasi SHALL provide SIP gateway functionality for phone dial-in when
`jigasi.enabled` is `true` (default: `false`).

When enabled, Jigasi SHALL connect to the configured SIP server (TCP, port
5060) and map incoming SIP calls to Jitsi meeting rooms using the
`Jitsi-Conference-Room` SIP header.

Jigasi SHALL support the conference mapper flow for PIN-based room entry.

#### Scenario: Phone participant joins via SIP
- GIVEN Jigasi enabled with a SIP connection
- WHEN a participant dials the configured phone number and enters the room PIN
- THEN the IVR resolves the PIN to a meeting room via the conference mapper
- AND the SIP call is redirected to Jigasi with the room header
- AND the participant joins the meeting via audio-only

#### Scenario: Jigasi disabled by default
- GIVEN a fresh openDesk Edu deployment
- WHEN Jigasi is not explicitly enabled
- THEN no SIP gateway functionality is available
- AND no SIP-related pods are running

### Requirement: Session recording via Jibri (optional)

Jibri SHALL provide meeting recording and live streaming when deployed. It
requires `SYS_ADMIN` capability for Chrome headless screen recording with
shared memory (`/dev/shm`).

#### Scenario: Meeting recording
- GIVEN a moderator starting a recording in Jitsi Meet
- WHEN Jibri captures the meeting output via Chrome headless
- THEN the recording is stored to the configured output directory
- AND the recording file is accessible via the configured storage backend

### Requirement: Data protection configuration

Jitsi Meet SHALL NOT store meeting room history.
`doNotStoreRoom` SHALL be `true`.

Jitsi Meet SHALL disable third-party requests.
`disableThirdPartyRequests` SHALL be `true`.

#### Scenario: No room history persisted
- GIVEN a Jitsi meeting that has ended
- WHEN a user returns to the Jitsi Meet URL
- THEN no previous room history is displayed
- AND no room metadata is persisted server-side

### Requirement: Long-lived ingress connections

The HAProxy ingress for Jitsi Meet SHALL support long-lived WebSocket
connections with a timeout of 3600 seconds for both server and client.

#### Scenario: WebSocket connection stays alive during meeting
- GIVEN a participant in a 60-minute Jitsi meeting
- WHEN the participant's WebSocket connection remains open
- THEN the ingress does not terminate the connection before the meeting ends

### Requirement: Security hardening

The Keycloak adapter container SHALL run as uid 1993 with non-root, read-only
root filesystem, ALL capabilities dropped, and `RuntimeDefault` seccomp
profile.

The JVB, Jicofo, Jigasi, and Web containers SHALL use `RuntimeDefault`
seccomp profiles. Running as root (uid 0) is permitted for media processing
components that require raw socket or device access.

Jibri SHALL be granted only `SYS_ADMIN` capability (required for Chrome
headless recording). All other capabilities SHALL be dropped.

#### Scenario: Keycloak adapter least-privilege
- GIVEN the Jitsi Keycloak adapter container
- WHEN the container starts
- THEN it runs as uid 1993 (non-root)
- AND the root filesystem is read-only
- AND no capabilities are granted

## Depends On

- Keycloak (OIDC, client `opendesk-jitsi`, realm `opendesk`)
- Element/Synapse (Matrix UVS for room validation)
- External TURN server (NAT traversal)
- External SIP server (optional, for Jigasi)
- HAProxy Ingress (long-lived WebSocket timeout)

## Integrates With

- Nubus Portal (tile, group `managed-by-attribute-Videoconference`)
- Element/Synapse (Matrix User Verification Service)

## Component Reference

| Component | Purpose | Default Replicas | Memory Limit |
|-----------|---------|-----------------|-------------|
| Jitsi Meet Web | Frontend UI | 1 | 512Mi |
| Keycloak Adapter | OIDC auth sidecar | 1 | 128Mi |
| Prosody | XMPP server | 1 | (shared) |
| Jicofo | Conference focus / bridge controller | 1 | 3584Mi |
| JVB (Video Bridge) | Media routing | 1 | 3584Mi |
| Jigasi | SIP gateway (disabled by default) | 1 | 3584Mi |
| Jibri | Recording (SYS_ADMIN required) | 1 | 3Gi + 2Gi /dev/shm |
| patchJVB | Post-install IP patch job | — | — |
