// TEST/DEV-ONLY. Deterministic fixture data for the local browser-
// verification build (src/main.verify.ts). Never imported by src/main.ts
// or anything reachable from the production build graph -- see
// dev-fixtures/README.md.
//
// Every shape below is one of the real curriculum.model.ts interfaces,
// which themselves were verified field-for-field against the Slice 5 DTO
// source on main @ bb71eb6 -- this data cannot silently drift from the
// real contract without a compile error.

import {
  Curriculum, CurriculumVersion, CurriculumModule, ClassCurriculumAssignment, ClassModuleState
} from '../core/models/curriculum.model';
import { DanceStyle } from '../core/models/settings.model';

export const FIXTURE_DANCE_STYLES: DanceStyle[] = [
  { id: 1, name: 'Bharatanatyam', active: true, sortOrder: 1 },
  { id: 2, name: 'Kuchipudi', active: true, sortOrder: 2 }
];

export const FIXTURE_CURRICULA: Curriculum[] = [
  { id: 1, providerId: 1, danceStyleId: 1, internalName: 'Bharatanatyam Beginner Track', rowVersion: 0, createdAt: '2026-05-01T09:00:00', createdBy: 100 },
  { id: 2, providerId: 1, danceStyleId: 2, internalName: 'Kuchipudi Foundations', rowVersion: 0, createdAt: '2026-05-02T09:00:00', createdBy: 100 }
];

export const FIXTURE_VERSIONS: CurriculumVersion[] = [
  { id: 10, curriculumId: 1, versionNumber: 1, status: 'DRAFT', title: 'Beginner Bharatanatyam', level: 'Beginner', objectives: 'Foundational adavus and posture.', clonedFromVersionId: null, rowVersion: 0, activatedAt: null, activatedBy: null, archivedAt: null, archivedBy: null },
  { id: 20, curriculumId: 2, versionNumber: 1, status: 'ACTIVE', title: 'Kuchipudi Foundations', level: 'Beginner', objectives: 'Namaskaram through basic jatis.', clonedFromVersionId: null, rowVersion: 0, activatedAt: '2026-06-01T10:00:00', activatedBy: 100, archivedAt: null, archivedBy: null },
  { id: 21, curriculumId: 2, versionNumber: 2, status: 'ACTIVE', title: 'Kuchipudi Foundations (rev 2)', level: 'Beginner', objectives: 'Adds Padams module.', clonedFromVersionId: 20, rowVersion: 0, activatedAt: '2026-07-01T10:00:00', activatedBy: 100, archivedAt: null, archivedBy: null }
];

export const FIXTURE_MODULES: CurriculumModule[] = [
  // version 10 (DRAFT) -- reorderable/editable
  { id: 101, curriculumVersionId: 10, title: 'Posture & Alignment', objectives: 'Basic standing posture.', moduleOrder: 1, contentStatus: 'DRAFT', rowVersion: 0, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null },
  { id: 102, curriculumVersionId: 10, title: 'Basic Adavus', objectives: 'First eight adavus.', moduleOrder: 2, contentStatus: 'DRAFT', rowVersion: 0, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null },
  // version 20 (ACTIVE) -- structure locked, content-status still mutable
  { id: 201, curriculumVersionId: 20, title: 'Namaskaram', objectives: null, moduleOrder: 1, contentStatus: 'PUBLISHED', rowVersion: 1, publishedAt: '2026-06-02T09:00:00', publishedBy: 100, archivedAt: null, archivedBy: null },
  { id: 202, curriculumVersionId: 20, title: 'Basic Jatis', objectives: null, moduleOrder: 2, contentStatus: 'PUBLISHED', rowVersion: 1, publishedAt: '2026-06-03T09:00:00', publishedBy: 100, archivedAt: null, archivedBy: null },
  { id: 203, curriculumVersionId: 20, title: 'Padams', objectives: null, moduleOrder: 3, contentStatus: 'DRAFT', rowVersion: 0, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null },
  // version 21 (ACTIVE, target for a Change Curriculum preview) -- one matching title, one new
  { id: 211, curriculumVersionId: 21, title: 'Namaskaram', objectives: null, moduleOrder: 1, contentStatus: 'PUBLISHED', rowVersion: 0, publishedAt: '2026-07-02T09:00:00', publishedBy: 100, archivedAt: null, archivedBy: null },
  { id: 212, curriculumVersionId: 21, title: 'Padams (revised)', objectives: null, moduleOrder: 2, contentStatus: 'PUBLISHED', rowVersion: 0, publishedAt: '2026-07-02T09:00:00', publishedBy: 100, archivedAt: null, archivedBy: null }
];

export const FIXTURE_ASSIGNMENT: ClassCurriculumAssignment =
  { id: 50, classId: 1, curriculumVersionId: 20, activeFrom: '2026-06-01T10:05:00', activeTo: null, endedBy: null, rowVersion: 0 };

export const FIXTURE_MODULE_STATES: ClassModuleState[] = [
  { id: 500, classCurriculumAssignmentId: 50, moduleId: 201, status: 'COMPLETED', rowVersion: 2, releasedAt: '2026-06-04T09:00:00', releasedBy: 100, completedAt: '2026-06-10T09:00:00', completedBy: 100, withdrawnAt: null, withdrawnBy: null, withdrawReason: null, relockedAt: null, relockedBy: null },
  { id: 501, classCurriculumAssignmentId: 50, moduleId: 202, status: 'RELEASED', rowVersion: 1, releasedAt: '2026-06-11T09:00:00', releasedBy: 100, completedAt: null, completedBy: null, withdrawnAt: null, withdrawnBy: null, withdrawReason: null, relockedAt: null, relockedBy: null },
  { id: 502, classCurriculumAssignmentId: 50, moduleId: 203, status: 'LOCKED', rowVersion: 0, releasedAt: null, releasedBy: null, completedAt: null, completedBy: null, withdrawnAt: null, withdrawnBy: null, withdrawReason: null, relockedAt: null, relockedBy: null }
];

export const FIXTURE_CLASS = {
  id: 1, batchName: 'Saturday Beginners', schedule: 'Sat 10:00 AM', description: 'Beginner batch, Bharatanatyam & Kuchipudi.',
  danceStyleId: 1, ageGroupId: null, feeTierId: null, danceStyleName: 'Bharatanatyam', ageGroupLabel: null, feeTierLabel: null
};
