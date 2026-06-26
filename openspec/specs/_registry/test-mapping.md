<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Test Mapping

Maps behavioral spec scenarios to actual test files. Each row links a spec
requirement to the test that validates it.

## Helm Unittest (helm unittest plugin)

| Service | Spec Requirement | Test File |
|---------|-----------------|-----------|
| ILIAS | SAML authentication | `helmfile/charts/ilias/tests/sso_test.yaml` |
| ILIAS | PostgreSQL storage | `helmfile/charts/ilias/tests/pvc_test.yaml` |
| ILIAS | S3 object storage | `helmfile/charts/ilias/tests/persistence_test.yaml` |
| ILIAS | Deployment health | `helmfile/charts/ilias/tests/deployment_test.yaml`, `tests/health-ilias.spec.js` |
| ILIAS | Cron job resilience | `helmfile/charts/ilias/tests/backup-cronjob_test.yaml` |
| ILIAS | Secret management | `helmfile/charts/ilias/tests/secret_test.yaml` |
| ILIAS | Service endpoints | `helmfile/charts/ilias/tests/ilserver-service_test.yaml` |
| Moodle | Shibboleth authentication | `helmfile/charts/moodle/tests/deployment_test.yaml` |
| Moodle | PostgreSQL storage | `helmfile/charts/moodle/tests/persistence_test.yaml` |
| Moodle | Ingress routing | `helmfile/charts/moodle/tests/ingress_test.yaml` |
| BigBlueButton | Recording persistence | `helmfile/charts/bigbluebutton/tests/persistence_test.yaml` |
| BigBlueButton | Redis dependency | `helmfile/charts/bigbluebutton/tests/service_test.yaml` |
| BigBlueButton | SAML authentication | `helmfile/charts/bigbluebutton/tests/deployment_test.yaml` |
| BigBlueButton | PostgreSQL storage | `helmfile/charts/bigbluebutton/tests/pdb_test.yaml` |
| Etherpad | OIDC authentication | `helmfile/charts/etherpad/tests/deployment_test.yaml` |
| Etherpad | PostgreSQL storage | `helmfile/charts/etherpad/tests/persistence_test.yaml` |
| Etherpad | Service endpoint | `helmfile/charts/etherpad/tests/service_test.yaml` |
| Etherpad | Ingress routing | `helmfile/charts/etherpad/tests/ingress_test.yaml` |
| BookStack | SAML authentication | `helmfile/charts/bookstack/tests/deployment_test.yaml` |
| BookStack | MariaDB storage | `helmfile/charts/bookstack/tests/persistence_test.yaml` |
| Planka | OIDC authentication | `helmfile/charts/planka/tests/oidc_test.yaml` |
| Planka | PostgreSQL storage | `helmfile/charts/planka/tests/persistence_test.yaml` |
| Planka | Secret management | `helmfile/charts/planka/tests/secret_test.yaml` |
| Zammad | SAML authentication | `helmfile/charts/zammad/tests/deployment_test.yaml` |
| Zammad | PostgreSQL storage | `helmfile/charts/zammad/tests/persistence_test.yaml` |
| Zammad | Redis cache | `helmfile/charts/zammad/tests/service_test.yaml` |
| LimeSurvey | LDAP authentication | `helmfile/charts/limesurvey/tests/deployment_test.yaml` |
| LimeSurvey | MariaDB storage | `helmfile/charts/limesurvey/tests/persistence_test.yaml` |
| Draw.io | Stateless operation | `helmfile/charts/drawio/tests/deployment_test.yaml` |
| Excalidraw | Stateless operation | `helmfile/charts/excalidraw/tests/deployment_test.yaml` |
| Self-Service Password | LDAP bind | `helmfile/charts/self-service-password/tests/ldap_test.yaml` |
| Self-Service Password | Service endpoint | `helmfile/charts/self-service-password/tests/service_test.yaml` |
| TYPO3 CMS | OIDC authentication | `helmfile/charts/typo3/tests/deployment_test.yaml` |
| TYPO3 CMS | MariaDB storage | `helmfile/charts/typo3/tests/persistence_test.yaml` |
| SOGo | OIDC authentication | `helmfile/charts/sogo/tests/deployment_test.yaml` |
| SOGo | MariaDB storage | `helmfile/charts/sogo/tests/persistence_test.yaml` |
| SOGo | Redis cache | `helmfile/charts/sogo/tests/configmap_test.yaml` |
| OpenCloud | SAML authentication | `helmfile/charts/opencloud/tests/oidc_test.yaml` |
| OpenCloud | MariaDB storage | `helmfile/charts/opencloud/tests/persistence_test.yaml` |

## Playwright E2E Tests

| Test File | Spec Requirements Validated |
|-----------|---------------------------|
| `tests/playwright/portal-login.spec.js` | `auth/oidc/spec.md` — OIDC portal tile authentication |
| `tests/playwright/backchannel-e2e.spec.js` | `auth/federation/spec.md` — SAML backchannel / federated login |
| `tests/playwright/nc_backchannel.spec.js` | `services/nextcloud/spec.md` — Nextcloud SSO integration |

## Python Tests (scripts/)

| Test File | Spec Requirements Validated |
|-----------|---------------------------|
| `scripts/user_import/tests/test_sync_users.py` | `integrations/provisioning/spec.md` — User sync from LDAP |
| `scripts/user_import/tests/test_deprovision_user.py` | `integrations/provisioning/spec.md` — Two-phase deprovisioning |
| `scripts/user_import/tests/test_archive_service_user.py` | `integrations/provisioning/spec.md` — 6-month archival cycle |
| `scripts/user_import/tests/test_ucs.py` | `auth/ldap/spec.md` — UCS/LDAP user store |
| `scripts/user_import/tests/test_keycloak.py` | `auth/oidc/spec.md` — Keycloak token handling |
| `scripts/semester-provisioning/tests/test_role_sync.py` | `integrations/provisioning/spec.md` — Semester-based role sync |
| `scripts/semester-provisioning/tests/test_archival.py` | `integrations/provisioning/spec.md` — Semester end archival |
| `scripts/semester-provisioning/tests/test_semester_manager.py` | `integrations/provisioning/spec.md` — Semester lifecycle |
| `scripts/semester-provisioning/tests/test_api_courses.py` | `integrations/provisioning/spec.md` — Course provisioning API |
| `scripts/semester-provisioning/tests/test_api_archival.py` | `integrations/provisioning/spec.md` — Archival API |
| `scripts/semester-provisioning/tests/test_api_enrollments.py` | `integrations/provisioning/spec.md` — Enrollment management |
| `scripts/semester-provisioning/tests/test_hisinone_webhook.py` | `integrations/provisioning/spec.md` — HISinOne campus system webhook |

## Uncovered Requirements

The following spec requirements have NO corresponding automated test:

| Spec | Requirement | Gap |
|------|------------|-----|
| `services/jitsi/spec.md` | OIDC authentication | No local Jitsi chart — uses upstream chart |
| `services/nubus/spec.md` | OIDC IdP | Uses upstream Nubus chart |
| `services/nextcloud/spec.md` | Group synchronization | No helm unittest for group sync |
| `services/ox-appsuite/spec.md` | SAML authentication | Uses upstream OX chart |
| `services/xwiki/spec.md` | LDAP group sync | Uses upstream XWiki chart |
| `services/collabora/spec.md` | Delegate session | Uses upstream chart |
| `services/cryptpad/spec.md` | Stateless operation | Uses upstream chart |
| `services/notes/spec.md` | OIDC authentication | Uses upstream chart |
| `services/openproject/spec.md` | SAML authentication | Uses upstream chart |
| `platform/deployment/spec.md` | Helmfile orchestration | Tested via CI `make template` |
| `platform/backup/spec.md` | k8up schedule | No automated backup test |
| `platform/security/spec.md` | Network policies | `helmfile/charts/network-policies/` (no tests/) |
| `platform/monitoring/spec.md` | Prometheus stack | `helmfile/charts/grafana-dashboards/`, `promtail/`, `loki/`, `alertmanager/` (no tests/) |
| `integrations/intercom/spec.md` | Silent login / token exchange | No test |
| `integrations/file-store/spec.md` | Bootstrap trust relationship | No test |
| `services/nextcloud/spec.md` | Probe timing | No helm unittest for probe overrides |
