// Mirrors backend DTOs field-for-field (AssignmentTemplateController,
// AssignmentInstanceController, AssignmentSubmissionQueueController,
// AssignmentCapabilityController on rasa-ai main@39e6254). Do not rename
// fields without a matching backend change.
//
// Answer-key-bearing types (AssignmentTemplateVersionDTO, AssignmentQuestionDTO,
// AssignmentQuestionOptionDTO, CreateOptionRequest, UpdateOptionRequest) and the
// staff submission-detail family live in
// features/assignments/data-access/assignment-staff.model.ts instead of here --
// see that file's header comment and Slice 15 Plan v2.1.2 §8.2. This file
// contains only shapes that carry no isCorrect field and are not part of an
// object graph that does.

export type AssignmentTemplateVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type AssignmentInstanceStatus = 'ACTIVE' | 'CLOSED' | 'WITHDRAWN';
export type StudentAssignmentStatus = 'DRAFT' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'VALIDATED' | 'CLOSED';
export type AssignmentQuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'SHORT_TEXT' | 'LONG_TEXT';
export type AttemptReviewDecision = 'VALIDATED' | 'REVISION_REQUESTED';
export type ResponseOutcome = 'ACCEPTED' | 'NEEDS_REVISION' | 'AUTO_CORRECT' | 'AUTO_INCORRECT';

export interface AssignmentTemplateDTO {
  id: number; moduleId: number; curriculumVersionId: number;
  displayStatus: string; publishedVersionId: number | null; draftVersionId: number | null;
  rowVersion: number; createdAt: string; createdBy: number;
  archivedAt: string | null; archivedBy: number | null;
}

export interface AssignmentTemplateSummaryDTO {
  id: number; moduleId: number; moduleTitle: string;
  curriculumVersionId: number; curriculumTitle: string;
  displayStatus: string; draftTitle: string | null; publishedTitle: string | null;
  rowVersion: number; createdAt: string; createdBy: number;
  archivedAt: string | null; archivedBy: number | null;
}

export interface AssignmentEligibleClassDTO {
  classId: number;
  className: string;
}

export interface CreateAssignmentTemplateRequest {
  moduleId: number;
  curriculumVersionId: number;
}

export interface CreateQuestionRequest {
  questionType: AssignmentQuestionType;
  prompt: string;
  questionOrder: number;
  maxSelections: number | null;
}

export interface UpdateQuestionRequest {
  expectedRowVersion: number;
  prompt: string;
  questionOrder: number;
  maxSelections: number | null;
}

export interface ReorderEntry { id: number; expectedRowVersion: number; }
export interface ReorderQuestionsRequest { entries: ReorderEntry[]; }
export interface ReorderOptionsRequest { entries: ReorderEntry[]; }

/** Reused for publish, archive, deleteQuestion, deleteOption. */
export interface AssignmentExpectedRowVersionRequest { expectedRowVersion: number; }

export interface UpdateTemplateVersionTitleRequest {
  expectedRowVersion: number;
  title: string;
}

export interface AssignInstanceRequest {
  templateId: number;
  classId: number;
  dueAt: string;
  idempotencyKey: string;
}

/** POST /instances response only -- status is a plain string here (backend Java type asymmetry, wire format identical, see Plan §3.4). */
export interface AssignmentInstanceDTO {
  id: number; templateVersionId: number; moduleId: number; classId: number;
  dueAt: string; status: AssignmentInstanceStatus; idempotencyKey: string;
  rowVersion: number; createdAt: string; createdBy: number;
  closedAt: string | null; withdrawnAt: string | null; withdrawnBy: number | null;
}

export interface AssignmentInstanceSummaryDTO {
  id: number; classId: number; className: string;
  templateVersionId: number; templateTitle: string;
  moduleId: number; moduleTitle: string;
  dueAt: string; status: AssignmentInstanceStatus; rowVersion: number;
  createdAt: string; createdBy: number;
  closedAt: string | null; withdrawnAt: string | null; withdrawnBy: number | null;
}

export interface AssignmentInstanceDetailDTO {
  id: number; templateVersionId: number; templateTitle: string;
  moduleId: number; moduleTitle: string; classId: number; className: string;
  dueAt: string; status: AssignmentInstanceStatus; idempotencyKey: string;
  rowVersion: number; createdAt: string; createdBy: number;
  closedAt: string | null; withdrawnAt: string | null; withdrawnBy: number | null;
}

export type ParticipationState = 'ISSUED' | 'SKIPPED' | 'UNDECIDED';

export interface AssignmentInstanceStudentRollupDTO {
  studentId: number; firstName: string; lastName: string;
  participationState: ParticipationState;
  studentAssignmentStatus: StudentAssignmentStatus | null;
  studentAssignmentId: number | null;
  attemptNumber: number | null;
  currentlyActiveEnrollment: boolean;
}

export interface AssignmentLateEnrolleeCandidateDTO {
  studentId: number; firstName: string; lastName: string; enrollmentStartDate: string;
}

/** No rowVersion -- queue rows are never round-tripped into a write call (see assignment-staff.model.ts StaffSubmissionDetailDTO). */
export interface SubmissionQueueEntryDTO {
  attemptId: number; studentAssignmentId: number; studentId: number;
  attemptNumber: number; submittedAt: string;
  firstName: string; lastName: string;
  classId: number; className: string;
  templateVersionId: number; templateTitle: string; moduleId: number;
}

export interface AssignmentCapabilityDTO {
  globalEnabled: boolean;
  providerEnabled: boolean;
  effectiveEnabled: boolean;
}

export interface AssignmentErrorResponse {
  code: string;
  message: string;
  resource: string | null;
}
