// Mirrors StudentAssignmentController's DTOs field-for-field
// (rasa-ai main@536740d, api/dto/school/student/assignment/*). Every type
// here is deliberately answer-key-free -- confirmed directly against the
// real backend source, not assumed: StudentQuestionOptionDTO has no
// isCorrect field (it structurally cannot, since the source table it's
// read from has no such column either), and ResponseSummaryDTO's
// textResponse/selectedOptionIds are the STUDENT's own previously-submitted
// answer content, never the answer key.
//
// This file must never import from features/assignments/data-access/**
// (the staff, answer-key-bearing model tree) -- enforced by
// scripts/check-assignment-import-boundary.mjs.

export type StudentAssignmentStatus = 'DRAFT' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'VALIDATED' | 'CLOSED';
export type AssignmentInstanceStatus = 'ACTIVE' | 'CLOSED' | 'WITHDRAWN';
export type StudentAssignmentQuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'SHORT_TEXT' | 'LONG_TEXT';

/** GET /assignments -- summary-list item. Structurally cannot contain answer-key data. */
export interface StudentAssignmentSummaryDTO {
  id: number;
  instanceId: number;
  title: string;
  dueAt: string;
  status: StudentAssignmentStatus;
  attemptNumber: number;
}

/** Deliberately has no isCorrect field -- structurally cannot leak the answer key. */
export interface StudentQuestionOptionDTO {
  id: number;
  optionLabel: string;
  optionOrder: number;
}

/**
 * `editable` is server-derived (AssignmentRevisionEligibilityResolver) and
 * must be trusted directly -- never re-derived client-side from outcome
 * values or any other local signal.
 */
export interface StudentAssignmentQuestionDTO {
  id: number;
  questionType: StudentAssignmentQuestionType;
  prompt: string;
  questionOrder: number;
  maxSelections: number | null;
  options: StudentQuestionOptionDTO[];
  editable: boolean;
}

/** GET /assignments/{id}. No response/answer content field -- see DraftResponseDTO/ResponseSummaryDTO for that. */
export interface StudentAssignmentDetailDTO {
  id: number;
  instanceId: number;
  title: string;
  dueAt: string;
  status: StudentAssignmentStatus;
  attemptNumber: number;
  rowVersion: number;
  instanceStatus: AssignmentInstanceStatus;
  questions: StudentAssignmentQuestionDTO[];
}

/**
 * Slice 14.2: the student's OWN previously-submitted answer content plus
 * its grading outcome. Never carries isCorrect/correct-option data -- the
 * source tables this is read from have no such column.
 */
export interface ResponseSummaryDTO {
  questionId: number;
  outcome: 'ACCEPTED' | 'NEEDS_REVISION' | 'AUTO_CORRECT' | 'AUTO_INCORRECT' | null;
  textResponse: string | null;
  selectedOptionIds: number[];
}

/** GET /assignments/{id}/attempts item. `feedback` exists exactly once, at the attempt level -- never duplicated per-response. */
export interface AttemptDTO {
  attemptNumber: number;
  submittedAt: string;
  reviewDecision: 'VALIDATED' | 'REVISION_REQUESTED' | null;
  reviewedAt: string | null;
  reviewedBy: number | null;
  feedback: string | null;
  responses: ResponseSummaryDTO[];
}

/** GET /assignments/{id}/draft item -- a per-question draft row, own optimistic-concurrency token. */
export interface DraftResponseDTO {
  questionId: number;
  textResponse: string | null;
  selectedOptionIds: number[];
  rowVersion: number;
}

/** PUT /assignments/{id}/draft/{questionId} body. */
export interface SaveDraftRequest {
  textResponse: string | null;
  selectedOptionIds: number[] | null;
  expectedDraftRowVersion: number | null;
}

/** POST .../submit and .../resubmit body -- answers come from already-saved drafts, never from this body. */
export interface SubmitRequest {
  expectedRowVersion: number;
}
