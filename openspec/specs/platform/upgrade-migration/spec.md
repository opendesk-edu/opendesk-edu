<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Upgrade and Migration

## Purpose

Defines procedures for upgrading openDesk Edu services between versions,
migrating data between services, and handling schema migrations. Covers
helmfile-based upgrades, database schema changes, and data migration
strategies.

## Non-Goals

- Initial deployment (see `deployment/spec.md`)
- Infrastructure upgrades (K3s, Ceph, OS — HRZ responsibility)

---

## Upgrade Strategy

### Helmfile-Based Upgrades

All openDesk Edu services are deployed via helmfile. Upgrades follow the
same pattern: update image tags in values, run `helmfile sync`, verify.

#### Scenario: Upgrade a single service

1. Update image tag in `apps/<service>/values.yaml.gotmpl`
2. Verify upgrade notes from upstream chart changelog
3. Run `helmfile -e <environment> -f helmfile.yaml.gotmpl sync`
4. Verify pods are running and healthy
5. Run post-upgrade smoke tests

#### Scenario: Rolling update with zero downtime

- GIVEN a deployment with `replicaCount > 1`
- WHEN `helmfile sync` triggers a new image
- THEN Kubernetes performs a rolling update
- AND old pods remain running until new pods pass readiness probes
- AND no downtime occurs if rollback limit is > 1

#### Scenario: Single-replica service upgrade

- GIVEN a deployment with `replicaCount: 1`
- WHEN `helmfile sync` triggers a new image
- THEN there is brief downtime (pod termination + new pod startup)
- AND `initialDelaySeconds` must be sufficient for the service to initialize

### Image Tag Management

Image tags SHOULD be pinned to specific versions in production.

| Environment | Tag Policy | Example |
|------------|------------|---------|
| Development | `latest` or `main` branch | `latest` |
| Staging | Specific version tag | `v1.0.0-rc1` |
| Production | SHA256 digest or pinned version | `sha256:abc123...` |

---

## Service-Specific Upgrade Procedures

### Keycloak

#### Pre-upgrade
1. Verify database connectivity: `kubectl exec -n opendesk ums-keycloak-0 -- pg_isready`
2. Back up Keycloak database: `pg_dump -Fc keycloak > keycloak.dump`
3. Note current version: `kubectl exec -n opendesk ums-keycloak-0 -- /opt/keycloak/bin/kc.sh version`

#### Upgrade
1. Update Keycloak image tag
2. Run `helmfile sync` — Keycloak handles schema migration automatically
3. Verify: access `/realms/opendesk` → status 200

#### Rollback
1. Revert image tag to previous version
2. Run `helmfile sync`
3. If schema migration is irreversible, restore from dump

### Nextcloud (AIO)

#### Pre-upgrade
1. Enable maintenance mode: `kubectl exec -n opendesk <pod> -- php occ maintenance:mode --on`
2. Back up database: `kubectl exec -n opendesk <postgres-pod> -- pg_dump -Fc nextcloud > nc.dump`
3. Back up S3 data (verify k8up snapshot exists)

#### Upgrade
1. Update Nextcloud image tag
2. Run `helmfile sync`
3. Run upgrade via AIO: `kubectl exec -n opendesk <pod> -- php occ upgrade`
4. Disable maintenance mode: `kubectl exec -n opendesk <pod> -- php occ maintenance:mode --off`

#### Post-upgrade
1. Verify `/status.php` returns healthy
2. Run `occ status` to check app compatibility
3. Verify file storage connection (S3)

### Database Upgrades (PostgreSQL / MariaDB)

#### PostgreSQL minor version upgrade
1. Update StatefulSet image tag
2. PostgreSQL auto-upgrades data directory on first start
3. Run `helmfile sync` with `maxUnavailable: 1`
4. Verify: `SELECT version()` returns new version

#### PostgreSQL major version upgrade
1. Back up all databases: `pg_dumpall > full_backup.sql`
2. Deploy new PostgreSQL major version alongside old (separate StatefulSet)
3. Migrate data: `pg_upgrade --old-datadir /var/lib/postgresql/old --new-datadir /var/lib/postgresql/new`
4. Switch application connections to new PostgreSQL
5. Remove old StatefulSet

#### MariaDB password synchronization
- KNOWN ISSUE: Helm-deployed MariaDB password may differ from initial password
- After upgrade: verify `ALTER USER` if needed
- Check application configs reference correct password

---

## Data Migration Procedures

### Service Migration (e.g., Nextcloud → OpenCloud)

When switching from one service to another (mutual exclusivity):

#### Scenario: Migrate from Nextcloud to OpenCloud
1. Export Nextcloud data via `occ files:scan --path=/`
2. Document the Nextcloud storage layout (bucket structure, file paths)
3. Configure OpenCloud with same S3 bucket or new bucket
4. Import data into OpenCloud via CS3 protocol
5. Verify file integrity: checksum comparison
6. Update portal navigation to point to OpenCloud
7. Disable Nextcloud: remove from helmfile release list
8. Run `helmfile apply` to remove Nextcloud resources

### User Data Migration (LDAP → Keycloak)

When migrating user data between authentication systems:

1. Export LDAP user entries (LDIF format)
2. Import into Keycloak via `kcadm.sh create users`
3. Map SAML/OIDC attributes: `mail`, `displayName`, `preferred_username`, `eduPersonAffiliation`
4. Verify user login works with migrated accounts
5. Update all SP configurations with new IdP metadata

---

## Rollback Strategy

### Helmfile Rollback

```bash
# Revert to previous release state
helmfile -e <environment> -f helmfile.yaml.gotmpl sync --interactive

# Or rollback a specific release
helm rollback <release> <revision> --namespace opendesk
```

### Database Rollback

1. Stop application pods to prevent writes
2. Restore from backup dump: `pg_restore -d <db> <backup_file>`
3. Restart application pods
4. Verify data integrity

### Full Cluster Rollback

If upgrade causes widespread failure:

1. Stop helmfile: remove all releases
2. Restore PVC data from k8up snapshots
3. Re-apply previous helmfile version
4. Verify all services healthy

---

## Maintenance Windows

### Semester Transition (Teaching-free Period)

The best time for major upgrades is during semester breaks when traffic is lowest.

#### Recommended Schedule

| Period | Activity | Impact |
|--------|----------|--------|
| 2 weeks before semester | Test upgrades in staging | No production impact |
| Last week of semester break | Production upgrades | Minimal user impact |
| First week of semester | Monitor, rollback if needed | Peak traffic |

### Required Downtime per Service

| Service | Zero-Downtime Possible | Notes |
|---------|------------------------|-------|
| Keycloak | No (single replica) | ~2 min downtime during rolling restart |
| Nextcloud AIO | No (single replica) | ~5 min (AIO upgrade step) |
| OpenCloud | Yes (2 replicas) | Rolling update |
| OX AppSuite | Yes (2 replicas) | Rolling update |
| SOGo | Yes (2 replicas) | Rolling update |
| Element | Depends on Synapse replicas | ~1 min |
| ILIAS | No (single replica) | ~2 min |
| Moodle | Yes (2 replicas) | Rolling update |
| BBB | Yes (2 replicas) | Rolling update |
| Collabora | Yes (2+ replicas) | Rolling update |
| Stateless tools | Yes | N/A |
