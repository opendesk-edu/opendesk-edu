<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Capacity Planning

## Purpose

Projects storage, compute, and user growth for the openDesk Edu platform
based on academic semester cycles. Provides sizing guidance for semester start
(peak provisioning), semester mid (steady state), and semester break (reduced).

## Non-Goals

- Exact cost calculations (depends on HRZ pricing model)
- Node hardware procurement (HRZ responsibility)

---

## Academic Calendar Impact

### Peak Periods

| Period | Duration | Impact | Multiplier |
|--------|----------|--------|------------|
| Semester start (Oct/Apr) | 2 weeks | New account provisioning, course imports, initial logins | 2x compute, 3x auth |
| Exam period (Jan/Feb, Jun/Jul) | 4 weeks | Heavy file uploads (assignments), ILIAS submissions | 1.5x storage writes |
| Semester break (Mar, Aug) | 2 months | Minimal activity, maintenance window | 0.5x baseline |
| Steady state | Remaining | Normal course activity | 1x baseline |

### User Growth Model

| Metric | Current | Per Semester Growth | After 4 Semesters |
|--------|---------|-------------------|-------------------|
| Total users (registered) | ~5,000 | +1,000 | ~9,000 |
| Active users (daily) | ~500 | +100 | ~900 |
| Peak concurrent users | ~100 | +20 | ~180 |
| Courses (ILIAS + Moodle) | ~200 | +30 | ~320 |
| Storage per user (avg) | 500Mi | +50Mi | 700Mi |

---

## Storage Projections

### S3 Object Storage (MinIO)

| Service | Current Usage | Per Semester Growth | After 4 Semesters | Action Threshold |
|---------|--------------|-------------------|------------------|-----------------|
| Nextcloud files | 100Gi | +20Gi | ~180Gi | Scale bucket at 150Gi |
| OpenCloud files | 20Gi | +5Gi | ~40Gi | — |
| ILIAS course files | 50Gi | +10Gi | ~90Gi | Scale at 80Gi |
| Element media | 10Gi | +3Gi | ~22Gi | — |
| Notes attachments | 5Gi | +1Gi | ~9Gi | — |
| OpenProject files | 10Gi | +2Gi | ~18Gi | — |
| **Total S3** | **195Gi** | **~41Gi/semester** | **~359Gi** | **Scale MinIO at 300Gi** |

### CephFS (RWX) PVCs

| PVC | Current | Per Semester Growth | After 4 Semesters | Notes |
|-----|---------|-------------------|------------------|-------|
| `opendesk-opencloud-data` | 20Gi | +5Gi | ~40Gi | Scale at 35Gi |
| `bbb-recordings` | 50Gi | +15Gi | ~110Gi | Recordings accumulate; purge policy needed |
| `moodle-data` | 30Gi | +8Gi | ~62Gi | Scale at 50Gi |
| `seaweedfs-all-in-one-data` | 10Gi | +2Gi | ~18Gi | — |
| `nextcloud-data` (if CephFS) | 100Gi | +20Gi | ~180Gi | See S3 above |

### Ceph RBD (RWO) — Databases

| Database | Current | Per Semester Growth | Action |
|----------|---------|-------------------|--------|
| PostgreSQL (shared, 12 DBs) | 20Gi | +2Gi | Scale PVC at 30Gi |
| MariaDB (shared, 6 DBs) | 20Gi | +2Gi | Scale PVC at 30Gi |
| Keycloak | 5Gi | +500Mi | — |
| Redis | 1Gi | +200Mi | — |
| **Total RWO** | **46Gi** | **~5Gi/semester** | **Monitor quarterly** |

### Total Storage Estimate

| Timeframe | S3 | CephFS | Ceph RBD | Total |
|----------|----|--------|---------|-------|
| Current | 195Gi | 210Gi | 46Gi | 451Gi |
| +1 semester | 236Gi | 251Gi | 51Gi | 538Gi |
| +4 semesters | 359Gi | 310Gi | 66Gi | 735Gi |

---

## Compute Projections

### Peak vs Steady State

| Service Category | Steady State (cores) | Peak (semester start) | Notes |
|-----------------|---------------------|------------------------|-------|
| Infrastructure | 5.5 | 5.5 | Constant |
| Core (NC, OC, OX/SOGo, Element) | 6.5 | 13 | 2x replicas under peak |
| Education (ILIAS, Moodle, BBB) | 3.5 | 7 | 2x replicas under peak |
| Collaboration (Collabora, CryptPad) | 2 | 4 | 2x under peak |
| Support (Zammad, Planka, etc.) | 4 | 5 | Slight increase |
| Stateless (Draw.io, Excalidraw) | 0.5 | 1 | Autoscale or leave as-is |
| **Total Requests** | **~22** | **~36** | **~1.6x at peak** |
| **Total Limits** | **~80** | **~80** | **Limits unchanged** |

### Scaling Recommendations

| When | Action |
|------|--------|
| CPU requests exceed 70% of node capacity | Add a worker node or increase replica limits |
| PostgreSQL reaches 80% of PVC capacity | Scale PVC (requires Ceph RBD expansion) |
| S3 usage exceeds 80% of bucket quota | Add MinIO disk or new MinIO node |
| BBB recordings exceed 100Gi | Purge recordings older than 1 semester |
| Concurrent users > 200 | Increase Element/Synapse replica count to 2 |

---

## Per-Semester Checklist

### 2 Weeks Before Semester Start

- [ ] Verify storage capacity (S3, CephFS, RBD PVCs) meets projections
- [ ] Scale MinIO disks if S3 usage > 70% projected
- [ ] Test upgrade in staging environment
- [ ] Prepare course import scripts (ILIAS, Moodle)
- [ ] Verify Keycloak can handle 2x auth throughput
- [ ] Review monitoring alerts and SLO thresholds

### During Semester Start (Week 1-2)

- [ ] Monitor pod resource usage (CPU, memory, restarts)
- [ ] Scale replicas if CPU > 80% for 10+ minutes
- [ ] Monitor PostgreSQL connection pool usage
- [ ] Monitor Nextcloud file upload rate
- [ ] Verify all new user accounts provision correctly

### Mid-Semester

- [ ] Review and trim BBB recordings (free up CephFS space)
- [ ] Check PostgreSQL vacuum and bloat
- [ ] Verify backup snapshots are current and restorable
- [ ] Review and update LDAP group memberships for new courses

### Semester Break

- [ ] Run `helmfile sync` with latest image tags (staging → production)
- [ ] Major upgrades (Keycloak, PostgreSQL major version, Nextcloud major)
- [ ] Database maintenance: VACUUM FULL, ANALYZE, REINDEX
- [ ] Purge stale BBB recordings (older than 1 academic year)
- [ ] Verify DR runbook procedures (test restore from backup)
