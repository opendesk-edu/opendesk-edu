# Semester Lifecycle Management — Notepad

## Overview
This notepad tracks implementation progress, decisions, and learnings for the Semester Lifecycle Management feature (v1.1 Foundation).

---

## 2026-03-29 — Plan Creation
**Task**: Create detailed implementation plan for Semester Lifecycle Management.

**Scope** (from ROADMAP.md lines 52-61):
- Course provisioning API (create/archive courses per semester)
- Role-based access control tied to semester enrollment (instructor, student, tutor)
- Automated course archival at semester end
- Integration hook for campus management systems (HIS/LSF)

**Design Decisions**:
1. **API-First Approach**: REST API for course provisioning, accessible by campus management systems or manual triggers.
2. **Keycloak-Centric RBAC**: Use Keycloak groups for role management (synced to LMS via SCIM or API).
3. **Archive Strategy**: Soft-delete approach — courses moved to "archived" state, content preserved, access restricted.
4. **HISinOne Integration**: Webhook receiver for enrollment events (incremental sync), plus bulk sync endpoint for semester start.

**Component Structure**:
```
scripts/semester-provisioning/
  ├── api/
  │   ├── server.py              # FastAPI server for provisioning endpoints
  │   ├── routes/
  │   │   ├── courses.py         # Course CRUD + semester assignment
  │   │   ├── enrollments.py     # Enrollment management
  │   │   └── archival.py        # Archival triggers
  │   ├── models/
  │   │   ├── course.py          # Course data model
  │   │   └── semester.py        # Semester data model
  │   └── utils/
  │       ├── ilias_client.py    # ILIAS API client
  │       ├── moodle_client.py   # Moodle API client
  │       └── keycloak_client.py # Keycloak admin API client
  ├── archival/
  │   ├── archive_course.py      # Archive single course
  │   ├── bulk_archive.py        # Archive all courses for semester
  │   └── restore_course.py      # Restore archived course
  ├── sync/
  │   ├── hisinone_webhook.py    # HISinOne event listener
  │   └── bulk_sync.py           # Full semester sync
  ├── tests/
  │   ├── test_api.py            # API endpoint tests
  │   ├── test_archival.py       # Archival logic tests
  │   └── test_sync.py           # Sync logic tests
  ├── config/
  │   └── config.yaml            # Configuration file
  ├── requirements.txt           # Python dependencies
  └── README.md                  # Usage documentation
```

**Documentation**:
- `docs/semester-lifecycle.md` — User guide for semester management
- `docs/api/semester-provisioning-api.md` — API reference
- `docs/integration/hisinone-webhooks.md` — HISinOne integration guide

**Tests**:
- Unit tests for API endpoints, archival logic, sync logic
- Integration tests with mock ILIAS/Moodle/Keycloak servers
- End-to-end tests for full semester lifecycle

---

## 2026-03-29 — Dependencies & Constraints
**Dependencies**:
- FastAPI (Python web framework)
- requests (HTTP client for ILIAS/Moodle/Keycloak APIs)
- pydantic (data validation)
- uvicorn (ASGI server)
- pytest (testing)

**Constraints**:
- DO NOT modify existing implementation code (only add new scripts/docs)
- DO NOT change project structure
- DO NOT add new dependencies beyond those listed above
- DO provide bilingual (German/English) documentation
- DO include real code examples from existing implementations
- DO follow Apache-2.0 license (include SPDX headers)

---

## 2026-03-29 — Implementation Tasks
1. [ ] Create plan file `.sisyphus/plans/semester-lifecycle-management.md`
2. [ ] Implement `scripts/semester-provisioning/api/server.py` — FastAPI server
3. [ ] Implement `scripts/semester-provisioning/api/routes/courses.py` — Course provisioning
4. [ ] Implement `scripts/semester-provisioning/api/routes/enrollments.py` — Enrollment management
5. [ ] Implement `scripts/semester-provisioning/api/routes/archival.py` — Archival triggers
6. [ ] Implement `scripts/semester-provisioning/api/utils/ilias_client.py` — ILIAS API client
7. [ ] Implement `scripts/semester-provisioning/api/utils/moodle_client.py` — Moodle API client
8. [ ] Implement `scripts/semester-provisioning/api/utils/keycloak_client.py` — Keycloak API client
9. [ ] Implement `scripts/semester-provisioning/archival/archive_course.py` — Archive logic
10. [ ] Implement `scripts/semester-provisioning/sync/hisinone_webhook.py` — Webhook receiver
11. [ ] Write unit tests (pytest)
12. [ ] Write documentation (bilingual)
13. [ ] Verify all tests pass, commit, push

---

## 2026-03-29 — Inherited Wisdom from Previous Tasks
From **Community & Contribution** task:
- Use bilingual (German/English) documentation
- Include real code examples
- Follow Apache-2.0 license with SPDX headers

From **User Provisioning** task:
- Use FastAPI for REST APIs
- Use pytest for testing
- Include Docker packaging for standalone execution

From **DFN-AAI Federation** task:
- Document integration procedures thoroughly
- Provide testing guides with concrete examples

---

## Open Questions
1. Should archival be automatic (cron job) or manual (triggered by admin)?
   - **Decision**: Both — scheduled cron job for bulk archival, manual endpoint for single-course archival.
2. Should HISinOne integration be push (webhooks) or pull (periodic sync)?
   - **Decision**: Hybrid — webhook receiver for real-time updates, periodic full sync as fallback.
3. Should archived courses be completely inaccessible or read-only?
   - **Decision**: Read-only for students/instructors, full access for admins.

---

## References
- [ILIAS Web Services API](https://docu.ilias.de/)
- [Moodle Web Services API](https://docs.moodle.org/en/Web_services)
- [Keycloak Admin API](https://www.keycloak.org/docs-api/22.0.2/rest-api/index.html)
- [HISinOne Proxy](https://github.com/DatabayAG/his_in_one_proxy) (reference for integration patterns)
- [ROADMAP.md](/home/weiss/workspace/opendesk-edu/ROADMAP.md) lines 52-61 (Semester Lifecycle requirements)
