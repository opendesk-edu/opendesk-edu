<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Monitoring and Alerting

## Purpose

Prometheus metrics collection, Grafana dashboards, Alertmanager alert routing,
ServiceMonitors, and PrometheusRules for the openDesk Edu platform. Defines
SLOs, alerting tiers, and dashboard requirements for operational visibility.

## Non-Goals

- Log aggregation (Loki/Promtail — separate stack)
- Uptime monitoring (external: kuvasz-uptime)
- Application Performance Monitoring (APM — not deployed)

---

## Architecture

```
Services ──metrics──> Prometheus ──rules──> Alertmanager ──> Notification Channels
                              │
                              └──scrape──> Grafana Dashboards
                                         │
                                         └── ServiceMonitors (auto-discovery)
                                         └── PrometheusRules (alert definitions)
```

### Monitoring Stack

| Component | Implementation | Notes |
|-----------|---------------|-------|
| Prometheus | `kube-prometheus-stack` Helm chart | Scrapes all ServiceMonitors |
| Grafana | `kube-prometheus-stack` Grafana sub-chart | Pre-configured dashboards |
| Alertmanager | `kube-prometheus-stack` Alertmanager | Routes alerts to email/webhook |
| ServiceMonitors | Per-service CRD resources | Auto-discovery of metrics endpoints |
| PrometheusRules | Per-service CRD resources | Alert definitions per service |

---

## SLOs (Service Level Objectives)

| Service | Availability | Latency (p95) | Error Rate |
|---------|-------------|---------------|------------|
| Keycloak | 99.9% | < 500ms (token endpoint) | < 0.1% |
| Nextcloud/OpenCloud | 99.9% | < 2s (file operations) | < 0.5% |
| OX AppSuite/SOGo | 99.9% | < 3s (mail operations) | < 0.5% |
| Element | 99.5% | < 500ms (API) | < 1% |
| ILIAS/Moodle | 99.5% | < 3s (page load) | < 1% |
| BigBlueButton | 99.5% | < 1s (UI actions) | < 1% |
| Collabora | 99.5% | < 5s (document load) | < 1% |
| All other services | 99% | < 5s | < 2% |

---

## Alerting Tiers

### Tier 1: Critical (Page immediately)

| Alert | Condition | Severity | Response |
|-------|-----------|----------|----------|
| KeycloakDown | `up{job="keycloak"} == 0` for 5m | Critical | Immediate |
| PostgresDown | `pg_up == 0` for 5m | Critical | Immediate |
| MariaDBDown | `mysql_up == 0` for 5m | Critical | Immediate |
| RedisDown | `up{job="redis"} == 0` for 5m | Critical | Immediate |
| CephClusterError | `ceph_health_status != 0` for 5m | Critical | Immediate |
| IngressDown | `up{job="haproxy-ingress"} == 0` for 2m | Critical | Immediate |
| AllPodsCrashing | `kube_pod_status_phase{phase="Running"} == 0` for any service | Critical | Immediate |
| CertExpiry | `probe_ssl_earliest_cert_expiry < 7` days | Critical | Within 24h |

### Tier 2: Warning (Investigate within 1 hour)

| Alert | Condition | Severity | Response |
|-------|-----------|----------|----------|
| HighMemoryUsage | `container_memory_working_set_bytes > 90%` of limit for 10m | Warning | 1 hour |
| HighCPUThrottling | `rate(container_cpu_cfs_throttled_periods_total) > 50%` for 10m | Warning | 1 hour |
| PodRestarting | `rate(kube_pod_container_status_restarts_total) > 0.1` (6+/hour) | Warning | 1 hour |
| PVCAlmostFull | `kubelet_volume_stats_available_bytes < 10%` of capacity | Warning | 1 hour |
| DatabaseConnectionsHigh | `pg_stat_activity_count > 80%` of max_connections | Warning | 1 hour |
| BackupFailed | `k8up_backup_failed_total > 0` for latest run | Warning | 1 hour |
| OIDCAuthFailures | `rate(keycloak_logins_failed_total) > 10/min` for 10m | Warning | 1 hour |

### Tier 3: Info (Review during business hours)

| Alert | Condition | Severity | Response |
|-------|-----------|----------|----------|
| HighLatency | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket)) > 5s` | Info | Next business day |
| S3BucketGrowth | `ceph_rgw_usage_bytes` growing > 10GB/day | Info | Next business day |
| PodCountChanged | `kube_deployment_status_replicas != kube_deployment_spec_replicas` | Info | Next business day |
| HelmReleaseDrift | ArgoCD `health.status != "Healthy"` | Info | Next business day |

---

## ServiceMonitors (Instrumented Services)

The following services expose Prometheus metrics via ServiceMonitor CRDs:

| Service | Metrics Path | Port | Notes |
|---------|-------------|------|-------|
| Collabora | `/cool/getMetrics` | 9980 | Document count, active users, CPU/memory |
| Nextcloud | `/metrics` | 9205 | Via separate exporter (`nextcloud-exporter`) |
| Nextcloud Notify Push | `/metrics` | 9205 | Push notification metrics |
| Keycloak | `/metrics` | 8080 | Login counts, token stats, realm health |
| Nubus Portal | `/metrics` | 8080 | Portal request metrics |
| HAProxy Ingress | `/metrics` | 10254 | Request rates, error codes, backend health |
| PostgreSQL | `/metrics` | 9187 | `postgres_exporter` — connections, locks, replication |
| MariaDB | `/metrics` | 9104 | `mariadb_exporter` — queries, connections, replication |
| Redis | `/metrics` | 9121 | `redis_exporter` — memory, keys, connections |
| MinIO | `/minio/v2/metrics/cluster` | 9000 | Bucket usage, API operations, health |
| Ceph | N/A | N/A | `ceph-mgr` Prometheus module |
| Node Exporter | `/metrics` | 9100 | CPU, memory, disk, network per node |
| kube-state-metrics | `/metrics` | 8080 | Pod/deployment/PVC status |

### Services WITHOUT ServiceMonitors

| Service | Gap | Mitigation |
|---------|-----|------------|
| ILIAS | No metrics endpoint | Monitor via liveness probe + logs |
| Moodle | No metrics endpoint | Monitor via liveness probe + logs |
| BBB (Greenlight) | No metrics endpoint | Monitor via liveness probe + logs |
| OX AppSuite | Internal metrics only | Monitor via ingress response codes |
| SOGo | No metrics endpoint | Monitor via liveness probe + logs |
| Element | Synapse metrics available | Deploy `synapse-exporter` |
| Zammad | No metrics endpoint | Monitor via liveness probe + logs |

---

## Grafana Dashboards

### Required Dashboards

| Dashboard | Purpose | Source |
|-----------|---------|--------|
| **Platform Overview** | Cluster health, node resources, service status | Custom + kube-prometheus-stack |
| **Authentication** | Keycloak login rates, failures, token stats, realm health | Custom |
| **File Services** | Nextcloud/OpenCloud file operations, storage usage, S3 metrics | Custom |
| **Groupware** | OX/SOGo mail delivery rates, IMAP/SMTP latency | Custom |
| **Education Services** | ILIAS, Moodle, BBB active users, course access patterns | Custom |
| **Database** | PostgreSQL/MariaDB connections, query performance, replication lag | postgres_exporter / mariadb_exporter |
| **Infrastructure** | Ceph health, PVC usage, MinIO operations, network traffic | Custom |
| **Backup** | k8up backup status, restic snapshots, storage growth | Custom |
| **HAProxy** | Request rates, error codes, backend health, TLS certificates | haproxy_exporter |

### Dashboard Configuration

Dashboards are deployed via ConfigMaps or the `grafana-dashboards` Helm chart.
They use the `grafana_dashboard` label for auto-discovery:
```yaml
labels:
  grafana_dashboard: "1"
```

---

## Notification Channels

| Channel | Use Case | Config |
|---------|----------|--------|
| Email | Tier 1 + Tier 2 alerts | SMTP via Postfix (`opendesk-system@<domain>`) |
| Webhook | Integration with ticketing/Chat | Configured in Alertmanager |
| Slack/Mattermost (optional) | Tier 2 + Tier 3 | Webhook integration |

### Alert Routing

```yaml
route:
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'email-critical'
  routes:
    - match:
        severity: critical
      receiver: 'email-critical'
      repeat_interval: 1h
    - match:
        severity: warning
      receiver: 'email-warning'
      repeat_interval: 4h
    - match:
        severity: info
      receiver: 'email-info'
      repeat_interval: 24h
```

---

## Maintenance Windows

Alerts SHALL respect maintenance windows to avoid false positives during
planned maintenance.

### Procedure

1. Create a Silence in Alertmanager:
   ```bash
   amtool silence add --duration 2h --comment "Planned maintenance" --matcher service="<service>"
   ```
2. Notify stakeholders before maintenance window
3. Verify alerts resume after silence expires
4. Run post-maintenance verification checklist

---

## Metrics Retention

| Metric Type | Retention | Storage |
|------------|-----------|---------|
| High-resolution (raw) | 15 days | Prometheus TSDB |
| Medium-resolution (5m) | 30 days | Prometheus TSDB |
| Low-resolution (1h) | 90 days | Prometheus TSDB (via `thanos` or `prometheus` compaction) |
| Alert history | 90 days | Alertmanager |
