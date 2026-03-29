# Semester Lifecycle Management — Implementation Plan

## 1. TASK OVERVIEW

Implement **Semester Lifecycle Management** — a complete system for managing the semester-based rhythm of university operations. This includes course provisioning, role-based access control, automated archival, and integration hooks for campus management systems.

**Source**: `ROADMAP.md` lines 52-61 (v1.1 — Foundation)

### Requirements (from ROADMAP.md)
- [ ] Course provisioning API (create/archive courses per semester)
- [ ] Role-based access control tied to semester enrollment (instructor, student, tutor)
- [ ] Automated course archival at semester end
- [ ] Integration hook for campus management systems (HIS/LSF)

---

## 2. SCOPE & DELIMITATIONS

### In Scope
- REST API for course provisioning (create, update, archive courses)
- Role management via Keycloak groups (synced to LMS)
- Automated archival workflow (bulk + single-course)
- HISinOne webhook receiver for enrollment events
- Documentation (bilingual: German/English)
- Comprehensive test suite (unit + integration)

### Out of Scope
- Direct HISinOne API integration (requires university-specific credentials; integration layer only)
- UI for semester management (admin uses API or CLI)
- Grade synchronization (deferred to v1.5 Phase 3)
- Schedule/room synchronization (deferred to v1.5 Phase 3)

---

## 3. ARCHITECTURE

### 3.1 Component Diagram

```
┌──────────────────────┐       ┌─────────────────────────────────────┐       ┌──────────────────┐
│   Campus Management  │       │     openDesk Edu                    │       │   LMS (ILIAS/    │
│   (HISinOne/LSF)     │       │     Semester Provisioning API       │       │   Moodle)        │
│                      │       │                                     │       │                  │
│  ┌────────────────┐  │       │  ┌──────────────────────────────┐   │       │  ┌──────────────┐│
│  │ Enrollment     │  │       │  │  FastAPI Server              │   │       │  │ Course       ││
│  │ Events (SOAP)  │  │───────┼─►│  /api/v1/courses             │   │───────┼─►│ Provisioning   ││
│  └────────────────┘  │       │  │  /api/v1/enrollments         │   │       │  │ API          ││
│  ┌────────────────┐  │       │  │  /api/v1/archival            │   │       │  └──────────────┘│
│  │ Semester Start │  │       │  └──────────────────────────────┘   │       │                  │
│  └────────────────┘  │       │              │                       │       └──────────────────┘
└──────────────────────┘       │              │                       
                               │              ▼                        
                               │  ┌──────────────────────────────┐       
                               │  │  Keycloak                    │       
                               │  │  - User groups               │       
                               │  │  Role mapping                │       
                               │  │  RBAC enforcement            │       
                               │  └──────────────────────────────┘       
                               │                                       
                               │  ┌──────────────────────────────┐       
                               │  │  Archival Service            │       
                               │  │  - Cron job (bulk archive)   │       
                               │  │  - API endpoint (single)     │       
                               │  │  - Restore endpoint          │       
                               │  └──────────────────────────────┘       
                               └─────────────────────────────────────┘
```

### 3.2 Data Flow

**Course Creation (Semester Start)**:
```
1. HISinOne exports course list (CSV/JSON/XML)
2. Bulk sync script reads export, calls /api/v1/courses/bulk-create
3. API creates courses in ILIAS/Moodle, assigns categories
4. API creates Keycloak groups for each course (course-{id}-students, course-{id}-instructors)
5. API syncs enrollments from HISinOne to LMS
```

**Enrollment Update (Real-Time)**:
```
1. HISinOne sends webhook event (student enrolled/withdrawn)
2. Webhook receiver validates signature, parses event
3. API updates LMS enrollment (add/remove student)
4. API updates Keycloak group membership
```

**Archival (Semester End)**:
```
1. Cron job triggers /api/v1/archival/bulk for previous semester
2. API iterates all courses in semester
3. For each course:
   - Freeze enrollments (no new additions)
   - Set course status to "archived"
   - Restrict access (read-only for students/instructors)
   - Move to archived category in LMS
4. Log archival results, send notification
```

---

## 4. IMPLEMENTATION DETAILS

### 4.1 Course Provisioning API

**Endpoints**:
- `POST /api/v1/courses` — Create single course
- `POST /api/v1/courses/bulk-create` — Create multiple courses (semester start)
- `GET /api/v1/courses/{course_id}` — Get course details
- `PUT /api/v1/courses/{course_id}` — Update course
- `DELETE /api/v1/courses/{course_id}` — Soft-delete course
- `POST /api/v1/courses/{course_id}/enrollments` — Bulk enroll users
- `GET /api/v1/semesters` — List all semesters
- `POST /api/v1/semesters` — Create new semester

**Request/Response Examples**:

```json
// POST /api/v1/courses
{
  "semester_id": "2026ws",
  "title": "Einführung in die Informatik",
  "title_en": "Introduction to Computer Science",
  "course_code": "INF-101",
  "instructor_ids": ["user-123"],
  "expected_enrollment": 120,
  "lms": "ilias",  // or "moodle"
  "category": "informatik-bachelor"
}

// Response
{
  "course_id": "crs_abc123",
  "lms_course_id": "ilias_456",
  "semester_id": "2026ws",
  "status": "active",
  "created_at": "2026-03-29T10:00:00Z"
}
```

### 4.2 Role-Based Access Control (RBAC)

**Keycloak Group Structure**:
```
opendesk-edu/
  ├── semesters/
  │   ├── 2026ws/          # Wintersemester 2026
  │   │   ├── students/
  │   │   ├── instructors/
  │   │   └── courses/
  │   │       ├── crs_abc123-students
  │   │       ├── crs_abc123-instructors
  │   │       ├── crs_def456-students
  │   │       └── crs_def456-instructors
  │   └── 2026ss/          # Sommersemester 2026
  └── roles/
      ├── student
      ├── instructor
      └── tutor
```

**Role Mapping**:
| Keycloak Group | LMS Role (ILIAS) | LMS Role (Moodle) |
|----------------|------------------|-------------------|
| `.../students` | Participant | Student |
| `.../instructors` | Administrator | Teacher |
| `.../tutors` | Assistant | Teaching Assistant |

### 4.3 Automated Archival

**Archival Workflow**:
1. **Trigger**: Cron job (daily at 02:00) checks for semesters ending >30 days ago
2. **Pre-Archive Check**: Verify no active enrollments, no pending assignments
3. **Archive Steps**:
   - Set LMS course status to "hidden" or "archived"
   - Remove active enrollments (preserve history)
   - Move course to "Archived" category
   - Create archive snapshot (database backup + file export)
   - Update Keycloak groups (add `archived` tag)
4. **Post-Archive**: Send notification to instructors, log results

**Restore Workflow**:
1. Admin calls `POST /api/v1/archival/restore/{archive_id}`
2. System creates new course from archive snapshot
3. Re-enroll users from archived enrollment list
4. Restore to active semester category

### 4.4 HISinOne Integration Hooks

**Webhook Receiver**:
- Endpoint: `POST /api/v1/webhooks/hisinone`
- Authentication: HMAC signature validation (shared secret)
- Event Types:
  - `enrollment.created` — Student enrolled in course
  - `enrollment.deleted` — Student withdrew from course
  - `instructor.changed` — Course instructor updated
  - `course.created` — New course in HISinOne
  - `course.deleted` — Course removed from HISinOne

**Bulk Sync Endpoint**:
- Endpoint: `POST /api/v1/sync/bulk`
- Input: CSV/JSON export from HISinOne
- Process: Full sync of courses + enrollments for specified semester

---

## 5. FILE STRUCTURE

```
scripts/semester-provisioning/
├── api/
│   ├── server.py                 # FastAPI app entry point
│   ├── main.py                   # API configuration, startup/shutdown
│   ├── routes/
│   │   ├── courses.py            # Course CRUD endpoints
│   │   ├── enrollments.py        # Enrollment management
│   │   ├── semesters.py          # Semester management
│   │   └── archival.py           # Archival endpoints
│   ├── models/
│   │   ├── course.py             # Pydantic models for courses
│   │   ├── enrollment.py         # Pydantic models for enrollments
│   │   └── semester.py           # Pydantic models for semesters
│   ├── utils/
│   │   ├── ilias_client.py       # ILIAS API client
│   │   ├── moodle_client.py      # Moodle API client
│   │   ├── keycloak_client.py    # Keycloak admin API client
│   │   └── webhook_validator.py  # HMAC signature validation
│   └── config/
│       └── settings.py           # Configuration (env vars, YAML)
├── archival/
│   ├── archive_course.py         # Archive single course
│   ├── bulk_archive.py           # Bulk archival script
│   └── restore_course.py         # Restore archived course
├── sync/
│   ├── hisinone_webhook.py       # Standalone webhook server
│   └── bulk_sync.py              # Bulk sync from CSV/JSON
├── tests/
│   ├── conftest.py               # Pytest fixtures
│   ├── test_api_courses.py       # Course API tests
│   ├── test_api_enrollments.py   # Enrollment API tests
│   ├── test_api_archival.py      # Archival API tests
│   ├── test_ilias_client.py      # ILIAS client tests
│   ├── test_moodle_client.py     # Moodle client tests
│   ├── test_keycloak_client.py   # Keycloak client tests
│   └── test_archival_logic.py    # Archival logic tests
├── config/
│   ├── config.yaml.example       # Sample configuration
│   └── config.yaml               # Actual configuration (gitignored)
├── Dockerfile                    # Docker image for standalone execution
├── requirements.txt              # Python dependencies
├── requirements-dev.txt          # Dev/test dependencies
└── README.md                     # Usage documentation (bilingual)
```

**Documentation**:
```
docs/
├── semester-lifecycle.md         # User guide (bilingual)
├── api/
│   └── semester-provisioning-api.md  # API reference
└── integration/
    └── hisinone-webhooks.md      # HISinOne integration guide
```

---

## 6. TEST STRATEGY

### 6.1 Unit Tests
- Test all API endpoints with mock data
- Test ILIAS/Moodle/Keycloak client methods
- Test archival logic (archive, restore, bulk operations)
- Test webhook validation (HMAC signature)

### 6.2 Integration Tests
- Test full course creation flow (API → LMS → Keycloak)
- Test enrollment sync (API → LMS)
- Test archival workflow (API → LMS → archive storage)
- Test HISinOne webhook processing

### 6.3 End-to-End Tests
- Simulate semester start (bulk course creation + enrollment)
- Simulate semester end (bulk archival)
- Simulate mid-semester changes (enrollment updates)

### 6.4 Test Coverage Goals
- **API endpoints**: 100% coverage
- **Business logic**: 90%+ coverage
- **Integration points**: 80%+ coverage

---

## 7. DEPLOYMENT

### 7.1 Docker Image
```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "api.server:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 7.2 Helm Chart Integration
Add to `helmfile/apps/semester-provisioning/`:
- Deployment (FastAPI server)
- Service (ClusterIP)
- CronJob (bulk archival job)
- ConfigMap (configuration)
- Secret (API keys, credentials)

### 7.3 Environment Variables
```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_DEBUG=false

# ILIAS Configuration
ILIAS_API_URL=https://ilias.university.de/webservice/index.php
ILIAS_API_USER=opendesk-edu
ILIAS_API_KEY=xxx

# Moodle Configuration
MOODLE_API_URL=https://moodle.university.de/webservice/rest/server.php
MOODLE_API_TOKEN=xxx

# Keycloak Configuration
KEYCLOAK_URL=https://keycloak.university.de
KEYCLOAK_REALM=opendesk-edu
KEYCLOAK_ADMIN_USER=opendesk-edu-admin
KEYCLOAK_ADMIN_PASSWORD=xxx

# HISinOne Webhook Configuration
HISINONE_WEBHOOK_SECRET=xxx
HISINONE_WEBHOOK_PORT=8001
```

---

## 8. ACCEPTANCE CRITERIA

### 8.1 Functional Requirements
- [ ] API can create courses in ILIAS and Moodle
- [ ] API can manage enrollments (add, remove, bulk sync)
- [ ] API can archive courses (single + bulk)
- [ ] API can restore archived courses
- [ ] HISinOne webhooks are received and processed correctly
- [ ] Keycloak groups are created and managed automatically
- [ ] Role mapping to LMS roles works correctly

### 8.2 Non-Functional Requirements
- [ ] All tests pass (unit + integration + e2e)
- [ ] Documentation is bilingual (German/English)
- [ ] Code follows existing project patterns
- [ ] No breaking changes to existing functionality
- [ ] Docker image builds successfully
- [ ] API is secure (authentication, authorization, input validation)

### 8.3 Documentation Requirements
- [ ] User guide (`docs/semester-lifecycle.md`) complete
- [ ] API reference (`docs/api/semester-provisioning-api.md`) complete
- [ ] HISinOne integration guide (`docs/integration/hisinone-webhooks.md`) complete
- [ ] README in `scripts/semester-provisioning/` complete

---

## 9. RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|:-----|:-------|:----------|
| ILIAS/Moodle API changes | Breaks provisioning | Use official SDKs where available; version-lock dependencies |
| HISinOne API access not available | Blocks integration | Provide CSV import fallback; document manual process |
| Large-scale enrollment sync performance | Slow API responses | Batch operations; async processing for bulk sync |
| Data loss during archival | Critical | Archive snapshots stored separately; restore tested |
| Keycloak group explosion (too many groups) | Performance issues | Use hierarchical groups; limit course-specific groups |

---

## 10. TIMELINE

| Task | Estimated Duration | Priority |
|:-----|:-------------------|:---------|
| Create API skeleton (FastAPI server, routes) | 2 hours | High |
| Implement ILIAS client | 3 hours | High |
| Implement Moodle client | 3 hours | High |
| Implement Keycloak client | 2 hours | High |
| Implement course provisioning endpoints | 4 hours | High |
| Implement enrollment endpoints | 3 hours | High |
| Implement archival endpoints | 3 hours | High |
| Implement HISinOne webhook receiver | 3 hours | Medium |
| Write unit tests | 4 hours | High |
| Write integration tests | 4 hours | Medium |
| Write documentation | 4 hours | High |
| Docker packaging | 1 hour | Medium |
| **Total** | **~40 hours** | |

---

## 11. SUCCESS METRICS

- **API uptime**: 99.9% (during active semesters)
- **Course creation time**: <5 seconds per course
- **Enrollment sync latency**: <1 minute (webhook to LMS)
- **Archival success rate**: 100% (all courses archived without error)
- **Test coverage**: 90%+ code coverage

---

## 12. APPROVAL

**Plan Reviewed By**: [Pending]
**Plan Approved**: [Pending]
**Implementation Start**: 2026-03-29
**Target Completion**: 2026-03-30

---

## TODOs

- [x] Create detailed plan for Semester Lifecycle Management
- [ ] Implement Course Provisioning API
- [ ] Implement Role-Based Access Control (RBAC) for semester enrollment
- [ ] Implement Automated Course Archival
- [ ] Create HISinOne integration hooks
- [ ] Write documentation and tests
- [ ] Pass Final Verification Wave

---

## Final Verification Wave

- [ ] F1: Code Review — All code reviewed, follows patterns, no security issues
- [ ] F2: Test Verification — All tests pass, coverage >90%
- [ ] F3: Documentation Review — All docs complete, bilingual, accurate
- [ ] F4: Integration Verification — API works with ILIAS/Moodle/Keycloak, webhooks functional

---

*This plan is subject to change based on implementation findings and user feedback.*
