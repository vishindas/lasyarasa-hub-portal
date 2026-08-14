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

export interface StudentLearningLessonSummaryDTO {
  lessonId: number;
  title: string;
  contentType: LessonContentType;
  lessonOrder: number;
  /** present only for VIDEO lessons */
  videoAvailability?: VideoAvailability;
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

export interface StudentLessonDetailDTO {
  lessonId: number;
  moduleId: number;
  title: string;
  contentType: LessonContentType;
  lessonOrder: number;
  videoAvailability?: VideoAvailability;
  /** present only when videoAvailability === 'AVAILABLE' */
  videoId?: string;
  /** TEXT only */
  textContent?: string;
  /** PDF_LINK/EXTERNAL_LINK only */
  externalUrl?: string;
  /** PDF_LINK/EXTERNAL_LINK only */
  externalLinkLabel?: string;
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
}

/** The one existing endpoint this feature reuses, not one Slice 11 adds. */
export interface StudentAccessDTO {
  studentId: number;
  providerId: number;
  studentDisplayName: string;
  providerDisplayName: string;
  accessType: 'SELF' | 'GUARDIAN';
}
