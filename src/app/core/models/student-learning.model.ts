/**
 * Mirrors the six deployed Slice 11 DTOs exactly (read directly from
 * ws_lasyarasa_hub_backend @ 166ae5c, not inferred). Field names match the
 * real JSON on the wire; conditional/omitted fields are optional here since
 * the backend uses @JsonInclude(NON_NULL) -- an absent key, not a null
 * value, for every "present only when..." field documented below.
 */

export interface StudentClassDTO {
  classId: number;
  className: string;
  schedule: string | null;
}

export interface LearningPathSummaryDTO {
  curriculumTitle: string;
  level: string | null;
}

export interface CurrentModuleSummaryDTO {
  moduleId: number;
  title: string;
  moduleOrder: number;
  status: ClassModuleStatus;
}

export interface StudentLearningHomeDTO {
  selectedClassId?: number;
  classSelectionRequired: boolean;
  classChoices?: StudentClassDTO[];
  learningPath?: LearningPathSummaryDTO;
  currentModule?: CurrentModuleSummaryDTO;
}

export type ClassModuleStatus = 'LOCKED' | 'RELEASED' | 'COMPLETED' | 'WITHDRAWN';

export interface ModuleSummaryDTO {
  moduleId: number;
  title: string;
  moduleOrder: number;
  status: ClassModuleStatus;
  /** present only when status is RELEASED or COMPLETED */
  objectives?: string;
  /** present only when status is RELEASED or COMPLETED */
  publishedLessonCount?: number;
}

export interface LearningPathDTO {
  curriculumTitle: string;
  level: string | null;
  modules: ModuleSummaryDTO[];
}

export type LessonContentType = 'VIDEO' | 'TEXT' | 'PDF_LINK' | 'EXTERNAL_LINK';
export type VideoAvailability = 'AVAILABLE' | 'UNAVAILABLE';

/**
 * MC-4 architect decision: `contentType` and the legacy lesson-level
 * `videoAvailability` chip are both removed outright, not replaced with a
 * block-aware equivalent -- once content lives in lesson_content_blocks, a
 * lesson has zero-to-N VIDEO blocks each with their own availability, and
 * no aggregate field (`hasUnavailableVideo` or similar) is introduced
 * either (explicitly declined). VIDEO availability is block-level state
 * now, shown only when the student opens the lesson (see
 * StudentContentBlock), never projected into a summary row.
 */
export interface StudentLearningLessonSummaryDTO {
  lessonId: number;
  title: string;
  lessonOrder: number;
}

/**
 * MC-4: one content block within a student's lesson-detail read. Not the
 * admin LessonContentBlock type reused verbatim -- deliberately narrower;
 * a student never addresses a block individually and never sends `id`
 * back in a request, it exists purely as a stable render-loop key.
 * `videoId` is present only when `videoAvailability = AVAILABLE` --
 * absent (never a placeholder) when UNAVAILABLE. Every field below is
 * `?` because the backend DTO is `@JsonInclude(NON_NULL)` -- an absent
 * key, not a null value, for every field not relevant to this block's own
 * contentType.
 */
export interface StudentContentBlock {
  id: number;
  contentType: LessonContentType;
  videoAvailability?: VideoAvailability;
  videoId?: string;
  textContent?: string;
  externalUrl?: string;
  externalLinkLabel?: string;
}

export interface ModuleDetailDTO {
  moduleId: number;
  title: string;
  moduleOrder: number;
  status: ClassModuleStatus;
  /** present only for RELEASED/COMPLETED (LOCKED/WITHDRAWN never reach this DTO at all -- rejected server-side first) */
  objectives?: string;
  lessons?: StudentLearningLessonSummaryDTO[];
}

/**
 * MC-4: block-native. The flat legacy content fields (`contentType`,
 * `videoAvailability`, `videoId`, `textContent`, `externalUrl`,
 * `externalLinkLabel`) that Slice 11's original single-content shape
 * carried at this level are gone entirely -- `blocks` is the sole
 * canonical content model now. `blocks` is always present, always in
 * authoritative order; empty only when every block on the lesson is
 * individually malformed (blocks-only cutover, no legacy-content
 * fallback) -- title/practiceNotes/previous-next navigation stay
 * available regardless (architect decision: never a 404 for this case).
 */
export interface StudentLessonDetailDTO {
  lessonId: number;
  moduleId: number;
  title: string;
  lessonOrder: number;
  blocks: StudentContentBlock[];
  practiceNotes?: string;
  previousLessonId?: number;
  nextLessonId?: number;
}

export interface ClassInfoDTO {
  className: string;
  schedule: string | null;
  curriculumTitle?: string;
  level?: string;
  providerDisplayName?: string;
  /** D2 backend companion: display-only, absent when the class has no dance style set. */
  danceStyleName?: string;
  /** D2 backend companion: display-only, absent when the class has no age group set. */
  ageGroupName?: string;
}

/** The one existing endpoint this feature reuses, not one Slice 11 adds. */
export interface StudentAccessDTO {
  studentId: number;
  providerId: number;
  studentDisplayName: string;
  providerDisplayName: string;
  accessType: 'SELF' | 'GUARDIAN';
}
