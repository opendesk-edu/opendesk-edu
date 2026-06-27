<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# BigBlueButton (Greenlight v3)

## Purpose

Teaching-optimized video conferencing platform based on Greenlight v3 (Ruby on Rails)
with built-in recording, whiteboard annotation, breakout rooms, session management,
and SAML 2.0 authentication via Shibboleth SP through Keycloak. Deployed as a
custom Docker image with integrated Shibboleth SP daemon.

BigBlueButton uses a separate BBB backend server for actual conferencing
(WebRTC, media processing), while Greenlight provides the web management
interface for room creation, scheduling, and recording management.

## Scope

This spec defines:
- ✅ **In scope**: Greenlight web interface deployment, SAML 2.0 authentication via Shibboleth SP, Docker image integration, room creation, recording management
- ❌ **Out of scope**: BBB backend server deployment (managed separately), standard video conferencing (see Jitsi), GPU-accelerated transcription (planned future)

## Non-Goals

- Standard video conferencing (see `../jitsi/spec.md`)
- GPU-accelerated transcription (planned future feature)
- BBB backend server deployment (managed separately, not in this chart)

## Requirements

### Requirement: SAML 2.0 authentication via Shibboleth SP

BigBlueButton SHALL authenticate users via Shibboleth SAML 2.0 Service Provider,
with SP-initiated SSO through Keycloak.

#### Scenario: Student joins BBB session
- GIVEN a student accessing BBB via portal tile
- WHEN the student navigates to BBB
- THEN BBB redirects to Keycloak via Shibboleth SP-initiated SSO
- AND upon authentication, SAML attributes map to the Greenlight user profile
- AND the student can join assigned rooms

#### Scenario: Greenlight SAML registration
- GIVEN `DEFAULT_REGISTRATION: "saml"`
- WHEN a user first authenticates via SAML
- THEN Greenlight creates a user account from SAML attributes
- AND the user's identity is linked to their Keycloak account

#### Scenario: BoldChat SAML provider
- GIVEN the BoldChat SAML configuration enabled
- THEN the SAML provider label is "OpenDesk Login"
- AND the SSO target URL is `https://id.opendesk.<domain>/realms/opendesk/protocol/saml`
- AND the SP entity ID is `https://bbb.opendesk.<domain>/shibboleth`
- AND SLO (Single Logout) is configured via Keycloak SAML endpoint
- AND allowed clock drift is 120 seconds
- AND SAML certificates are mounted from `/etc/shibboleth/shib-cert.pem` and `shib-key.pem`

### Requirement: Recording and playback

BBB SHALL support session recording with persistent storage and playback.

#### Scenario: Instructor starts recording
- GIVEN an instructor starting a recorded BBB session
- WHEN the session begins
- THEN the session is recorded (video, audio, whiteboard, chat)
- AND recordings are stored on the RWX PVC (`bbb-recordings`, 500Gi, CephFS)
- AND recordings survive pod restarts and scheduling changes

#### Scenario: Recording access control
- GIVEN `boldchat.recordings.require_login: false`
- AND `boldchat.recordings.allow_guests: false`
- THEN only authenticated users can access recordings
- AND unauthenticated users cannot view recordings

#### Scenario: Recording storage on CephFS
- GIVEN the BBB recordings PVC configured
- THEN storage class is `ceph-cephfs-hdd-ec` (erasure-coded, cost-effective for media)
- AND access mode is `ReadWriteMany` (multiple pods may need access)

### Requirement: Breakout rooms

BBB SHALL support breakout rooms for group-based teaching activities.

#### Scenario: Instructor creates breakout rooms
- GIVEN an instructor with a large class session
- WHEN the instructor creates breakout rooms
- THEN students are assigned to separate virtual rooms
- AND the instructor can move between rooms
- AND the instructor can broadcast messages to all rooms

### Requirement: BBB backend integration

Greenlight SHALL communicate with the BBB backend server via API.

#### Scenario: Room creation
- GIVEN an instructor creating a new room in Greenlight
- WHEN the room is created
- THEN Greenlight calls the BBB backend API to create the meeting
- AND `BIGBLUEBUTTON_ENDPOINT` and `BIGBLUEBUTTON_SECRET` are used for authentication

#### Scenario: BBB backend configuration
- GIVEN `bigbluebuttonEndpoint` and `bigbluebuttonSecret` configured
- THEN Greenlight authenticates with the BBB backend using these credentials
- AND the secret is stored in the `bbb-greenlight-secrets` Kubernetes secret

### Requirement: PostgreSQL persistence

BBB SHALL store room metadata, user preferences, and recording pointers in PostgreSQL.

#### Scenario: Room metadata persistence
- GIVEN an instructor creating rooms and settings
- WHEN data is saved in Greenlight
- THEN all metadata is stored in PostgreSQL (`greenlight` DB)
- AND data survives pod restarts and upgrades

#### Scenario: Secret key base
- GIVEN the Greenlight deployment
- THEN `SECRET_KEY_BASE` is auto-generated (64-char random alphanumeric)
- AND stored in the `bbb-greenlight-secrets` Kubernetes secret

### Requirement: High availability

BBB SHALL support multiple replicas with pod anti-affinity.

#### Scenario: Replica deployment
- GIVEN `replicaCount: 2` (default)
- WHEN the deployment is applied
- THEN 2 Greenlight pods run simultaneously
- AND requests are load-balanced by the ingress controller

### Requirement: Mutual exclusivity with Jitsi

BBB and Jitsi SHALL NOT be deployed simultaneously.

#### Scenario: Only one video service active
- GIVEN both BBB and Jitsi available
- WHEN the environment is applied
- THEN exactly one video conferencing service is deployed

### Requirement: Health probes

BBB SHALL expose liveness and readiness probes on port 80.

#### Scenario: Liveness probe
- GIVEN BBB deployed and running
- THEN a TCP liveness probe on port 80 with 30s initial delay and 10s period
- AND unhealthy pods are restarted

#### Scenario: Readiness probe
- GIVEN BBB deployed and running
- THEN a TCP readiness probe on port 80 with 5s initial delay and 5s period
- AND pods are removed from service when not ready

### Requirement: PDB for availability

BBB SHALL have a PodDisruptionBudget to ensure availability during node maintenance.

#### Scenario: Node drain during maintenance
- GIVEN a PDB configured for Greenlight
- WHEN a node is drained
- THEN at least one Greenlight pod remains available
- AND users can continue creating and joining rooms

## Depends On

Keycloak (SAML 2.0 Shibboleth SP), PostgreSQL (`greenlight` DB), Redis (session cache), RWX PVC (recordings), BBB backend server (media processing, managed separately), HAProxy Ingress, Nubus Portal (tile)

## Integrates With

Nubus Portal (tile, SSO redirect), Keycloak (SAML 2.0), BBB backend (meeting API), Intercom Service (cross-app SSO)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | SAML 2.0 (Shibboleth SP, `DEFAULT_REGISTRATION: "saml"`) |
| Database | PostgreSQL (`greenlight` DB, `greenlight` user) |
| Cache | Redis (Greenlight sessions) |
| Storage | RWX PVC (`bbb-recordings`, 500Gi, `ceph-cephfs-hdd-ec`) |
| License | LGPL-3.0 |
| Config | `databases.bbb.*`, `helmfile/apps/bigbluebutton/values.yaml.gotmpl` |
| Chart | `helmfile/charts/bigbluebutton/` (local chart) |
| Image | `ghcr.io/<your-org>/greenlight-saml:v1.3.0` (custom Shibboleth image) |
| Replicas | 2 (default) |
| Resources | 250m-1000m CPU, 512Mi-1Gi memory |
| Health | TCP port 80 (liveness: 30s/10s, readiness: 5s/5s) |
| PDB | Yes (PodDisruptionBudget) |
| Ingress | HAProxy, 120s timeout (long-lived WebSocket connections) |
