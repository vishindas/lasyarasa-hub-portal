import { AssignmentTemplateVersionDTO } from '../data-access/assignment-staff.model';

/**
 * T3 auto-draft-on-edit's resolution outcome. `freshlyCreated` distinguishes
 * the two cases a caller (question-list.ts/option-list.ts) MUST handle
 * differently when resolving a mutation target (T3 defect fix, follow-up
 * review of 7143f85):
 *
 * - freshlyCreated = true: a draft was JUST cloned from the published
 *   version THIS call. `version.questions` is the ONLY trustworthy source
 *   of current question/option ids+rowVersions -- the caller's own local
 *   component state still reflects the PUBLISHED snapshot (new ids were
 *   minted by the clone) and must not be used to source a mutation target.
 * - freshlyCreated = false: a draft already existed before this call (either
 *   from an earlier auto-draft in the same session, or the template started
 *   with one). The caller's own local state is already correct and current
 *   -- more current, in fact, than `version.questions` here, since
 *   template-editor.ts's own `version` signal is only refreshed by a full
 *   load() and does NOT track question/option-level edits made inside
 *   question-list.ts/option-list.ts after the draft was created. Callers
 *   must resolve from their OWN local state in this branch, not from
 *   `version.questions`.
 *
 * Both branches resolve the actual target by matching questionOrder/
 * optionOrder (the one identifier cloning preserves 1:1), never by id.
 */
export interface EnsureDraftOutcome {
  version: AssignmentTemplateVersionDTO;
  freshlyCreated: boolean;
}
