// Staff-scoped, answer-key-bearing assignment models (Slice 15 Plan v2.1.2
// §8.2/§8.3/§12/§13). Holds the complete answer-key-bearing authoring object
// graph (AssignmentTemplateVersionDTO -> AssignmentQuestionDTO ->
// AssignmentQuestionOptionDTO, plus CreateOptionRequest/UpdateOptionRequest,
// kept together because splitting a containment graph across a file
// boundary does not compile) and the staff submission-detail family
// (StaffSubmissionDetailDTO and everything it contains, plus
// ValidateRequest/RequestRevisionRequest, kept alongside it since every real
// consumer reads the detail response first to source expectedAttemptId/
// expectedRowVersion).
//
// DEPENDENCY DIRECTION: this file may import from core/models/assignment.model.ts
// (features -> core is valid). No file under core/** may import from this
// file or from anything under features/assignments/data-access/** -- see
// assignment-import-boundary.spec.ts, which enforces this mechanically.
//
// ANSWER-KEY ISOLATION: this is defense-in-depth, not the security boundary.
// The real boundary is the backend role guard (SCHOOL_ADMIN/HUB_ADMIN/
// SUPER_ADMIN) on every endpoint that returns these shapes -- no student
// session can obtain isCorrect regardless of what this bundle contains. Do
// not import anything from this file (or from
// assignment-authoring-api.service.ts / assignment-submission-review-api.service.ts)
// from a future features/student-assignments/** (Slice 16) directory.

import type {
  AssignmentQuestionType,
  AssignmentTemplateVersionStatus,
  AttemptReviewDecision,
  ResponseOutcome,
  StudentAssignmentStatus
} from '../../../core/models/assignment.model';

export interface AssignmentQuestionOptionDTO {
  id: number;
  questionId: number;
  optionLabel: string;
  optionOrder: number;
  /** Staff-only -- the answer key. */
  isCorrect: boolean;
  rowVersion: number;
}

export interface AssignmentQuestionDTO {
  id: number;
  templateVersionId: number;
  questionType: AssignmentQuestionType;
  prompt: string;
  questionOrder: number;
  maxSelections: number | null;
  rowVersion: number;
  options: AssignmentQuestionOptionDTO[];
}

export interface AssignmentTemplateVersionDTO {
  id: number; templateId: number; moduleId: number; curriculumVersionId: number;
  versionNumber: number; status: AssignmentTemplateVersionStatus;
  title: string; clonedFromVersionId: number | null;
  rowVersion: number; createdAt: string; createdBy: number;
  publishedAt: string | null; publishedBy: number | null;
  archivedAt: string | null; archivedBy: number | null;
  questions: AssignmentQuestionDTO[];
}

export interface CreateOptionRequest {
  optionLabel: string;
  optionOrder: number;
  isCorrect: boolean;
}

export interface UpdateOptionRequest {
  expectedRowVersion: number;
  optionLabel: string;
  optionOrder: number;
  isCorrect: boolean;
}

export interface StaffSubmissionOptionSnapshotDTO {
  optionId: number; optionLabel: string; optionOrder: number; isCorrect: boolean;
}

export interface StaffSubmissionQuestionSnapshotDTO {
  questionId: number; questionType: AssignmentQuestionType; prompt: string;
  questionOrder: number; maxSelections: number | null;
  options: StaffSubmissionOptionSnapshotDTO[];
}

export interface StaffSubmissionAttemptResponseDTO {
  questionId: number;
  textResponse: string | null;
  selectedOptionIds: number[];
  outcome: ResponseOutcome | null;
}

export interface StaffSubmissionAttemptHistoryEntryDTO {
  attemptId: number; attemptNumber: number; submittedAt: string;
  reviewDecision: AttemptReviewDecision | null;
  reviewedAt: string | null; reviewedBy: number | null; feedback: string | null;
  responses: StaffSubmissionAttemptResponseDTO[];
}

/** The single source of expectedAttemptId/expectedRowVersion for Validate/Request-Revision -- never source these from a queue row. */
export interface StaffSubmissionDetailDTO {
  studentAssignmentId: number;
  status: StudentAssignmentStatus;
  attemptNumber: number;
  rowVersion: number;
  studentId: number; firstName: string; lastName: string;
  classId: number; className: string;
  templateVersionId: number; templateTitle: string; moduleId: number; moduleTitle: string;
  currentAttemptId: number;
  questions: StaffSubmissionQuestionSnapshotDTO[];
  attemptHistory: StaffSubmissionAttemptHistoryEntryDTO[];
}

export interface ValidateRequest {
  expectedRowVersion: number;
  expectedAttemptId: number;
}

export interface RequestRevisionRequest {
  expectedRowVersion: number;
  expectedAttemptId: number;
  flaggedQuestionIds: number[];
  feedback: string;
}
