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
- Namespace: `opendesk`

## HRZ Cluster Context

### Cluster Details

| Property | Value |
|----------|-------|
| Kubernetes | K3s v1.32.3 |
| OS | Debian 12 |
| Control Plane | 3 nodes (vhrz2331-2333) |
| Workers | 6 nodes (vhrz2334-2339) |
| Container Runtime | containerd 2.0.4-k3s2 |
| Ingress IP | 192.168.3.201 |
| Storage (DB) | `ceph-rbd-ssd` (RWO) |
| Storage (files) | `ceph-cephfs-hdd-ec` (RWX) |
| Backup target | `s3:https://s3.hrz.uni-marburg.de/backups` |
| Ingress Controller | HAProxy (primary) + nginx-ingress (secondary) |
| GitOps | ArgoCD |

### Active Namespaces

`argocd`, `buildkit`, `ceph-csi-cephfs`, `ceph-csi-rbd`, `default`,
`ingress-nginx`, `kube-node-lease`, `kube-public`, `kube-system`,
`opendesk`, `testing`, `traefik`

### Environment-Specific Overrides

All environments inherit from `helmfile/environments/default/` which contains:
- `global.yaml.gotmpl` — Domain, storage classes, ingress IP, cluster domain
- `databases.yaml.gotmpl` — Database engine type selection and credentials
- `objectstores.yaml.gotmpl` — MinIO/S3 endpoints and credentials
- `secrets.yaml.gotmpl` — All derived passwords (MASTER_PASSWORD-based)
- `resources.yaml.gotmpl` — CPU/memory limits and requests per component
- `replicas.yaml.gotmpl` — Per-component replica counts
- `images.yaml.gotmpl` — Container image registries, repos, and tags

### Known HRZ DNS Quirks

The HRZ CoreDNS configuration has limitations that require workarounds for
certain DNS resolution scenarios.

#### Issue: External CNAME Chain Resolution Failures

**Problem**: HRZ CoreDNS fails to resolve external CNAME chains that are 2+
hops deep from the internal DNS server.

**Example**: Resolving `www-proxy2.uni-marburg.de` → `(CNAME) www-proxy2` → 
`(A) 137.248.1.8` fails if done from within the cluster because CoreDNS
cannot follow the CNAME chain beyond the first hop.

**Workaround**: Use `hostAliases` in pod specs to hardcode the resolved IP
addresses for internal services that need to resolve external hostnames.

**Example `hostAliases` (YAML snippet)**:
```yaml
hostAliases:
  - ip: "137.248.1.8"
    hostnames:
      - "www-proxy2.uni-marburg.de"
      - "proxy02.hrz.uni-marburg.de"
```

#### Issue: Ingress Controller IP Conflict

**Problem**: HAProxy and nginx-ingress both share the same external IP
`192.168.3.201`, causing routing confusion for certain ingress resources.

**Workaround**: Use explicit `ingressClassName` in all Ingress resources:
- HAProxy resources: `ingressClassName: haproxy`
- nginx-ingress resources: `ingressClassName: nginx`

**Note**: Some upstream charts default to `kubernetes.io/ingress.class: nginx`
annotation; this must be overridden when using HAProxy (e.g., Planka chart).

#### Issue: Proxy Resolution for Pods Needing Internet Access

**Problem**: Pods that need internet access for API calls (e.g., capabilities
checks, external web services) cannot resolve `www-proxy2.uni-marburg.de`
due to the CoreDNS CNAME chain failure.

**Workaround**: Add `hostAliases` with the proxy IP to affected pods OR use the
IP directly `http://137.248.1.8:3128` instead of DNS hostname.

**Example usage**:
```yaml
env:
  - name: HTTP_PROXY
    value: "http://137.248.1.8:3128"  # Use IP directly instead of DNS
```
- `ingress.yaml.gotmpl` — Ingress class and per-service body timeouts
- `selinux.yaml.gotmpl` — SELinux label overrides per component
- `annotations.yaml.gotmpl` — Otterize, Prometheus, and Grafana annotations
- `turn.yaml.gotmpl` — TURN server configuration for Jitsi
- `sip.yaml.gotmpl` — SIP server configuration for Jigasi (disabled by default)
