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
