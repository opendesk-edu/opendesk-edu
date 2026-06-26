<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Methodology

How to use this OpenSpec with AI-assisted development tools (OpenCode, Claude Code, etc.).

## Structure

```
openspec/
├── specs/          ← Source of truth: behavioral contracts (SHALL/MUST/SHOULD + Given/When/Then)
├── changes/        ← Active change proposals (delta specs: ADDED/MODIFIED/REMOVED)
└── archive/        ← Completed changes (decision log: why, what, how)
```

`specs/` defines what the system **is**. `changes/` defines what the system **will become**. `archive/` records what the system **was** and why.

## Using with AI Agents

### 1. Before delegating work

Write a change proposal in `changes/<change-name>/`:

```
openspec/changes/add-sso-to-typo3/
├── proposal.md    ← What and why
├── specs.md       ← Delta specs (ADDED/MODIFIED/REMOVED)
└── tasks.md       ← Implementation task breakdown
```

The delta spec format forces scope clarity. An AI agent receiving a delta spec knows exactly what to add, modify, or remove — no clarifying questions needed.

Example `specs.md`:
```markdown
## ADDED
- `helmfile/apps/typo3/values.yaml.gotmpl` — OIDC client configuration
  - `sso.oidc.clientId: "typo3"`
  - `sso.oidc.issuerUrl: "${.Values.global.oidc.issuerUrl}"`

## MODIFIED
- `openspec/specs/services/typo3/spec.md` — update Auth from "OIDC" to "OIDC (Keycloak)"

## REMOVED
- (none)
```

### 2. During implementation

Pass the delta spec as the agent prompt. The spec file references the behavioral contracts in `specs/` for acceptance criteria.

### 3. After verification

Move `changes/<change-name>/` to `archive/<change-name>/`. This preserves the decision context: six months later you can answer "why does TYPO3 use OIDC?" from the archived proposal.

## Per-Phase Context Management

For multi-session work, maintain a `STATE.md` at the project root:

```markdown
# STATE.md

## Current Phase: EXECUTE

| Property | Value |
|----------|-------|
| Active Wave | wave-2 |
| Completed | wave-1 (chart scaffolding, values templates) |
| Remaining | wave-3 (ingress, SSO), wave-4 (tests, docs) |
| Blockers | None |
| Verified | 0/4 tasks pass |
```

This replaces the need to re-explain project state in each new session.

## Wave Execution

Independent tasks within a change SHALL be executed in parallel. Dependencies SHALL be respected.

Example for adding a new service:

```
Wave 1 (no deps): chart directory, Chart.yaml, values.yaml, _helpers.tpl
Wave 2 (depends on W1): deployment.yaml, service.yaml, ingress.yaml, db templates
Wave 3 (depends on W2): SSO integration, monitoring rules, backup config
Wave 4 (depends on W3): tests, openspec entry, registry update
```

## Delta Spec Format Reference

| Section | Meaning | Example |
|---------|---------|---------|
| `## ADDED` | New files, configs, services | Chart templates, Helm values |
| `## MODIFIED` | Changes to existing files | Updating auth method in spec |
| `## REMOVED` | Files or configs to delete | Removing deprecated chart dependency |

Each line in a delta section SHALL reference:
- The affected file (path relative to repo root)
- The nature of the change (one sentence)
- Acceptance criteria link to `specs/` (which behavioral contract validates this)

## Conflict Resolution

When two active changes modify the same spec, the later proposal SHALL reference the earlier one and explicitly address the conflict. Neither change SHALL be merged until the conflict is resolved in the proposal.

## Relationship to Other Frameworks

This OpenSpec borrows concepts from three AI development methodologies:

- **OpenSpec** (Fission AI) — Delta spec format, `changes/` artifact model, archival workflow
- **BMAD Method** — Fresh-session-per-phase rule, role-based agent mapping
- **GSD Core** — Wave execution model, state file management, context budget awareness

None are adopted wholesale. The parts that fit our Helmfile-based Kubernetes deployment workflow are extracted; the rest are skipped.
