// Mirrors the Slice 5 curriculum admin API DTOs exactly (backend package
// com.lasyarasa.hub.backend.api.dto.school.curriculum). Field names/order
// verified against the DTO source on main @ bb71eb6 -- do not rename a
// field here without a matching backend change.

export type CurriculumVersionStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type ModuleContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ClassModuleStatus = 'LOCKED' | 'RELEASED' | 'COMPLETED' | 'WITHDRAWN';
export type MigrationMappedState = 'LOCKED' | 'RELEASED' | 'COMPLETED';

export interface Curriculum {
  id: number;
  providerId: number;
  danceStyleId: number;
  internalName: string;
  rowVersion: number;
  createdAt: string;
  createdBy: number;
}

export interface CurriculumVersion {
  id: number;
  curriculumId: number;
  versionNumber: number;
  status: CurriculumVersionStatus;
  title: string;
  level: string | null;
  objectives: string | null;
  clonedFromVersionId: number | null;
  rowVersion: number;
  activatedAt: string | null;
  activatedBy: number | null;
  archivedAt: string | null;
  archivedBy: number | null;
}

export interface CurriculumModule {
  id: number;
  curriculumVersionId: number;
  title: string;
  objectives: string | null;
  moduleOrder: number;
  contentStatus: ModuleContentStatus;
  rowVersion: number;
  publishedAt: string | null;
  publishedBy: number | null;
  archivedAt: string | null;
  archivedBy: number | null;
}

export interface ClassCurriculumAssignment {
  id: number;
  classId: number;
  curriculumVersionId: number;
  activeFrom: string | null;
  activeTo: string | null;
  endedBy: number | null;
  rowVersion: number;
}

export interface ClassModuleState {
  id: number;
  classCurriculumAssignmentId: number;
  moduleId: number;
  status: ClassModuleStatus;
  rowVersion: number;
  releasedAt: string | null;
  releasedBy: number | null;
  completedAt: string | null;
  completedBy: number | null;
  withdrawnAt: string | null;
  withdrawnBy: number | null;
  withdrawReason: string | null;
  relockedAt: string | null;
  relockedBy: number | null;
  /** CURR-FUNC-07: set once, first RELEASED-state access by a learner or their guardian; never overwritten. */
  firstLearnerInteractionAt: string | null;
  firstLearnerInteractionBy: number | null;
  /**
   * CURR-FUNC-07: single, server-computed, authoritative signal -- true only
   * if Re-lock would actually succeed right now. Advisory only: the backend's
   * own guarded write remains the real authority regardless of this field.
   */
  relockEligible: boolean;
}

export interface ModuleDiffEntry {
  oldModuleId: number | null;
  oldTitle: string | null;
  newModuleId: number | null;
  newTitle: string | null;
}

export interface ChangeCurriculumPreviewResponse {
  targetCurriculumVersionId: number;
  added: ModuleDiffEntry[];
  removed: ModuleDiffEntry[];
  matching: ModuleDiffEntry[];
}

// -- Requests -----------------------------------------------------------

export interface CreateCurriculumRequest {
  danceStyleId: number;
  internalName: string;
  title: string;
  level: string | null;
  objectives: string | null;
}

export interface UpdateDraftContentRequest {
  title: string;
  level: string | null;
  objectives: string | null;
  expectedRowVersion: number;
}

export interface ExpectedRowVersionRequest {
  expectedRowVersion: number;
}

export interface CreateModuleRequest {
  title: string;
  objectives: string | null;
  moduleOrder: number;
}

export interface UpdateModuleRequest {
  title: string;
  objectives: string | null;
  expectedRowVersion: number;
}

export interface ReorderModuleEntry {
  moduleId: number;
  expectedRowVersion: number;
  newOrder: number;
}

export interface ReorderModulesRequest {
  entries: ReorderModuleEntry[];
}

export interface AssignCurriculumRequest {
  curriculumVersionId: number;
  expectedRowVersion: number;
}

export interface WithdrawModuleRequest {
  reason: string;
  expectedRowVersion: number;
}

export interface ModuleMappingEntry {
  oldModuleId: number;
  newModuleId: number;
  mappedState: MigrationMappedState;
}

export interface ChangeCurriculumConfirmRequest {
  targetCurriculumVersionId: number;
  targetVersionExpectedRowVersion: number;
  currentAssignmentId: number;
  currentAssignmentExpectedRowVersion: number;
  mappings: ModuleMappingEntry[];
}

// -- Error envelope -------------------------------------------------------
// CurriculumApiExceptionHandler's structured response: {code, message, resource}.

export type CurriculumErrorCode =
  | 'RESOURCE_NOT_FOUND'
  | 'STALE_VERSION'
  | 'ILLEGAL_TRANSITION'
  | 'VALIDATION_FAILED'
  | 'WRITE_FROZEN'
  | 'FULL_OUTAGE';

export interface CurriculumErrorResponse {
  code: CurriculumErrorCode | string;
  message: string;
  resource: string | null;
}

// -- Lessons (Slice 9, mirrors Slice 8's Lesson DTOs field-for-field,
//    verified against the backend DTO source on main @ 9692c80 -- do not
//    rename a field here without a matching backend change) -------------

export type LessonContentType = 'VIDEO' | 'TEXT' | 'PDF_LINK' | 'EXTERNAL_LINK';
export type LessonLifecycleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type LessonVideoAvailability = 'AVAILABLE' | 'UNAVAILABLE';

/** The MVP externally-returned classification set (Slice 8 architect decision 2) -- PRIVATE is never returned; it collapses into UNAVAILABLE. */
export type YouTubeValidationResultKind = 'VALID' | 'INVALID' | 'UNSUPPORTED' | 'UNAVAILABLE';

export interface Lesson {
  id: number;
  moduleId: number;
  title: string;
  /**
   * MC-3 clean-slate architecture: `null` for every lesson created under
   * the new metadata-only contract -- it does NOT mean "no content." It
   * means the lesson is block-native: its content lives entirely in
   * lesson_content_blocks (LessonContentBlock[] below), fetched separately
   * via LessonContentBlockApiService. A legacy lesson created before MC-3
   * still carries its original single content_type here, unchanged.
   */
  contentType: LessonContentType | null;
  lessonOrder: number;
  lifecycleStatus: LessonLifecycleStatus;
  videoId: string | null;
  videoAvailability: LessonVideoAvailability | null;
  textContent: string | null;
  externalUrl: string | null;
  externalLinkLabel: string | null;
  practiceNotes: string | null;
  rowVersion: number;
  publishedAt: string | null;
  publishedBy: number | null;
  archivedAt: string | null;
  archivedBy: number | null;
  attestedAt: string | null;
  attestedBy: number | null;
}

/**
 * MC-3 clean-slate architecture: metadata-only. No `contentType` and no
 * legacy content fields -- lesson_content_blocks is now the sole content
 * model; a lesson is created here purely as its lifecycle/metadata
 * container, with content_type and every legacy content column left NULL
 * server-side. Content blocks are added afterward, zero or more, through
 * LessonContentBlockApiService.
 *
 * CURR-FUNC-02: no lessonOrder field, same reasoning as before -- assigned
 * atomically, server-side, by LessonService.create() itself.
 */
export interface CreateLessonRequest {
  title: string;
  practiceNotes: string | null;
}

/**
 * MC-3 clean-slate architecture: metadata-only, same reasoning as
 * CreateLessonRequest. No legacy content fields -- editing a lesson's
 * content now means editing its lesson_content_blocks through
 * LessonContentBlockApiService, never this endpoint.
 */
export interface UpdateLessonRequest {
  title: string;
  practiceNotes: string | null;
  expectedRowVersion: number;
}

export interface ReorderLessonEntry {
  lessonId: number;
  expectedRowVersion: number;
  newOrder: number;
}

export interface ReorderLessonsRequest {
  entries: ReorderLessonEntry[];
}

/** attested is only meaningful for a VIDEO lesson; ignored for the other three content types. */
export interface PublishLessonRequest {
  expectedRowVersion: number;
  attested: boolean;
}

export interface RepairLessonVideoRequest {
  url: string;
  expectedRowVersion: number;
  attested: boolean;
}

export interface ValidateYouTubeUrlRequest {
  url: string;
}

/** videoId is non-null only when result is VALID. */
export interface ValidateYouTubeUrlResponse {
  result: YouTubeValidationResultKind;
  videoId: string | null;
}

// -- Lesson content blocks (MC-2 API, MC-3 admin authoring -- mirrors the
//    backend DTOs field-for-field, com.lasyarasa.hub.backend.api.dto.school.
//    curriculum.LessonContentBlock*). Canonical lesson content as of MC-3;
//    a lesson's own legacy content_type/content fields are frozen residue
//    for a pre-MC-3 lesson only -- every new lesson has zero or more of
//    these instead. -----------------------------------------------------

/** No rowVersion -- blocks have none (MC-2 architect decision: coarse, lesson-level concurrency only, guarded by the parent Lesson's own rowVersion). */
export interface LessonContentBlock {
  id: number;
  lessonId: number;
  contentType: LessonContentType;
  displayOrder: number;
  videoId: string | null;
  videoAvailability: LessonVideoAvailability | null;
  textContent: string | null;
  externalUrl: string | null;
  externalLinkLabel: string | null;
}

/**
 * Create-only -- no displayOrder (server-assigned atomically). Exactly one
 * of youtubeUrl/textContent/(externalUrl+externalLinkLabel) is populated,
 * per contentType. Unlike a legacy lesson, an incomplete DRAFT block is
 * legal here -- e.g. a VIDEO block with no video chosen yet.
 *
 * expectedLessonRowVersion guards the PARENT lesson's row, not a block's
 * own. rowVersion is an opaque concurrency token, never arithmetic --
 * every mutation response's `lesson.rowVersion` must replace the caller's
 * cached value verbatim; never assume oldVersion + 1 (a reorder of N
 * blocks can advance it by up to 2N).
 */
export interface CreateLessonContentBlockRequest {
  contentType: LessonContentType;
  expectedLessonRowVersion: number;
  youtubeUrl: string | null;
  textContent: string | null;
  externalUrl: string | null;
  externalLinkLabel: string | null;
}

/** contentType is immutable after create -- not part of an update. youtubeUrl == null on a VIDEO block means "keep the currently stored video" (CURR-FUNC-04's rule, reused unchanged). */
export interface UpdateLessonContentBlockRequest {
  expectedLessonRowVersion: number;
  youtubeUrl: string | null;
  textContent: string | null;
  externalUrl: string | null;
  externalLinkLabel: string | null;
}

export interface DeleteLessonContentBlockRequest {
  expectedLessonRowVersion: number;
}

export interface ReorderLessonContentBlockEntry {
  blockId: number;
  newOrder: number;
}

/** expectedLessonRowVersion is checked once against the parent lesson -- not per-entry (blocks carry no rowVersion of their own). */
export interface ReorderLessonContentBlocksRequest {
  expectedLessonRowVersion: number;
  entries: ReorderLessonContentBlockEntry[];
}

export interface CheckLessonContentBlockVideoRequest {
  expectedLessonRowVersion: number;
}

/** No attested field -- block-level attestation does not exist (attestation stays lesson-level, applied only at Publish). */
export interface RepairLessonContentBlockVideoRequest {
  url: string;
  expectedLessonRowVersion: number;
}

/** Returned by every block mutation affecting a single block (create/update/check-video/repair-video). `lesson` is always a fresh post-mutation read -- replace any cached expectedLessonRowVersion with exactly `lesson.rowVersion`. */
export interface LessonContentBlockMutationResponse {
  block: LessonContentBlock;
  lesson: Lesson;
}

/** Returned by reorder, whose result is the whole affected block list, not a single block -- same fresh-read/opaque-token contract as LessonContentBlockMutationResponse. */
export interface LessonContentBlockListMutationResponse {
  blocks: LessonContentBlock[];
  lesson: Lesson;
}
