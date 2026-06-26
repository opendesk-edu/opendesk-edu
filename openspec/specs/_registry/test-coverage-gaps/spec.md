<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Test Coverage Gap Analysis

## Purpose

Maps openDesk Edu spec requirements to actual test coverage, identifies
gaps, and defines test priorities for closing them. Sources: helm unittests
(`tests/`), Playwright E2E tests (`tests/e2e/`), Python tests (`user_import/tests/`),
and Bats E2E tests (`k8up/e2e/`).

## Test Coverage Matrix

### Covered Requirements

| Spec Requirement | Test Type | Test File | Status |
|-----------------|-----------|-----------|--------|
| ILIAS init container setup | helm unittest | `ilias/tests/ilias_test.go` | ✅ |
| ILIAS Shibboleth SP config | helm unittest | `ilias/tests/ilias_test.go` | ✅ |
| ILIAS Lucene RPC service | helm unittest | `ilias/tests/ilias_test.go` | ✅ |
| ILIAS SSO check cronjob | helm unittest | `ilias/tests/ilias_test.go` | ✅ |
| ILIAS PHP config | helm unittest | `ilias/tests/ilias_test.go` | ✅ |
| ILIAS security context | helm unittest | `ilias/tests/ilias_test.go` | ✅ |
| ILIAS MariaDB Galera | helm unittest | `ilias/tests/ilias_test.go` | ✅ |
| Moodle Shibboleth config | helm unittest | `moodle/tests/moodle_test.go` | ✅ |
| Moodle security context | helm unittest | `moodle/tests/moodle_test.go` | ✅ |
| Moodle ingress | helm unittest | `moodle/tests/moodle_test.go` | ✅ |
| Moodle DB connection | helm unittest | `moodle/tests/moodle_test.go` | ✅ |
| BBB SAML config | helm unittest | `bigbluebutton/tests/bbb_test.go` | ✅ |
| BBB ingress | helm unittest | `bigbluebutton/tests/bbb_test.go` | ✅ |
| BBB replicas | helm unittest | `bigbluebutton/tests/bbb_test.go` | ✅ |
| BBB PDB | helm unittest | `bigbluebutton/tests/bbb_test.go` | ✅ |
| Etherpad PostgreSQL | helm unittest | `etherpad/tests/etherpad_test.go` | ✅ |
| Etherpad ingress | helm unittest | `etherpad/tests/etherpad_test.go` | ✅ |
| Nextcloud AIO deployment | Playwright E2E | `tests/e2e/nextcloud.spec.ts` | ✅ |
| Nextcloud file upload | Playwright E2E | `tests/e2e/nextcloud.spec.ts` | ✅ |
| SOGo OIDC config | helm unittest | `sogo/tests/sogo_test.go` | ✅ |
| SOGo LDAP config | helm unittest | `sogo/tests/sogo_test.go` | ✅ |
| SOGo IMAP/SMTP/Sieve | helm unittest | `sogo/tests/sogo_test.go` | ✅ |
| SOGo Memcached | helm unittest | `sogo/tests/sogo_test.go` | ✅ |
| Keycloak integration | Playwright E2E | `tests/e2e/portal.spec.ts` | ✅ |
| Portal navigation | Playwright E2E | `tests/e2e/portal.spec.ts` | ✅ |
| SSO cross-service | Playwright E2E | `tests/e2e/sso.spec.ts` | ✅ |
| UCS user import | Python test | `user_import/tests/test_ucs.py` | ✅ |
| Keycloak user import | Python test | `user_import/tests/test_keycloak.py` | ✅ |
| User JSON conversion | Python test | `user_import/tests/test_convert.py` | ✅ |
| k8up backup schedule | Bats E2E | `k8up/e2e/test-*.bats` | ✅ |

### Uncovered Requirements (Priority Order)

| Priority | Spec | Requirement | Proposed Test Type | Effort |
|----------|------|------------|-------------------|--------|
| P1 | Collabora | WOPI session delegation | Playwright E2E (open doc in NC, verify Collabora loads) | Medium |
| P1 | Nextcloud | Probe timing (periodSeconds vs initialDelaySeconds) | helm unittest (check template values) | Low |
| P1 | Intercom | Silent login flow | Playwright E2E (NC→OX cross-app SSO) | High |
| P1 | Intercom | Redis token caching | helm unittest (verify Redis config) | Low |
| P2 | OpenCloud | OIDC auto-provisioning | helm unittest (verify OIDC config) | Low |
| P2 | XWiki | LDAP group sync | helm unittest (verify LDAP config values) | Low |
| P2 | XWiki | OIDC+LDAP user linking | helm unittest (verify properties) | Low |
| P2 | Element | OIDC client config | helm unittest (verify OIDC config) | Low |
| P2 | Element | Rate limiting | helm unittest (verify rc_* values) | Low |
| P2 | Zammad | Elasticsearch connection | helm unittest (verify ES port) | Low |
| P2 | DR Runbook | Recovery order | Integration test (restore sequence) | High |
| P2 | Monitoring | SLO thresholds | Prometheus rule validation | Medium |
| P3 | Notes | OIDC config | helm unittest (verify OIDC config) | Low |
| P3 | Planka | OIDC config | helm unittest (verify client ID) | Low |
| P3 | SSP | LDAP bind | helm unittest (verify LDAP host) | Low |
| P3 | CryptPad | Registration restriction | helm unittest (verify config) | Low |
| P3 | All services | Security context | helm unittest (check runAsUser, capabilities) | Medium |
| P3 | All services | Ingress TLS | helm unittest (verify className, cert) | Low |

## Test Writing Strategy

### Helm Unittests (Easy Wins)

Low-effort tests that verify chart template rendering. Suitable for most
configuration-only requirements.

```yaml
# Example: Verify Element OIDC config
templates:
  - synapse.yaml
tests:
  - it: should set OIDC client ID
    asserts:
      - containsDocument:
          path: synapse.yaml
          document:
            configuration:
              homeserver:
                oidc:
                  clientId: opendesk-matrix
```

### Playwright E2E Tests (High Value)

Cross-service workflow tests that verify real user journeys. Most valuable for:
- Intercom silent login (NC→OX, NC→Element)
- Collabora document editing (NC→Collabora→save)
- Portal SSO (Keycloak→any service→back to portal)

### Integration Tests (Operational)

Full deployment tests for:
- DR recovery procedure
- Monitoring alerting thresholds
- Backup/restore cycle

## Proposed Test Implementation Plan

### Wave 1: Configuration Tests (helm unittest, 1 day)

Write helm unittests for ALL services verifying:
1. Security context (runAsUser, capabilities drop ALL, seccompProfile)
2. Ingress configuration (className, TLS secret, annotations)
3. Auth configuration (OIDC client IDs, SAML entity IDs, LDAP bind DNs)
4. Database configuration (hosts, ports, secret refs)
5. Resource requests/limits (minimum guaranteed)

### Wave 2: Cross-Service E2E (Playwright, 2-3 days)

Write Playwright tests for:
1. Portal SSO round-trip (login to Keycloak → redirect to service → verify → back to portal)
2. Intercom silent login (NC→OX, NC→Element)
3. Collabora document editing (NC→Collabora→edit→save→verify)
4. File sharing (NC→share→recipient accesses)

### Wave 3: Operational Tests (1 day)

1. k8up backup/restore cycle test
2. Prometheus alerting rule validation
3. Health probe reachability test
