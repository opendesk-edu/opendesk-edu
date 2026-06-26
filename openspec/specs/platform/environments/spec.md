<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Environment Profiles

The platform supports multiple deployment environments. Each environment
overrides specific values while inheriting from the base configuration.

## Environment Hierarchy

```
helmfile/environments/default/     ← Base (all shared config)
  ├─ global.yaml.gotmpl            ← Domain, storage classes, ingress IP
  ├─ databases.yaml.gotmpl         ← All database credentials
  └─ objectstores.yaml.gotmpl     ← S3/MinIO endpoints

helmfile/environments/<env>/       ← Environment overrides
  └─ overrides.yaml.gotmpl         ← Per-env database passwords, feature flags
```

## Profiles

| Property | dev | staging | production |
|----------|-----|---------|------------|
| Domain | `dev.opendesk.hrz.uni-marburg.de` | `staging.opendesk.hrz.uni-marburg.de` | `opendesk.hrz.uni-marburg.de` |
| Storage class (DB) | `ceph-rbd-ssd` | `ceph-rbd-ssd` | `ceph-rbd-ssd` |
| Storage class (files) | `ceph-cephfs-hdd-ec` | `ceph-cephfs-hdd-ec` | `ceph-cephfs-hdd-ec` |
| Backup | Disabled | Enabled (daily) | Enabled (daily) |
| Monitoring | Prometheus only | Prometheus + Grafana | Prometheus + Grafana + Alerting |
| TLS | Self-signed (cert-manager) | Self-signed | Let's Encrypt / institutional cert |
| Ingress class | haproxy | haproxy | haproxy |
| Proxy | `www-proxy2.uni-marburg.de:3128` | `www-proxy2.uni-marburg.de:3128` | `www-proxy2.uni-marburg.de:3128` |
| Namespace | `opendesk-dev` | `opendesk-staging` | `opendesk` |
| Replicas | 1 (most services) | 1 | 2+ (stateful services) |
| Resource limits | Minimal (testing) | Standard | Production-grade |

## Feature Flags

| Flag | dev | staging | production | Affected Services |
|------|-----|---------|------------|-------------------|
| `DEPLOY_JITSI` | yes | yes | yes (or BBB) | Jitsi / BigBlueButton |
| `DEPLOY_BIGBLUEBUTTON` | no | yes | yes (or Jitsi) | BigBlueButton / Jitsi |
| `RUN_TESTS` | yes | yes | on-demand | E2E test pipeline |
| `DEPLOY_ALL_COMPONENTS` | no | no | no | All services |
| `OPENDESK_ENTERPRISE` | no | no | conditional | OX AppSuite |

## Environment-Specific Behavior

### Development
- Single replica for all services
- Self-signed TLS certificates (no external CA required)
- No backup schedule (data is ephemeral)
- Debug logging enabled (`debug.enabled: true`)

### Staging
- Mirror of production configuration
- Self-signed TLS (institutional cert requires manual approval)
- Daily backups enabled
- Reduced replicas (1 per service)

### Production
- Production-grade resource limits and HPA where configured
- Institutional TLS certificate
- Daily backups at 00:42 UTC
- Alertmanager routing to HRZ ops team
- Brute-force protection enabled (NEVER disabled)
