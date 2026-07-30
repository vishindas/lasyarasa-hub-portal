# Production Safety Rules

This is a production School Admin SaaS application containing real student and minor data. These rules are non-negotiable and apply to all work in this repository.

- Never implement directly on `main`. Use one narrow, independently testable implementation slice per commit — no unrelated refactoring or cleanup mixed into a slice.
- Never deploy, restart production, modify production configuration, or modify production data without explicit authorization for that exact slice. Approval of one slice does not authorize another slice.
- Stop if code, database, or production state differs from the approved plan.
- Never expose or commit secrets, backups, CSV exports, or student data.
- Before a production schema deployment, create and verify a timestamped backup.
- Production database changes must initially be additive and backward-compatible.
- Never perform destructive SQL or restore a backup without explicit approval.
- Run focused tests and the relevant complete build before requesting deployment. If no tests exist, state "0 tests" — never present that as test coverage.
- Preserve the previous production version as the rollback target.
- After completing an authorized slice, report results and stop for approval.
- Keep reports concise: scope, files, DB impact, tests/build, commit, deployment, unexpected findings, deferred work, and STOPPED.
- Read the current project status document (tracked in the backend repo: `ws_lasyarasa_hub_backend/docs/STUDENT_IDENTITY_PROJECT_STATUS.md`) before beginning work.
