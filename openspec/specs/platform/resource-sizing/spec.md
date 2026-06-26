<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Resource Sizing Baselines

## Purpose

Defines recommended CPU and memory resource requests and limits for all
openDesk Edu services. These baselines are derived from observed usage in
the HRZ K3s cluster (9 nodes: 3 control-plane, 6 workers) and provide
the minimum viable sizing for production workloads.

## Non-Goals

- Exact cost calculations (depends on node pricing model)
- Development/staging sizing (use lower values)
- Auto-scaling policies (see per-service specs for HPA/VPA configuration)

---

## Resource Policy

- **Requests**: Guaranteed minimum resources — pod is scheduled only when available
- **Limits**: Maximum resources a pod can consume — pod is OOM-killed or CPU-throttled at limit
- **Ratio**: CPU request:limit SHOULD be 1:2 to 1:4 (allow burst without overcommitting)
- **Memory**: Request SHOULD be 70-80% of limit (prevent OOM kills during normal operation)
- **Monitoring**: Alert when `container_memory_working_set_bytes > 85%` of limit for 10 minutes

---

## Service Resource Baselines

### Infrastructure Services

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas | Storage | Notes |
|---------|------------|-----------|----------------|-------------|----------|---------|-------|
| Keycloak | 500m | 2 | 1Gi | 2Gi | 1 | RBD 5Gi | Single instance, no HPA |
| OpenLDAP | 250m | 1 | 256Mi | 512Mi | 1 | RBD 1Gi | Single instance |
| PostgreSQL (shared) | 1 | 2 | 2Gi | 4Gi | 1 | RBD 20Gi | 12 databases on one cluster |
| MariaDB (shared) | 1 | 2 | 2Gi | 4Gi | 1 | RBD 20Gi | 6 databases on one cluster |
| Redis | 250m | 500m | 256Mi | 512Mi | 1 | RBD 1Gi | Single instance, Sentinel optional |
| MinIO | 500m | 2 | 1Gi | 2Gi | 4 | RBD 100Gi (each) | 4-node distributed |
| HAProxy Ingress | 500m | 2 | 256Mi | 1Gi | 2+ | None | DaemonSet on worker nodes |
| Cert Manager | 100m | 250m | 128Mi | 256Mi | 1 | None | |
| CoreDNS | 250m | 500m | 256Mi | 512Mi | 2 | None | |

### Core Services

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas | Storage | Notes |
|---------|------------|-----------|----------------|-------------|----------|---------|-------|
| Nubus Portal | 500m | 1 | 512Mi | 1Gi | 2 | None | Stateless |
| Nextcloud AIO | 1 | 4 | 2Gi | 8Gi | 1 | CephFS 100Gi | Single AIO container (PHP-FPM + Nginx) |
| Nextcloud Notify Push | 100m | 500m | 128Mi | 256Mi | 1 | None | Sidecar, small footprint |
| Nextcloud Exporter | 50m | 100m | 64Mi | 128Mi | 1 | None | Metrics only |
| OpenCloud | 500m | 2 | 1Gi | 2Gi | 2 | CephFS 100Gi | 2 replicas for HA |
| OX AppSuite | 1 | 4 | 2Gi | 4Gi | 2 | CephFS 100Gi | Memory-heavy (Java) |
| SOGo | 500m | 2 | 512Mi | 2Gi | 2 | None | Moderate memory |
| Element (Synapse) | 500m | 2 | 1Gi | 2Gi | 1 | CephFS 50Gi | Federation-aware sizing |
| XWiki | 500m | 2 | 1Gi | 2Gi | 1 | None | Java-based |
| OpenProject | 500m | 2 | 2Gi | 4Gi | 1 | CephFS 50Gi | Ruby + PostgreSQL connection pool |

### Education Services

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas | Storage | Notes |
|---------|------------|-----------|----------------|-------------|----------|---------|-------|
| ILIAS | 500m | 2 | 1Gi | 2Gi | 1 | CephFS 8Gi + CephFS 8Gi | PHP-heavy, Lucene sidecar adds ~512Mi |
| Moodle | 500m | 2 | 1Gi | 2Gi | 2 | CephFS 8Gi | PHP-based, moderate load |
| BigBlueButton (Greenlight) | 250m | 1 | 512Mi | 1Gi | 2 | CephFS 500Gi | Recordings on CephFS |
| Etherpad | 250m | 500m | 256Mi | 512Mi | 1 | RBD 4Gi | Lightweight |
| BookStack | 250m | 500m | 256Mi | 512Mi | 1 | None | Lightweight PHP |

### Collaboration Services

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas | Storage | Notes |
|---------|------------|-----------|----------------|-------------|----------|---------|-------|
| Collabora | 1 | 4 | 2Gi | 4Gi | 2 | None | CPU-heavy (LibreOffice kit), doc isolation |
| CryptPad | 250m | 1 | 512Mi | 1Gi | 1 | None | Node.js, moderate |
| Notes | 100m | 250m | 128Mi | 256Mi | 1 | None | Lightweight |
| Planka | 250m | 500m | 256Mi | 512Mi | 1 | None | Node.js |

### Support Services

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas | Storage | Notes |
|---------|------------|-----------|----------------|-------------|----------|---------|-------|
| Zammad | 500m | 2 | 1Gi | 2Gi | 1 | None | Ruby on Rails |
| LimeSurvey | 250m | 500m | 512Mi | 1Gi | 1 | None | PHP |
| Self-Service Password | 100m | 250m | 128Mi | 256Mi | 1 | None | Lightweight PHP |
| TYPO3 CMS | 500m | 2 | 1Gi | 2Gi | 1 | None | PHP |
| ClamAV (Distributed) | 1 | 2 | 2Gi | 4Gi | 2 | CephFS 10Gi | Memory-heavy (signature DB) |
| Dovecot | 250m | 1 | 512Mi | 1Gi | 2 | CephFS 50Gi | IMAP server |
| Postfix | 100m | 500m | 256Mi | 512Mi | 2 | None | Mail relay |

### Stateless Tools

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas | Storage | Notes |
|---------|------------|-----------|----------------|-------------|----------|---------|-------|
| Draw.io | 100m | 250m | 128Mi | 256Mi | 1 | None | Fully stateless |
| Excalidraw | 100m | 250m | 128Mi | 256Mi | 1 | None | Fully stateless |
| Jitsi | 500m | 2 | 1Gi | 2Gi | 1 | None | Alternative to BBB |

---

## Total Cluster Resource Estimate

### Resource Requests (Guaranteed)

| Category | CPU (cores) | Memory (GiB) |
|----------|-------------|--------------|
| Infrastructure | ~5.5 | ~10 |
| Core Services | ~6.5 | ~22 |
| Education Services | ~3.5 | ~7.5 |
| Collaboration Services | ~2 | ~6.5 |
| Support Services | ~4 | ~12 |
| Stateless Tools | ~0.5 | ~0.75 |
| **Total Requests** | **~22** | **~59** |

### Resource Limits (Maximum)

| Category | CPU (cores) | Memory (GiB) |
|----------|-------------|--------------|
| Infrastructure | ~16 | ~16 |
| Core Services | ~28 | ~55 |
| Education Services | ~13 | ~15 |
| Collaboration Services | ~9 | ~13 |
| Support Services | ~12 | ~24 |
| Stateless Tools | ~1.5 | ~1.5 |
| **Total Limits** | **~80** | **~125** |

### Node Capacity (HRZ Cluster)

- **3 control-plane nodes**: 4 cores, 8GiB each (not for workloads)
- **6 worker nodes**: Variable sizing (verify with `kubectl describe nodes`)
- **Recommended**: Minimum 8 cores, 16GiB per worker node for full Edu deployment
- **Overcommit ratio**: Requests:Capacity SHOULD be < 0.8 for CPU, < 0.9 for memory

---

## Sizing Guidelines

### When to Increase Resources

- Container CPU throttling > 50% of time for 10+ minutes → increase CPU limit
- Container OOM kills occurring → increase memory limit
- liveness/readiness probe failures → investigate before increasing (usually not a resource issue)
- High P99 latency (> 2x P50) → investigate before increasing

### When to Decrease Resources

- Container consistently uses < 20% of CPU limit → decrease CPU request
- Container consistently uses < 30% of memory limit → decrease memory request
- NEVER decrease below observed peak usage + 20% headroom

### Storage Sizing

| Storage Type | Service | Min Size | Growth Rate | Retention |
|-------------|---------|----------|-------------|-----------|
| CephFS RWX | Nextcloud | 100Gi | ~5Gi/month | Indefinite |
| CephFS RWX | BBB Recordings | 500Gi | ~20Gi/month | Configurable retention |
| CephFS RWX | OpenCloud | 100Gi | ~5Gi/month | Indefinite |
| CephFS RWX | Dovecot mail | 50Gi | ~2Gi/month | User-managed |
| CephFS RWX | Element media | 50Gi | ~2Gi/month | Indefinite |
| RBD RWO | PostgreSQL | 20Gi | ~1Gi/month | Indefinite |
| RBD RWO | MariaDB | 20Gi | ~1Gi/month | Indefinite |
| RBD RWO | Keycloak | 5Gi | ~100Mi/month | Indefinite |
| RBD RWO | Redis | 1Gi | ~100Mi/month | N/A (ephemeral) |

---

## Monitoring Resource Usage

Verify resource sizing with these Prometheus queries:

```promql
# CPU utilization per container
rate(container_cpu_usage_seconds_total{namespace="opendesk"}[5m])

# Memory utilization per container
container_memory_working_set_bytes{namespace="opendesk"}

# CPU throttling rate
rate(container_cpu_cfs_throttled_periods_total{namespace="opendesk"}[5m])
/ rate(container_cpu_cfs_periods_total{namespace="opendesk"}[5m])

# PVC usage
kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes
```

Alert when any container exceeds 85% of its resource limit for 10+ minutes
(see `monitoring/spec.md` for alert definitions).
