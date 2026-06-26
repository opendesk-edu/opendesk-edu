<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# CryptPad

## Purpose

End-to-end encrypted collaborative editor for diagram documents, accessed
through Nextcloud. CryptPad provides E2E encryption at the application
layer — the server cannot read document content. Supports diagram editing
(diagram pad type) with registration restricted to authenticated access.

## Non-Goals

- Standalone document editing outside Nextcloud (integration-only)
- Rich text / code / slide / spreadsheet pads (diagram only in openDesk)

## Requirements

### Requirement: Encrypted diagram editing via Nextcloud

CryptPad SHALL edit diagram documents within Nextcloud with end-to-end
encryption.

#### Scenario: User edits diagram in Nextcloud
- GIVEN a user opening a diagram file in Nextcloud
- WHEN the user clicks to edit
- THEN CryptPad loads within Nextcloud via Nextcloud Cryptpad app
- AND the document is encrypted end-to-end (server cannot read content)
- AND deactivating public access would break the Nextcloud plugin (must keep it enabled)

### Requirement: Registration restriction

CryptPad SHALL restrict new user registration to prevent anonymous access.

#### Scenario: Registration blocked
- GIVEN `restrictRegistration: true`
- WHEN an unauthenticated user tries to create an account
- THEN registration is denied
- AND only authenticated users (via Nextcloud session) can access pads

### Requirement: Stateless storage

CryptPad SHALL run without persistent storage by default.

#### Scenario: No PVC required
- GIVEN `persistence.enabled: false`
- WHEN the pod restarts
- THEN encrypted pads are NOT stored locally (they're E2E encrypted blobs)
- AND the Nextcloud Cryptpad app handles persistence

### Requirement: Auto-scaling

CryptPad SHALL support horizontal pod autoscaling for variable load.

#### Scenario: Scale up on high CPU
- GIVEN HPA configured with `targetCPUUtilizationPercentage`
- WHEN CPU usage exceeds the threshold
- THEN new replicas are created within `minReplicas` and `maxReplicas`

## Depends On

Nextcloud (session delegation, Cryptpad app)

## Integrates With

Nubus Portal (tile), Nextcloud (Cryptpad app for document storage)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | None (via Nextcloud session) |
| Database | None |
| Storage | None (`persistence.enabled: false`) |
| Cache | None |
| License | AGPL-3.0 |
| Config | `technical.cryptpad.*`, `helmfile/apps/cryptpad/values.yaml.gotmpl` |
| Chart | Upstream `cryptpad` (OCI: `opencode.de`) |
| Image | `cryptpad/cryptpad:latest` |
| Security | `runAsUser: 4001`, `runAsGroup: 4001`, `fsGroup: 4001`, `capabilities: drop ALL` |
| Available pad types | `diagram` only |
| Auto-scaling | `maxWorkers`, HPA on CPU and memory utilization |
| Workload | Deployment (NOT StatefulSet: `workloadStateful: false`) |
