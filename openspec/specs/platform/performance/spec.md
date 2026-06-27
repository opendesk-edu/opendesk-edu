<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Performance & SLA

## Purpose

Defines Service Level Objectives (SLOs), Service Level Indicators (SLIs), and
performance baselines for all openDesk Edu services, aligned with HRZ's
operational requirements and student semester cycles.

## Non-Goals

- Database-level performance tuning (service-specific, see individual specs)
- CDN/static asset optimization (beyond HAProxy ingress)

## Service Level Objectives (SLOs)

SLOs define the acceptable performance boundaries per service tier:

| Tier | Service Types | Availability | Latency (P95) | Error Rate |
|------|---------------|-------------|----------------|------------|
| **Critical** | IdP, databases, file storage | 99.9% | <100ms | <0.1% |
| **High** | Portal, core services | 99.5% | <250ms | <0.5% |
| **Standard** | LMS, collaboration tools | 99.0% | <500ms | <1.0% |
| **Low** | Supporting tools | TBD | TBD | TBD |

### Critical Tier SLOs

| Service | Availability Target | Latency Target (P95) | Error Rate Target |
|---------|---------------------|----------------------|-------------------|
| Keycloak | 99.9% | <100ms | <0.1% |
| PostgreSQL | 99.9% | <50ms (query) | <0.1% |
| MariaDB | 99.9% | <50ms (query) | <0.1% |
| Redis | 99.9% | <10ms (cache hit) | <0.1% |
| MinIO/S3 | 99.9% | <100ms (object get) | <0.1% |

### High Tier SLOs

| Service | Availability Target | Latency Target (P95) | Error Rate Target |
|---------|---------------------|----------------------|-------------------|
| Nubus Portal | 99.5% | <200ms | <0.5% |
| Intercom Service | 99.5% | <150ms | <0.5% |
| Nextcloud | 99.5% | <250ms | <0.5% |
| OpenCloud | 99.5% | <200ms | <0.5% |
| OX AppSuite | 99.5% | <250ms (IMAP) | <0.5% |
| SOGo | 99.5% | <250ms (IMAP) | <0.5% |
| Element | 99.5% | <300ms (sync) | <0.5% |

### Standard Tier SLOs

| Service | Availability Target | Latency Target (P95) | Error Rate Target |
|---------|---------------------|----------------------|-------------------|
| ILIAS | 99.0% | <500ms (page load) | <1.0% |
| Moodle | 99.0% | <500ms (page load) | <1.0% |
| BigBlueButton | 99.0% | <1000ms (session setup) | <1.0% |
| Jitsi | 99.0% | <1000ms (room join) | <1.0% |
| Collabora | 99.0% | <800ms (document load) | <1.0% |
| XWiki | 99.0% | <500ms (page load) | <1.0% |

## Service Level Indicators (SLIs)

SLIs are the metrics used to measure SLO compliance across the platform.

### Shared SLIs

| SLI | Metric | Target | Monitoring |
|-----|--------|--------|------------|
| **Availability** | Uptime % over 30 days | 99.5%+ (Critical), 99.0%+ (Standard) | Prometheus uptime |
| **Latency** | Request duration (P95) | <500ms (Critical), <1s (Standard) | ServiceMonitor histograms |
| **Error Rate** | HTTP 5xx % over 24h | <0.5% (Critical), <1.0% (Standard) | ServiceMonitor error counts |
| **Database Response** | Query duration (P95) | <100ms | Database exporter |
| **Cache Hit Rate** | Redis cache hit % | >80% | Redis exporter |
| **Disk Usage** | PVC usage % | <80% | Node Exporter + Prometheus Rules |

### Service-Specific SLIs

| Service | Key Metrics | Target | Alert Threshold |
|---------|-------------|--------|-----------------|
| Keycloak | Token issuance latency (P95) | <100ms | >200ms: Warning |
| PostgreSQL | Query latency (P95) | <50ms | >100ms: Warning |
| Nextcloud | File upload latency (average) | <2s (100MB files) | >5s: Warning |
| Collabora | Document conversion time | <30s (10-page doc) | >60s: Warning |
| Jitsi | Room join latency | <1000ms | >2000ms: Warning |
| Element | Sync latency (message → client) | <500ms | >1s: Warning |

## Performance Baselines

### Resource Utilization

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|-----------------|---------------|
| Keycloak | 2 cores | 4 cores | 2Gi | 4Gi |
| PostgreSQL | 2 cores | 4 cores | 4Gi | 8Gi |
| MariaDB | 2 cores | 4 cores | 4Gi | 8Gi |
| Redis | 500m | 1 core | 512Mi | 1Gi |
| Nextcloud | 2 cores | 6 cores | 2Gi | 6Gi |
| OpenCloud | 1 core | 4 cores | 1Gi | 4Gi |

### Baseline Throughput

| Service | Baseline Users | Concurrent Requests | Target RPS (Requests Per Second) |
|---------|----------------|---------------------|----------------------------------|
| Keycloak OIDC | 5k | 100 | 50 RPS |
| Nextcloud WebDAV | 5k | 50 | 25 RPS |
| Collabora WOPI | 5k | 30 | 15 RPS |
| Element Sync | 5k | 20 | 10 RPS |
| ILIAS/Moodle | 5k | 40 | 20 RPS |

## Peak Capacity Planning

### Semester Peak Requirements

| Component | Peak CPU | Peak Memory | Peak Requests |
|-----------|----------|-------------|----------------|
| Keycloak | 6 cores | 8Gi | 150 RPS (week 1 of semester) |
| Nextcloud | 10 cores | 10Gi | 100 RPS (file uploads) |
| ILIAS | 8 cores | 8Gi | 80 RPS (exam access) |
| Moodle | 8 cores | 8Gi | 60 RPS (quiz submissions) |
| Collabora | 4 cores | 6Gi | 50 RPS (doc viewing) |

### Emergency Overprovisioning

For semester peak, following components SHALL be auto-scaled (HPA):
- **Nextcloud web**: 1 → 3 replicas
- **Collabora**: 1 → 2 replicas
- **Element Sync**: 2 → 4 replicas

Note: Keycloak, PostgreSQL, MariaDB are StatefulSets and CANNOT be auto-
scaled. Use manual replica count increase in `replicas.yaml.gotmpl`.

## Alerting Thresholds

| Metric | Warning Threshold | Critical Threshold | Alert Notification |
|--------|-------------------|---------------------|-------------------|
| Keycloak Error Rate | >0.5% (5xx) | >1.0% (5xx) | PagerDuty (Critical) |
| PostgreSQL CPU Usage | >70% | >90% | Email (Warning) + Teams channel |
| MariaDB CPU Usage | >70% | >90% | Email (Warning) + Teams channel |
| Kubernetes Disk Usage | >80% (PVC) | >95% (PVC) | Email + Teams channel |
| Nextcloud File Upload Latency | >5s (P95) | >10s (P95) | Email (Warning) |
| Redis Cache Hit Rate | <70% | <60% | Email (Warning) |

## Depends On

Monitoring platform (Prometheus + Grafana + Alertmanager), HPA (auto-scaling)

## Integrates With

[Resource Sizing](./resource-sizing/spec.md), [Monitoring](./monitoring/spec.md), [Capacity Planning](./capacity-planning/spec.md)
