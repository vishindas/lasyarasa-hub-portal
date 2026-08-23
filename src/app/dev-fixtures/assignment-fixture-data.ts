// TEST/DEV-ONLY fixture data for the Slice 15 `verify` build scenarios.
import { AssignmentTemplateDTO, AssignmentTemplateSummaryDTO, AssignmentEligibleClassDTO, AssignmentInstanceSummaryDTO, AssignmentInstanceDetailDTO, AssignmentInstanceStudentRollupDTO, AssignmentLateEnrolleeCandidateDTO, SubmissionQueueEntryDTO, AssignmentCapabilityDTO } from '../core/models/assignment.model';
import { AssignmentTemplateVersionDTO, StaffSubmissionDetailDTO } from '../features/assignments/data-access/assignment-staff.model';

export const FIXTURE_CAPABILITY_ENABLED: AssignmentCapabilityDTO = { globalEnabled: true, providerEnabled: true, effectiveEnabled: true };
export const FIXTURE_CAPABILITY_DISABLED: AssignmentCapabilityDTO = { globalEnabled: false, providerEnabled: false, effectiveEnabled: false };

export const FIXTURE_TEMPLATE: AssignmentTemplateDTO = {
  id: 1, moduleId: 10, curriculumVersionId: 100, displayStatus: 'DRAFT',
  publishedVersionId: null, draftVersionId: 1000, rowVersion: 0,
  createdAt: '2026-08-01T00:00:00', createdBy: 1, archivedAt: null, archivedBy: null
};

/** Published-only (no open draft) -- exercises T3 auto-draft-on-edit and T9 Assign to Class in the verify build. */
export const FIXTURE_TEMPLATE_PUBLISHED_ONLY: AssignmentTemplateDTO = {
  id: 2, moduleId: 10, curriculumVersionId: 100, displayStatus: 'PUBLISHED',
  publishedVersionId: 1001, draftVersionId: null, rowVersion: 0,
  createdAt: '2026-08-01T00:00:00', createdBy: 1, archivedAt: null, archivedBy: null
};

export const FIXTURE_VERSION_PUBLISHED: AssignmentTemplateVersionDTO = {
  id: 1001, templateId: 2, moduleId: 10, curriculumVersionId: 100, versionNumber: 1,
  status: 'PUBLISHED', title: 'Unit 2 Quiz (published)', clonedFromVersionId: null, rowVersion: 0,
  createdAt: '2026-08-01T00:00:00', createdBy: 1, publishedAt: '2026-08-05T00:00:00', publishedBy: 1, archivedAt: null, archivedBy: null,
  questions: [
    { id: 10, templateVersionId: 1001, questionType: 'SHORT_TEXT', prompt: 'Name a basic adavu.', questionOrder: 1, maxSelections: null, rowVersion: 0, options: [] },
    {
      id: 20, templateVersionId: 1001, questionType: 'SINGLE_CHOICE', prompt: 'Which style is this from?', questionOrder: 2, maxSelections: null, rowVersion: 0,
      options: [
        { id: 30, questionId: 20, optionLabel: 'Bharatanatyam', optionOrder: 1, isCorrect: true, rowVersion: 0 },
        { id: 31, questionId: 20, optionLabel: 'Kuchipudi', optionOrder: 2, isCorrect: false, rowVersion: 0 }
      ]
    }
  ]
};

/**
 * The auto-created draft ensureDraftVersion() clones this into -- a fresh
 * version id/rowVersion, questions AND options cloned with brand-new ids
 * (11/21 for the two questions, 41/42 for the choice question's options),
 * matching startDraft()'s real clone semantics exactly.
 */
export const FIXTURE_VERSION_AUTO_DRAFT: AssignmentTemplateVersionDTO = {
  ...FIXTURE_VERSION_PUBLISHED,
  id: 1002, status: 'DRAFT', clonedFromVersionId: 1001, publishedAt: null, publishedBy: null,
  questions: [
    { ...FIXTURE_VERSION_PUBLISHED.questions[0], id: 11, templateVersionId: 1002 },
    {
      ...FIXTURE_VERSION_PUBLISHED.questions[1], id: 21, templateVersionId: 1002,
      options: [
        { ...FIXTURE_VERSION_PUBLISHED.questions[1].options[0], id: 41, questionId: 21 },
        { ...FIXTURE_VERSION_PUBLISHED.questions[1].options[1], id: 42, questionId: 21 }
      ]
    }
  ]
};

export const FIXTURE_TEMPLATE_SUMMARIES: AssignmentTemplateSummaryDTO[] = [
  {
    id: 1, moduleId: 10, moduleTitle: 'Bharatanatyam Basics', curriculumVersionId: 100, curriculumTitle: 'Vidya Rasa Level 1',
    displayStatus: 'DRAFT', draftTitle: 'Unit 1 Quiz', publishedTitle: null, rowVersion: 0,
    createdAt: '2026-08-01T00:00:00', createdBy: 1, archivedAt: null, archivedBy: null
  },
  {
    id: 2, moduleId: 10, moduleTitle: 'Bharatanatyam Basics', curriculumVersionId: 100, curriculumTitle: 'Vidya Rasa Level 1',
    displayStatus: 'PUBLISHED', draftTitle: null, publishedTitle: 'Unit 2 Quiz (published)', rowVersion: 0,
    createdAt: '2026-08-01T00:00:00', createdBy: 1, archivedAt: null, archivedBy: null
  }
];

export const FIXTURE_ELIGIBLE_CLASSES: AssignmentEligibleClassDTO[] = [
  { classId: 1, className: 'Tuesday Beginners' },
  { classId: 2, className: 'Saturday Advanced' }
];

export const FIXTURE_VERSION: AssignmentTemplateVersionDTO = {
  id: 1000, templateId: 1, moduleId: 10, curriculumVersionId: 100, versionNumber: 1,
  status: 'DRAFT', title: 'Unit 1 Quiz', clonedFromVersionId: null, rowVersion: 0,
  createdAt: '2026-08-01T00:00:00', createdBy: 1, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null,
  questions: [
    {
      id: 1, templateVersionId: 1000, questionType: 'SINGLE_CHOICE', prompt: 'What is the Sanskrit term for hand gesture?',
      questionOrder: 1, maxSelections: null, rowVersion: 0,
      options: [
        { id: 1, questionId: 1, optionLabel: 'Mudra', optionOrder: 1, isCorrect: true, rowVersion: 0 },
        { id: 2, questionId: 1, optionLabel: 'Adavu', optionOrder: 2, isCorrect: false, rowVersion: 0 }
      ]
    }
  ]
};

export const FIXTURE_INSTANCE_SUMMARIES: AssignmentInstanceSummaryDTO[] = [
  {
    id: 5000, classId: 1, className: 'Tuesday Beginners', templateVersionId: 1000, templateTitle: 'Unit 1 Quiz',
    moduleId: 10, moduleTitle: 'Bharatanatyam Basics', dueAt: '2026-09-01T00:00:00', status: 'ACTIVE', rowVersion: 0,
    createdAt: '2026-08-10T00:00:00', createdBy: 1, closedAt: null, withdrawnAt: null, withdrawnBy: null
  }
];

export const FIXTURE_INSTANCE_DETAIL: AssignmentInstanceDetailDTO = {
  id: 5000, templateVersionId: 1000, templateTitle: 'Unit 1 Quiz', moduleId: 10, moduleTitle: 'Bharatanatyam Basics',
  classId: 1, className: 'Tuesday Beginners', dueAt: '2026-09-01T00:00:00', status: 'ACTIVE', idempotencyKey: 'fixture-key',
  rowVersion: 0, createdAt: '2026-08-10T00:00:00', createdBy: 1, closedAt: null, withdrawnAt: null, withdrawnBy: null
};

export const FIXTURE_STUDENT_ROLLUP: AssignmentInstanceStudentRollupDTO[] = [
  { studentId: 1, firstName: 'Asha', lastName: 'Rao', participationState: 'ISSUED', studentAssignmentStatus: 'SUBMITTED', studentAssignmentId: 9000, attemptNumber: 1, currentlyActiveEnrollment: true },
  { studentId: 2, firstName: 'Meera', lastName: 'Iyer', participationState: 'UNDECIDED', studentAssignmentStatus: null, studentAssignmentId: null, attemptNumber: null, currentlyActiveEnrollment: true }
];

export const FIXTURE_LATE_ENROLLEES: AssignmentLateEnrolleeCandidateDTO[] = [
  { studentId: 2, firstName: 'Meera', lastName: 'Iyer', enrollmentStartDate: '2026-08-15' }
];

export const FIXTURE_QUEUE: SubmissionQueueEntryDTO[] = [
  {
    attemptId: 9001, studentAssignmentId: 9000, studentId: 1, attemptNumber: 1, submittedAt: '2026-08-20T10:00:00',
    firstName: 'Asha', lastName: 'Rao', classId: 1, className: 'Tuesday Beginners',
    templateVersionId: 1000, templateTitle: 'Unit 1 Quiz', moduleId: 10
  }
];

export const FIXTURE_SUBMISSION_DETAIL: StaffSubmissionDetailDTO = {
  studentAssignmentId: 9000, status: 'SUBMITTED', attemptNumber: 1, rowVersion: 0,
  studentId: 1, firstName: 'Asha', lastName: 'Rao', classId: 1, className: 'Tuesday Beginners',
  templateVersionId: 1000, templateTitle: 'Unit 1 Quiz', moduleId: 10, moduleTitle: 'Bharatanatyam Basics',
  currentAttemptId: 9001,
  questions: [
    {
      questionId: 1, questionType: 'SINGLE_CHOICE', prompt: 'What is the Sanskrit term for hand gesture?', questionOrder: 1, maxSelections: null,
      options: [
        { optionId: 1, optionLabel: 'Mudra', optionOrder: 1, isCorrect: true },
        { optionId: 2, optionLabel: 'Adavu', optionOrder: 2, isCorrect: false }
      ]
    }
  ],
  attemptHistory: [
    {
      attemptId: 9001, attemptNumber: 1, submittedAt: '2026-08-20T10:00:00',
      reviewDecision: null, reviewedAt: null, reviewedBy: null, feedback: null,
      responses: [{ questionId: 1, textResponse: null, selectedOptionIds: [1], outcome: 'ACCEPTED' }]
    }
  ]
};
