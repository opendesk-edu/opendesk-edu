<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Security

## Purpose

Network policies via Otterize, Helm chart trust chain verification (GPG + Cosign),
seccomp/capability hardening patterns, Pod Security Admission, brute-force
protection enforcement, and HRZ-specific security extensions.

## Non-Goals

- Application-level authorization policies (per-service)
- Backup encryption (see `../backup/spec.md`)

## Requirements

### Requirement: Network policies via Otterize

The platform SHALL enforce network policies by translating Otterize ClientIntent
and ServerIntent resources into Kubernetes NetworkPolicies.

`security.otterizeIntents.enabled` SHALL be `true` in
`helmfile/apps/opendesk-services/values-otterize.yaml.gotmpl`.

#### Scenario: Service access control enforced
- GIVEN Otterize intents operator installed with `security.otterizeIntents.enabled: true`
- WHEN ClientIntent resources define allowed traffic from `nextcloud` to `dovecot`
- THEN a Kubernetes NetworkPolicy allowing only nextcloud pods to access port 143 is created
- AND unauthorized cross-service traffic (e.g., from `moodle` to `dovecot`) is blocked
- AND traffic between non-specified services is denied (deny-by-default)

### Requirement: Helm chart provenance verification

All Helm charts SHALL be verified against GPG keys in `helmfile/files/gpg-pubkeys/`
or Cosign keys in `helmfile/files/cosign-pubkeys/` before deployment.

`values.charts.*.verify` SHALL be `true` for all verified charts.

#### Scenario: GPG-verified deployment
- GIVEN a Helm chart signed with a known OpenCode GPG key
- WHEN helmfile processes the release with `charts.$name.verify: true`
- THEN the chart signature is verified against `files/gpg-pubkeys/opencode.gpg`
- AND the deployment fails if verification fails (`error: signature verification failed`)

#### Scenario: Cosign-verified OX charts
- GIVEN OX Helm charts signed with Cosign
- WHEN charts are deployed via the OX repo
- THEN charts SHALL be verifiable via Cosign using keys in `files/cosign-pubkeys/ox-*.pub`
- AND `cosign verify ... --key files/cosign-pubkeys/ox-*.pub` produces valid output

### Requirement: Pod Security Admission (PSA) enforcement

All pods SHALL conform to Pod Security Standard `baseline` or `restricted`.
Privileged pods SHALL be explicitly exempted with annotations.

Container security context patterns:
- **Least privilege**: Non-root (uid >= 1000), read-only root filesystem, ALL capabilities dropped where possible
- **Hardening**: `RuntimeDefault` seccomp profile, NO NEW PRIVILEGES
- **Exemptions**: Media processing (Jibri, JVB, Jicofo, Prosody) run as uid 0 for raw access; Jibri requires SYS_ADMIN

#### Scenario: Non-root service container
- GIVEN a web service container (e.g., Jitsi Java adapter)
- WHEN the container starts
- THEN it runs as uid 1993 (non-root)
- AND the root filesystem is read-only
- AND `allowPrivilegeEscalation: false`
- AND ALL capabilities are dropped

#### Scenario: Media processing exception
- GIVEN a Jibri container for Chrome headless recording
- WHEN the container starts
- THEN it runs as uid 0 (root required for X11 /dev/video)
- AND has only `SYS_ADMIN` capability (all others dropped)
- AND uses `RuntimeDefault` seccomp profile

### Requirement: Seccomp patterns

All containers SHALL use seccomp profiles from the Kubernetes node's
`RuntimeDefault` unless a custom profile is required.

#### Scenario: Default seccomp applied
- GIVEN a container with `seccompProfile.type: RuntimeDefault`
- WHEN the container executes a syscall blocked by the profile
- THEN the syscall returns EPERM
- AND the container logs the syscall violation

### Requirement: Capability dropping

Containers SHALL drop all Linux capabilities unless explicitly required:

| Capability | Required By | Reason |
|------------|-------------|--------|
| ALL (drop) | Most services | Least privilege |
| SYS_ADMIN | Jibri | Chrome headless (screen recording) |
| CHOWN / FOWNER | Collabora | Document I/O with user isolation |
| SETUID / SETGID | Database pods (MariaDB, PostgreSQL) | Init scripts |

#### Scenario: Capability hardening review
- GIVEN all container security contexts reviewed
- WHEN a container list is generated
- THEN 90%+ of containers have `capabilities.drop: ["ALL"]`
- AND exceptions are documented in service specs

### Requirement: Secret management

All secrets SHALL be stored in Kubernetes secrets, NEVER in values files (even
templated). Derived passwords use `derivePassword` from `MASTER_PASSWORD` environment.

#### Scenario: Secret not in values
- GIVEN a database password field
- WHEN the password is set
- THEN it is either
  - Derived: `{{ derivePassword 1 "long" (env "MASTER_PASSWORD" | default "sovereign-workplace") "$app" "$key" | sha1sum | quote }}`
  - Or from a `secretKeyRef`: `valueFrom.secretKeyRef.name: "$app-secrets"`

### Requirement: Brute-force protection enforcement

The platform SHALL enforce brute-force protection at the IdP and application
level. Disabling brute-force protection in production is NEVER permitted.

#### Scenario: Keycloak rate limiting
- GIVEN Keycloak configured with brute-force protection
- WHEN more than 30 failed login attempts occur from the same IP in 5 minutes
- THEN subsequent requests from that IP are blocked
- AND the blocking persists for 10 minutes (configurable)

#### Scenario: Nextcloud OCC brute-force protection
- GIVEN `auth.bruteforce.protection.enabled: true` in Nextcloud config
- WHEN the threshold is exceeded
- THEN the IP is blocked via fail2ban-style rules
- AND the admin receives an alert

## Anti-Patterns

- NEVER disable brute-force protection in production
- NEVER ship secrets in values files (use Kubernetes secrets)
- NEVER run pods with `securityContext.privileged: true` unless absolutely required
- NEVER mount host paths or host PIDs
- NEVER use `allowPrivilegeEscalation: true` without documented justification

## Depends On

- Otterize intents operator (`security.otterizeIntents.enabled`)
- Kubernetes PSA (`pod-security.kubernetes.io/enforce: baseline`)
- GPG keys (`helmfile/files/gpg-pubkeys/opencode.gpg`)
- Cosign keys (`helmfile/files/cosign-pubkeys/`)
- Keycloak (brute-force protection extensions)

## Integrates With

- [Security Threat Model](./threat-model/spec.md) (threat mitigations)
- [Compliance Checklists](./security/compliance-checklists/spec.md) (verification steps)
- [Deployment](./deployment/spec.md) (PSA enforcement, security context patterns)
- `../_registry/interconnection-matrix.md` (network dependencies)

## Security Context Patterns by Tier

| Tier | RunAsUser | ReadOnlyRootFS | Capabilities | Seccomp |
|------|-----------|----------------|--------------|---------|
| Critical | > 1000 | true | drop: ALL | RuntimeDefault |
| High | > 1000 (or 0 if required, e.g., Postfix/Dovecot) | true | drop: ALL | RuntimeDefault |
| Standard | > 1000 | false (if writable needed) | drop: ALL | RuntimeDefault |
| Low | > 1000 | false | drop: ALL | RuntimeDefault |
| Exemption (Jibri) | 0 | false | add: SYS_ADMIN | RuntimeDefault |

## Otterize Intent Examples

```yaml
# Client: Nextcloud wants to authenticate against Dovecot IMAP
apiVersion: intent.otoros.io/v1alpha1
kind: ClientIntent
metadata:
  name: nextcloud-dovecot-imap
spec:
  service:
    name: nextcloud
  calls:
    - name: dovecot
      type: pod
      constraints:
        ports:
          - port: 143 # IMAP plain (TLS upgrade)
          - port: 993 # IMAP TLS
```

```yaml
# Server: Dovecot explicitly allowing IMAP traffic
apiVersion: intent.otoros.io/v1alpha1
kind: ServerIntent
metadata:
  name: dovecot-imap
spec:
  service:
    name: dovecot
  type: pod
  port: 143
```
