<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Operations & Runbooks

## Purpose

Operational procedures for common tasks: DB password sync, ingress certificate
rotation, backup restore (RWO PVCs), Keycloak failover, and backup schedule
checks. Each runbook defines preconditions, steps, and rollback.

## Non-Goals

- Day-1 deployment (covered in [Deployment](./deployment/spec.md))
- Commissioning new nodes (HRZ operations)
- Database schema migrations (application-specific, see service specs)

## Runbook: Keycloak Token Validation Failure

### Scenario: Keycloak fails to validate user tokens (invalid JWT mismatch)

**Symptoms:**
- Users cannot log in to any service (all OIDC/SAML fail)
- Keycloak logs show `Invalid JWT` or `Signature verification failed`
- All entry portals (Nubus Portal, direct service login) return 401 Unauthorized

**Root Cause:** Keycloak database corruption or key rotation outage.

**Steps to Resolve:**

1. **Verify Keycloak health:**
   ```bash
   kubectl -n opendesk exec -ti pods -l component=keycloak -- \
     sh -c "curl -s http://localhost:8080/health/live"
   kubectl -n opendesk exec -ti pods -l component=keycloak -- \
     sh -c "curl -s http://localhost:8080/health/ready"
   ```
   Expected: `200 OK` (both)

2. **Check Keycloak logs:**
   ```bash
   kubectl -n opendesk logs -l component=keycloak --tail=100
   ```
   Look for: `java.security.SignatureException`, `JWT validation failed`

3. **If JWT key mismatch:** Rollback Keycloak deployment to previous version (avoids key rotation)
   ```bash
   helmfile -e default rollback --release keycloak
   ```

4. **If database corruption:** Restore from latest backup (k8up RWO backup from 00:42 UTC)
   ```bash
   kubectl -n opendesk patch pod keycloak-0 -p '{"spec":{" PodManagementPolicy":"OrderedReady"}}}'
   kubectl create -f k8up-restore-keycloak.yaml (Restore from S3 backup)
   ```

5. **Verify token validation:**
   ```bash
   # Test via curl with known client
   curl -X POST https://keycloak.opendesk.hrz.uni-marburg.de/realms/opendesk/protocol/openid-connect/token \
     -d "client_id=opendesk-nextcloud" \
     -d "grant_type=client_credentials" \
     -d "client_secret=<opaque-client-secret>"
   ```
   Expected: `200 OK` with valid `access_token`

**Rollback:** Restore Keycloak to previous Helm release version.

## Runbook: MariaDB Password Synchronization

### Scenario: Helm-deployed MariaDB password does NOT match running instance

**Symptoms:**
- Service pods cannot connect to MariaDB: `SQLSTATE[HY000] [2002] Connection refused`
- `helmfile sync` shows a different password in values vs. running mariadb Container

**Root Cause: Helm generates new password on each upgrade, but MariaDB retains original password.

**Steps to Resolve:**

1. **Get current MariaDB root password from running container:**
   ```bash
   kubectl -n opendesk exec -ti pods -l component=mariadb -- env | grep MYSQL_ROOT_PASSWORD
   ```
   Example: `MYSQL_ROOT_PASSWORD=xyz789`

2. **Update Helm values to match running password:**
   ```yaml
   # helmfile/environments/default/secrets.yaml.gotmpl
   databases:
     nextcloud:
       password: xyz789  # Update to match running container
     opencloud:
       password: xyz789
   ```

3. **Apply values:**
   ```bash
   helmfile -e default apply
   ```

4. **Verify password sync:**
   ```bash
   kubectl -n opendesk logs -l component=mariadb --tail=20 | grep "password matched"
   ```
   Expected: `Password matched! (no ALT USER)`

**Prevention:** In future upgrades, verify password sync BEFORE `helmfile apply`.

## Runbook: Ingress Certificate Rotation

### Scenario: TLS certificate expires or needs replacement

**Symptoms:**
- Browser shows `NET::ERR_CERT_DATE_INVALID` or `CERT_AUTHORITY_INVALID`
- Services return 503 Bad Gateway for HTTPS requests

**Root Cause:** Let's Encrypt certificate expired or institutional certificate.

**Steps to Resolve:**

1. **Check certificate expiration:**
   ```bash
   kubectl -n opendesk get secret opendesk-certificates-tls -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates
   ```
   Expected: `notAfter` > Now (more than 30 days).

2. **For Let's Encrypt:** Renew via cert-manager (automatic, or manual)
   ```bash
   kubectl -n opendesk annotate Certificate opendesk-certificates-tls \
     cert-manager.io/issue-temporary-certificate="false"
   kubectl delete certcert opendesk-certificates-tls  # Issue re-issue
   ```

3. **For institutional certificate:**
   - Update Kubernetes secret with new certificate:
   ```bash
   kubectl -n opendesk create secret tls opendesk-certificates-tls \
     --cert=/path/to/new.crt --key=/path/to/new.key --dry-run=client -o yaml | kubectl apply -f -
   ```
   - Or use `helmfile/files/certificates/new.crt` and update `certificates.yaml.gotmpl`

4. **Verify new certificate:**
   ```bash
   curl -I https://portal.opendesk.hrz.uni-marburg.de
   ```
   Expected: `200 OK` with valid certificate chain.

**Rollback:** Restore previous certificate from secret backup (if `kubectl` succeeded but cert is invalid).

## Runbook: PostgreSQL PVC Backup/Restore (RWO)

### Scenario: PostgreSQL RWO PVC corrupted or data loss

**Symptoms:**
- PostgreSQL pods fail to start (CrashLoopBackOff)
- `kubectl describe pod` shows PVC mounting error (failed to attach `data-postgresql-0`)

**Root Cause:** RWO PVC data corruption - backups are NOT included in main k8up schedule
(RWO PVCs have `k8up.io/exclude: "true"` to prevent backup job hang).

**Steps to Resolve:**

1. **Check latest PostgreSQL backup in S3:**
   ```bash
   rclone config config create hrz-s3 s3 provider S3 \
     endpoint https://s3.hrz.uni-marburg.de/backups \
     access_key_id <opaque-access-key> secret_access_key <opaque-secret-key>
   rclone ls hrz-s3:backups/ | grep postgresql | sort -r | head -5
   ```

2. **Restore from latest backup:**
   ```bash
   # Create Restore resource
   kubectl -n opendesk create -f - <<EOF
   apiVersion: k8up.io/v1
   kind: Restore
   metadata:
     name: restore-postgresql-$(date +%s)
   spec:
     resources:
       - kind: PersistentVolumeClaim
         name: data-postgresql-0
     snapshot:
       backend: s3
       repo: https://s3.hrz.uni-marburg.de/backups
   EOF
   ```

3. **Verify restore:**
   ```bash
   kubectl -n opendesk get restore | grep restore-postgresql
   ```
   Expected: `Completed` (status field)

4. **Restart PostgreSQL pods:**
   ```bash
   kubectl -n opendesk delete pod -l component=postgresql
   ```

5. **Verify data:**
   ```bash
   kubectl -n opendesk exec -ti pods -l component=postgresql -- \
     sh -c "PGPASSWORD=<opaque-pg-pass> psql -U postgres -c '\l'"
   ```
   Expected: All databases present (`nextcloud`, `element`, etc.)

**Prevention:** Use dedicated PostgreSQL Schedule (`def-postgresql-backup`) for daily dumps, synced to S3.

## Runbook: Redis Cache Flush

### Scenario: Distributed cache requires flush (corrupted keys, stale data)

**Symptoms:**
- Applications return stale configuration or cached data
- Keycloak users cannot log in (stale session tokens in Redis)

**Root Cause:** Redis cache contains corrupted or stale entries.

**Steps to Resolve:**

1. **Identify affected services:**
   - Keycloak uses `redis-headless` (KEYCLOAK cache, sessions)
   - Intercom Service uses `redis-headless` (token cache)
   - Nextcloud uses `redis-headless` (file locking)
   - Element uses `redis-headless` (message cache)
   - BigBlueButton uses own `redis` (chat/sessions)
   - Zammad uses `elasticsearch` + own `redis` (session)

2. **Flush Redis keys (WITH CAUTION - affects all users):**
   ```bash
   kubectl -n opendesk exec -ti svc/redis-headless -- \
     sh -c "redis-cli FLUSHALL"  # DANGER: clears all keys
   ```

3. **Alternatively, flush only specific keys:**
   ```bash
   kubectl -n opendesk exec -ti svc/redis-headless -- \
     sh -c "redis-cli SCAN 0 MATCH keycloak:* COUNT 10000"
   # Then: redis-cli DEL keycloak:<pattern> for each key
   ```

4. **Trigger application restarts:**
   - Keycloak: `kubectl -n opendesk delete pod -l component=keycloak`
   - Nextcloud: `kubectl -n opendesk delete pod -l component=nextcloud`
   - Element: `kubectl -n opendesk delete pod -l component=element`

5. **Verify cache rebuild:**
   ```bash
   kubectl -n opendesk get pods -l component=keycloak -o name
   ```
   Expected: All pods `Running`

**Caution:** `FLUSHALL` logs out ALL users. Use only if cache corruption is confirmed and users can re-login.

## Runbook: Check k8up Backup Schedule Status

### Scenario: Backup schedule missed or jobs stuck

**Symptoms:**
- `kubectl -n opendesk get schedule` shows `0/0` backups (no job created)
- Backup jobs stuck in `ContainerCreating` (`kubectl get jobs -n opendesk`)

**Root Cause:**
- Schedule misconfigured
- RWO PVC exclusion not applied (backup job trying to mount multiple RWO PVCs)
- Backup target (S3) unreachable

**Steps to Resolve:**

1. **Check schedule status:**
   ```bash
   kubectl -n opendesk get schedule backup-live
   ```
   Expected: `READY: True`, `LAST BACKUP: <timestamp>`.

2. **Check schedule annotations:**
   ```bash
   kubectl -n opendesk describe schedule backup-live | grep k8up.io
   ```
   Expected: `k8up.io/exclude: "true"` on all 29 RWO PVCs.

3. **Check recent jobs:**
   ```bash
   kubectl -n opendesk get jobs -l k8up.io/schedule=backup-live -o name --sort-by=.metadata.creationTimestamp | tail -5
   kubectl -n opendesk describe job <job-name>
   ```
   Expected: `1/1 COMPLETED` (status). If stuck, `1/1 RUNNING` >1h = unhealthy.

4. **Delete stuck jobs (last resort):**
   ```bash
   kubectl -n opendesk delete jobs -l k8up.io/schedule=backup-live
   kubectl -n opendesk delete pods -l job-name=<job-name>  # Force pod cleanup
   ```

5. **Check S3 connectivity:**
   ```bash
   kubectl -n opendesk logs -l k8up.io/component=schedule -l k8up.io/schedule=backup-live --tail=50 | grep s3
   ```
   Expected: No errors. If `AccessDenied`, verify S3 credentials in `opendesk-s3-secret`.

## Runbook: Service Endpoint Unreachable (DNS/TCP)

### Scenario: Service endpoint returns `Connection refused` or DNS timeout

**Symptoms:**
- Service A cannot reach Service B (e.g., Nextcloud → Dovecot IMAP, SOGo → LDAP)
- `kubectl exec -ti <pod-a> -- curl -s http://<service-b>.<namespace>.svc:port` fails

**Root Cause:**
- Service B not running
- Pod anti-affinity blocking pod placement
- Network policy blocking traffic (Otterize)
- DNS CNAME chain issue (HRZ-specific)

**Steps to Resolve:**

1. **Check Service B endpoint:**
   ```bash
   kubectl -n opendesk get svc <service-b>
   kubectl -n opendesk get pods -l component=<service-b>
   ```

2. **If Service B not running:** Restart pods (or check StatefulSet replica count)

3. **If DNS CNAME chain issue (HRZ-specific):**
   - Check if service uses an external DNS resolution (e.g., third-party API)
   - Add `hostAliases` to deployment pointing to ingress IP (192.168.3.201)
   - Example:
   ```yaml
   spec:
     hostAliases:
     - ip: "192.168.3.201"
       hostnames:
       - "external-api.example.com"
   ```

4. **If Network Policy blocking:**
   ```bash
   kubectl -n opendesk get networkpolicies -l otterize/intent=enabled
   kubectl -n opendesk describe networkpolicy <policy-name>
   ```
   - Verify `ClientIntent` / `ServerIntent` define traffic source → destination correctly.

5. **Test TCP connectivity from Pod A to Service B:**
   ```bash
   kubectl -n opendesk exec -ti <pod-a> -- timeout 5 bash -c \
     'cat < /dev/null > /dev/tcp/<service-b>.opendesk.svc/<port>' && echo "OK" || echo "FAIL"
   ```

## Depends On

kubectl, helmfile, k8up operator, S3 (backups), Prometheus/Grafana (alerting)

## Integrates With

[Disaster Recovery](./disaster-recovery/spec.md), [Monitoring](./monitoring/spec.md), [Security/Compliance Checklists](./security/compliance-checklists/spec.md)
