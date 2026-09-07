// TEST/DEV-ONLY. Answers every /account/students/*/learning/assignments/**
// request for the verify build's manual browser-verification pass.
// Attached to student 201 (Arjun Rao), the same sample student already
// used for the class-picker/learning-path fixtures, across classes 301/302.
//
// Mutable in-memory state (drafts, attempts) mirrors the real backend's
// own behavior closely enough for manual verification: PUT .../draft
// mutates draftsByAssignment; POST .../submit|resubmit mutates
// attemptsByAssignment and flips the summary/detail status, exactly the
// state machine the real StudentAssignmentSubmissionService enforces.

import {
  AttemptDTO, DraftResponseDTO, StudentAssignmentDetailDTO, StudentAssignmentSummaryDTO
} from '../features/student-assignments/data-access/student-assignment.model';

// ---- a1: DRAFT, never started -- full 4-question-type answering flow ----
// UX-7B: moduleId/moduleTitle present here (and on a2 below) so the new
// module-context UI is genuinely visually reachable via this dev-only
// fixture; other fixtures below deliberately omit it to also exercise the
// graceful-absence path live, not just in unit tests.
// UX-7C: moduleId 401/moduleTitle 'Basic Adavus' -- realigned from the
// original 40/'Foundations' (an id with no matching FIXTURE_MODULE_DETAIL
// entry) to a REAL module-detail fixture, so this assignment is also
// visually reachable from Module Detail's own new Related Assignments
// section, not only from the Assignments list/detail screens.
export const FIXTURE_SA_1_SUMMARY: StudentAssignmentSummaryDTO = {
  id: 5001, instanceId: 6001, title: 'Posture and Terminology Review',
  dueAt: '2026-09-20T23:59:00', status: 'DRAFT', attemptNumber: 0,
  moduleId: 401, moduleTitle: 'Basic Adavus'
};
export const FIXTURE_SA_1_DETAIL: StudentAssignmentDetailDTO = {
  id: 5001, instanceId: 6001, title: 'Posture and Terminology Review',
  dueAt: '2026-09-20T23:59:00', status: 'DRAFT', attemptNumber: 0, rowVersion: 0, instanceStatus: 'ACTIVE',
  moduleId: 401, moduleTitle: 'Basic Adavus',
  questions: [
    { id: 7001, questionType: 'SHORT_TEXT', prompt: 'Name a basic adavu.', questionOrder: 1, maxSelections: null, options: [], editable: true },
    {
      id: 7002, questionType: 'SINGLE_CHOICE', prompt: 'Which style is this from?', questionOrder: 2, maxSelections: null, editable: true,
      options: [{ id: 8001, optionLabel: 'Bharatanatyam', optionOrder: 1 }, { id: 8002, optionLabel: 'Kuchipudi', optionOrder: 2 }]
    },
    {
      id: 7003, questionType: 'MULTIPLE_CHOICE', prompt: 'Which of these are hand gestures (mudras)? Select up to 2.', questionOrder: 3, maxSelections: 2, editable: true,
      options: [
        { id: 8003, optionLabel: 'Pataka', optionOrder: 1 }, { id: 8004, optionLabel: 'Tripataka', optionOrder: 2 }, { id: 8005, optionLabel: 'Adavu', optionOrder: 3 }
      ]
    },
    { id: 7004, questionType: 'LONG_TEXT', prompt: 'Describe your practice routine this week.', questionOrder: 4, maxSelections: null, options: [], editable: true }
  ]
};

// ---- a2: DRAFT, overdue ----
// UX-7C: moduleId realigned 41 -> 411 ('Jatis and Rhythm'), a second real
// module-detail fixture with fewer lessons (2) than 401's (5) -- exercises
// a different lessons+assignments combination on Module Detail.
export const FIXTURE_SA_2_SUMMARY: StudentAssignmentSummaryDTO = {
  id: 5002, instanceId: 6002, title: 'Basic Terminology Quiz', dueAt: '2026-08-01T23:59:00', status: 'DRAFT', attemptNumber: 0,
  moduleId: 411, moduleTitle: 'Jatis and Rhythm'
};
export const FIXTURE_SA_2_DETAIL: StudentAssignmentDetailDTO = {
  id: 5002, instanceId: 6002, title: 'Basic Terminology Quiz', dueAt: '2026-08-01T23:59:00', status: 'DRAFT', attemptNumber: 0, rowVersion: 0, instanceStatus: 'ACTIVE',
  moduleId: 411, moduleTitle: 'Jatis and Rhythm',
  questions: [{ id: 7010, questionType: 'SHORT_TEXT', prompt: 'What does "adavu" mean?', questionOrder: 1, maxSelections: null, options: [], editable: true }]
};

// ---- a3: SUBMITTED, attempt 1 awaiting review ----
export const FIXTURE_SA_3_SUMMARY: StudentAssignmentSummaryDTO = {
  id: 5003, instanceId: 6003, title: 'Rhythm Worksheet', dueAt: '2026-08-10T23:59:00', status: 'SUBMITTED', attemptNumber: 1
};
export const FIXTURE_SA_3_DETAIL: StudentAssignmentDetailDTO = {
  id: 5003, instanceId: 6003, title: 'Rhythm Worksheet', dueAt: '2026-08-10T23:59:00', status: 'SUBMITTED', attemptNumber: 1, rowVersion: 1, instanceStatus: 'ACTIVE',
  questions: [
    { id: 7020, questionType: 'SHORT_TEXT', prompt: 'Explain the significance of tala.', questionOrder: 1, maxSelections: null, options: [], editable: false },
    {
      id: 7021, questionType: 'SINGLE_CHOICE', prompt: 'Which adavu comes first in the traditional sequence?', questionOrder: 2, maxSelections: null, editable: false,
      options: [{ id: 8010, optionLabel: 'Tatta Adavu', optionOrder: 1 }, { id: 8011, optionLabel: 'Natta Adavu', optionOrder: 2 }]
    }
  ]
};
export const FIXTURE_SA_3_ATTEMPTS: AttemptDTO[] = [
  {
    attemptNumber: 1, submittedAt: '2026-08-05T10:00:00', reviewDecision: null, reviewedAt: null, reviewedBy: null, feedback: null,
    responses: [
      { questionId: 7020, outcome: null, textResponse: 'Tala keeps the rhythmic structure of the piece.', selectedOptionIds: [] },
      { questionId: 7021, outcome: 'AUTO_CORRECT', textResponse: null, selectedOptionIds: [8010] }
    ]
  }
];

// ---- a4: REVISION_REQUESTED -- Slice 14.2 seeded draft prefill scenario ----
export const FIXTURE_SA_4_SUMMARY: StudentAssignmentSummaryDTO = {
  id: 5004, instanceId: 6004, title: 'Mudra Definitions', dueAt: '2026-08-08T23:59:00', status: 'REVISION_REQUESTED', attemptNumber: 1
};
export const FIXTURE_SA_4_DETAIL: StudentAssignmentDetailDTO = {
  id: 5004, instanceId: 6004, title: 'Mudra Definitions', dueAt: '2026-08-08T23:59:00', status: 'REVISION_REQUESTED', attemptNumber: 1, rowVersion: 2, instanceStatus: 'ACTIVE',
  questions: [
    { id: 7030, questionType: 'SHORT_TEXT', prompt: 'Define "Pataka" mudra.', questionOrder: 1, maxSelections: null, options: [], editable: true },
    {
      id: 7031, questionType: 'SINGLE_CHOICE', prompt: 'Pataka mudra uses how many fingers extended?', questionOrder: 2, maxSelections: null, editable: false,
      options: [{ id: 8020, optionLabel: 'Four', optionOrder: 1 }, { id: 8021, optionLabel: 'Five', optionOrder: 2 }]
    }
  ]
};
export const FIXTURE_SA_4_ATTEMPTS: AttemptDTO[] = [
  {
    attemptNumber: 1, submittedAt: '2026-08-04T09:00:00', reviewDecision: 'REVISION_REQUESTED', reviewedAt: '2026-08-06T09:00:00', reviewedBy: 900,
    feedback: 'Please give a specific example of when this mudra is used.',
    responses: [
      { questionId: 7030, outcome: 'NEEDS_REVISION', textResponse: 'A flat-hand gesture.', selectedOptionIds: [] },
      { questionId: 7031, outcome: 'AUTO_CORRECT', textResponse: null, selectedOptionIds: [8021] }
    ]
  }
];
// Slice 14.2: requestRevision() atomically seeds this draft from the
// student's own just-graded answer -- fixture mirrors that real behavior.
export const FIXTURE_SA_4_DRAFTS: DraftResponseDTO[] = [
  { questionId: 7030, textResponse: 'A flat-hand gesture.', selectedOptionIds: [], rowVersion: 0 }
];

// ---- a5: VALIDATED ----
export const FIXTURE_SA_5_SUMMARY: StudentAssignmentSummaryDTO = {
  id: 5005, instanceId: 6005, title: 'Adavu Sequence Quiz', dueAt: '2026-08-02T23:59:00', status: 'VALIDATED', attemptNumber: 1
};
export const FIXTURE_SA_5_DETAIL: StudentAssignmentDetailDTO = {
  id: 5005, instanceId: 6005, title: 'Adavu Sequence Quiz', dueAt: '2026-08-02T23:59:00', status: 'VALIDATED', attemptNumber: 1, rowVersion: 2, instanceStatus: 'ACTIVE',
  questions: [
    {
      id: 7040, questionType: 'SINGLE_CHOICE', prompt: 'Which comes after Tatta Adavu?', questionOrder: 1, maxSelections: null, editable: false,
      options: [{ id: 8030, optionLabel: 'Natta Adavu', optionOrder: 1 }, { id: 8031, optionLabel: 'Kuditta Metu', optionOrder: 2 }]
    },
    { id: 7041, questionType: 'SHORT_TEXT', prompt: 'Name one benefit of adavu practice.', questionOrder: 2, maxSelections: null, options: [], editable: false }
  ]
};
export const FIXTURE_SA_5_ATTEMPTS: AttemptDTO[] = [
  {
    attemptNumber: 1, submittedAt: '2026-07-28T09:00:00', reviewDecision: 'VALIDATED', reviewedAt: '2026-07-29T09:00:00', reviewedBy: 900, feedback: null,
    responses: [
      { questionId: 7040, outcome: 'AUTO_CORRECT', textResponse: null, selectedOptionIds: [8030] },
      { questionId: 7041, outcome: 'ACCEPTED', textResponse: 'Improves balance and muscle memory.', selectedOptionIds: [] }
    ]
  }
];

// ---- a6: CLOSED, never started ----
// UX-7C: moduleId 402 ('Namaskaram', a real module-detail fixture with
// exactly 1 lesson) -- exercises a module with both lessons and a single
// CLOSED related assignment.
export const FIXTURE_SA_6_SUMMARY: StudentAssignmentSummaryDTO = {
  id: 5006, instanceId: 6006, title: 'Missed Assignment', dueAt: '2026-07-01T23:59:00', status: 'CLOSED', attemptNumber: 0,
  moduleId: 402, moduleTitle: 'Namaskaram'
};
export const FIXTURE_SA_6_DETAIL: StudentAssignmentDetailDTO = {
  id: 5006, instanceId: 6006, title: 'Missed Assignment', dueAt: '2026-07-01T23:59:00', status: 'CLOSED', attemptNumber: 0, rowVersion: 1, instanceStatus: 'ACTIVE',
  moduleId: 402, moduleTitle: 'Namaskaram',
  questions: [{ id: 7050, questionType: 'SHORT_TEXT', prompt: 'What is a jati?', questionOrder: 1, maxSelections: null, options: [], editable: false }]
};

// ---- a7: CLOSED, had draft answers, never submitted ----
// UX-7C: moduleId 421 -- a module-detail fixture deliberately given zero
// published lessons (see FIXTURE_MODULE_DETAIL[421] in
// student-learning-fixture-data.ts), so Module Detail's "assignments
// exist but no lessons" combination is genuinely reachable for visual
// review, not just asserted in a unit test.
export const FIXTURE_SA_7_SUMMARY: StudentAssignmentSummaryDTO = {
  id: 5007, instanceId: 6007, title: 'Late Submission Window', dueAt: '2026-07-15T23:59:00', status: 'CLOSED', attemptNumber: 0,
  moduleId: 421, moduleTitle: 'No-Lesson Module'
};
export const FIXTURE_SA_7_DETAIL: StudentAssignmentDetailDTO = {
  id: 5007, instanceId: 6007, title: 'Late Submission Window', dueAt: '2026-07-15T23:59:00', status: 'CLOSED', attemptNumber: 0, rowVersion: 1, instanceStatus: 'ACTIVE',
  moduleId: 421, moduleTitle: 'No-Lesson Module',
  questions: [{ id: 7060, questionType: 'SHORT_TEXT', prompt: 'What is a jathi?', questionOrder: 1, maxSelections: null, options: [], editable: false }]
};
export const FIXTURE_SA_7_DRAFTS: DraftResponseDTO[] = [
  { questionId: 7060, textResponse: 'A rhythmic syllable sequence.', selectedOptionIds: [], rowVersion: 0 }
];

// ---- a8: DRAFT, withdrawn instance -- S15 unavailable ----
export const FIXTURE_SA_8_SUMMARY: StudentAssignmentSummaryDTO = {
  id: 5008, instanceId: 6008, title: 'Withdrawn Module Assignment', dueAt: '2026-09-01T23:59:00', status: 'DRAFT', attemptNumber: 0
};
export const FIXTURE_SA_8_DETAIL: StudentAssignmentDetailDTO = {
  id: 5008, instanceId: 6008, title: 'Withdrawn Module Assignment', dueAt: '2026-09-01T23:59:00', status: 'DRAFT', attemptNumber: 0, rowVersion: 0, instanceStatus: 'WITHDRAWN',
  questions: [{ id: 7070, questionType: 'SHORT_TEXT', prompt: 'N/A', questionOrder: 1, maxSelections: null, options: [], editable: true }]
};

export const FIXTURE_STUDENT_ASSIGNMENTS_LIST: StudentAssignmentSummaryDTO[] = [
  FIXTURE_SA_1_SUMMARY, FIXTURE_SA_2_SUMMARY, FIXTURE_SA_3_SUMMARY, FIXTURE_SA_4_SUMMARY,
  FIXTURE_SA_5_SUMMARY, FIXTURE_SA_6_SUMMARY, FIXTURE_SA_7_SUMMARY, FIXTURE_SA_8_SUMMARY
];

export const FIXTURE_STUDENT_ASSIGNMENT_DETAILS: Record<number, StudentAssignmentDetailDTO> = {
  5001: FIXTURE_SA_1_DETAIL, 5002: FIXTURE_SA_2_DETAIL, 5003: FIXTURE_SA_3_DETAIL, 5004: FIXTURE_SA_4_DETAIL,
  5005: FIXTURE_SA_5_DETAIL, 5006: FIXTURE_SA_6_DETAIL, 5007: FIXTURE_SA_7_DETAIL, 5008: FIXTURE_SA_8_DETAIL
};

export const FIXTURE_STUDENT_ASSIGNMENT_ATTEMPTS: Record<number, AttemptDTO[]> = {
  5003: FIXTURE_SA_3_ATTEMPTS, 5004: FIXTURE_SA_4_ATTEMPTS, 5005: FIXTURE_SA_5_ATTEMPTS
};

export const FIXTURE_STUDENT_ASSIGNMENT_DRAFTS: Record<number, DraftResponseDTO[]> = {
  5004: [...FIXTURE_SA_4_DRAFTS], 5007: [...FIXTURE_SA_7_DRAFTS]
};

export const FIXTURE_ASSIGNMENT_STUDENT_ID = 201;
