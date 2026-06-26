<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Security

## Purpose

Network policies, Helm chart trust chain, Keycloak security extensions,
and Pod Security Admission.

## Non-Goals

- Application-level authorization policies (per-service)
- Backup encryption (see `../backup/spec.md`)

## Requirements

### Requirement: Network policies via Otterize

The platform SHALL enforce network policies by translating Otterize
ClientIntent resources into Kubernetes NetworkPolicies.

#### Scenario: Service access control
- GIVEN Otterize intents operator installed with `security.otterizeIntents.enabled: true`
- WHEN ClientIntent resources define allowed traffic between services
- THEN Kubernetes NetworkPolicies are generated
- AND unauthorized cross-service traffic is blocked

### Requirement: Helm chart provenance verification

All Helm charts SHALL be verified against GPG keys in
`helmfile/files/gpg-pubkeys/` before deployment.

#### Scenario: GPG-verified deployment
- GIVEN a Helm chart signed with a known GPG key
- WHEN helmfile processes the release
- THEN the chart signature is verified
- AND the deployment fails if verification fails

#### Scenario: Cosign-verified OX charts
- GIVEN OX Helm charts signed with Cosign
- THEN charts SHALL be externally verifiable via Cosign using keys in
      `helmfile/files/cosign-pubkeys/`

### Requirement: Brute-force protection

The platform SHALL block authentication requests after exceeding a configurable
threshold of failed attempts from a device or IP address.

#### Scenario: Rate-limited login attempts
- GIVEN more than the configured threshold of failed authentication attempts
- WHEN a new authentication request arrives from the same device/IP
- THEN the request is blocked
- AND blocking persists for the configured cooldown period

### Requirement: New device notification

The platform SHALL notify users via email when authentication succeeds from a
previously unseen device.

#### Scenario: Login from unrecognized device
- GIVEN a user with a known device A
- WHEN the user successfully authenticates from device B
- THEN an email notification is sent to the user's registered address
- AND the notification includes the device identifier and timestamp

## Anti-Patterns

- NEVER disable brute-force protection in production
- NEVER disable CAPTCHA on the Keycloak Extensions proxy
