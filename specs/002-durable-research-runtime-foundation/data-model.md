# Data Model: Durable Research Runtime Foundation

## ResearchProjectState

Workspace-level state stored at `.sk/research/state.json`.

- `schemaVersion`: state schema marker.
- `currentSessionId`: active session pointer.
- `sessions`: summarized session records for status and selection.

## ResearchSessionState

Session-level state stored at `.sk/research/sessions/<session-id>/state.json`.

- `sessionId`
- `objective`
- `phase`
- `createdAt`
- `updatedAt`
- `nextSequence`
- `currentPlanId`
- `gates`
- `plans`
- `claims`
- `evidence`

## ResearchPlanRecord

Draft plan record persisted inside session state.

- `id`
- `sessionId`
- `title`
- `objective`
- `expectedEvidence`
- `successCriteria`
- `stopCondition`
- `rollbackPlan`
- `status`
- `createdAt`
- `updatedAt`

## ClaimRecord

Initial typed claim ledger contract for later claim-promotion work. It follows the v2 architecture plan support levels: `unverified`, `observed`, `replicated`, `ablation_supported`, `externally_validated`, and `rejected`.

## EvidenceRecord

Initial typed evidence ledger contract for later evidence ingestion and analysis work.

## Gate Rules

The initial gate set tracks objective, scope, and plan readiness. This slice records objective and plan gates; scope remains missing until a later scope/evidence-review slice.
