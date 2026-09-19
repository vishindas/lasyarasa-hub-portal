// TEST/DEV-ONLY. See dev-fixtures/README.md. Sample data deliberately
// mirrors the Slice 10 design doc's own example students (Part X.2/
// Correction Report §1): Arjun Rao has two active classes to exercise the
// Class Picker; Meera Rao has exactly one (auto-selected).

import {
  ClassInfoDTO,
  LearningPathDTO,
  ModuleDetailDTO,
  StudentAccessDTO,
  StudentClassDTO,
  StudentContentBlock,
  StudentLearningHomeDTO,
  StudentLessonDetailDTO
} from '../core/models/student-learning.model';

export const FIXTURE_STUDENTS: StudentAccessDTO[] = [
  { studentId: 201, providerId: 1, studentDisplayName: 'Arjun Rao', providerDisplayName: 'LasyaRasa Dance Academy', accessType: 'GUARDIAN' },
  { studentId: 202, providerId: 1, studentDisplayName: 'Meera Rao', providerDisplayName: 'LasyaRasa Dance Academy', accessType: 'GUARDIAN' },
  { studentId: 203, providerId: 1, studentDisplayName: 'Zero Classes Student', providerDisplayName: 'LasyaRasa Dance Academy', accessType: 'SELF' }
];

export const FIXTURE_CLASSES: Record<number, StudentClassDTO[]> = {
  201: [
    { classId: 301, className: 'Saturday Beginners', schedule: 'Sat 10:00 AM' },
    { classId: 302, className: 'Weekday Technique Intensive', schedule: 'Tue/Thu 5:00 PM' }
  ],
  202: [
    { classId: 303, className: 'Sunday Foundation', schedule: 'Sun 11:00 AM' }
  ],
  203: []
};

export const FIXTURE_HOME: Record<number, StudentLearningHomeDTO> = {
  301: {
    selectedClassId: 301,
    classSelectionRequired: false,
    learningPath: { curriculumTitle: 'Bharatanatyam Foundations', level: 'Beginner' },
    currentModule: { moduleId: 401, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED' }
  },
  302: {
    selectedClassId: 302,
    classSelectionRequired: false,
    learningPath: { curriculumTitle: 'Bharatanatyam Technique', level: 'Intermediate' },
    currentModule: { moduleId: 411, title: 'Jatis and Rhythm', moduleOrder: 2, status: 'RELEASED' }
  },
  303: {
    selectedClassId: 303,
    classSelectionRequired: false
    // no learningPath/currentModule -- no curriculum assigned yet to this class
  }
};

export const FIXTURE_LEARNING_PATH: Record<number, LearningPathDTO> = {
  301: {
    curriculumTitle: 'Bharatanatyam Foundations',
    level: 'Beginner',
    modules: [
      { moduleId: 401, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED', objectives: 'Learn the foundational Adavu sequences.', publishedLessonCount: 3 },
      { moduleId: 402, title: 'Namaskaram', moduleOrder: 2, status: 'COMPLETED', objectives: 'The opening invocation sequence.', publishedLessonCount: 1 },
      { moduleId: 403, title: 'Padams', moduleOrder: 3, status: 'LOCKED' }
    ]
  },
  302: {
    curriculumTitle: 'Bharatanatyam Technique',
    level: 'Intermediate',
    modules: [
      { moduleId: 411, title: 'Jatis and Rhythm', moduleOrder: 1, status: 'RELEASED', objectives: 'Rhythmic footwork patterns.', publishedLessonCount: 2 },
      // Mirrors the design doc's own m6 "Advanced Adavus" WITHDRAWN example (correction 6) exactly.
      { moduleId: 412, title: 'Advanced Adavus', moduleOrder: 2, status: 'WITHDRAWN' },
      { moduleId: 413, title: 'Varnam Introduction', moduleOrder: 3, status: 'LOCKED' }
    ]
  }
};

export const FIXTURE_MODULE_DETAIL: Record<number, ModuleDetailDTO> = {
  401: {
    moduleId: 401,
    title: 'Basic Adavus',
    moduleOrder: 1,
    status: 'RELEASED',
    objectives: 'Learn the foundational Adavu sequences.',
    lessons: [
      { lessonId: 501, title: 'Tattadavu — video walkthrough', lessonOrder: 1 },
      { lessonId: 502, title: 'Tattadavu — this video is currently unavailable', lessonOrder: 2 },
      { lessonId: 503, title: 'Counting and rhythm notes', lessonOrder: 3 },
      { lessonId: 504, title: 'Printable practice sheet', lessonOrder: 4 },
      { lessonId: 505, title: 'Reference recording (external)', lessonOrder: 5 },
      // MC-4: dedicated fixture for the new "content isn't available right
      // now" state -- every block on this lesson is malformed/missing, same
      // as UX-7C's 421/422 module-level precedent (a dedicated fixture per
      // new visual state, reachable by direct URL only).
      { lessonId: 506, title: 'Content not yet available', lessonOrder: 6 }
    ]
  },
  402: {
    moduleId: 402,
    title: 'Namaskaram',
    moduleOrder: 2,
    status: 'COMPLETED',
    objectives: 'The opening invocation sequence.',
    lessons: [
      { lessonId: 510, title: 'Namaskaram sequence', lessonOrder: 1 }
    ]
  },
  411: {
    moduleId: 411,
    title: 'Jatis and Rhythm',
    moduleOrder: 1,
    status: 'RELEASED',
    objectives: 'Rhythmic footwork patterns.',
    lessons: [
      { lessonId: 520, title: 'Jati 1', lessonOrder: 1 },
      { lessonId: 521, title: 'Jati 2', lessonOrder: 2 }
    ]
  },
  // UX-7C: reachable only by direct URL (not part of any FIXTURE_LEARNING_PATH
  // list) -- exists purely so Module Detail's "assignments exist, no lessons
  // published" combination has a real fixture to visit. See
  // FIXTURE_SA_7_SUMMARY (moduleId 421) in student-assignment-fixture-data.ts.
  421: {
    moduleId: 421,
    title: 'No-Lesson Module',
    moduleOrder: 1,
    status: 'RELEASED',
    objectives: 'Assignments-only module, for UX-7C visual review.',
    lessons: []
  },
  // UX-7C: neither lessons nor related assignments -- no fixture assignment
  // points at moduleId 422. Direct-URL only, same as 421.
  422: {
    moduleId: 422,
    title: 'Empty Module',
    moduleOrder: 2,
    status: 'RELEASED',
    lessons: []
  }
};

function textBlock(id: number, textContent: string): StudentContentBlock {
  return { id, contentType: 'TEXT', textContent };
}
function videoBlock(id: number, opts: { videoId?: string; videoAvailability?: 'AVAILABLE' | 'UNAVAILABLE' }): StudentContentBlock {
  return { id, contentType: 'VIDEO', ...opts };
}
function linkBlock(id: number, type: 'PDF_LINK' | 'EXTERNAL_LINK', externalUrl: string, externalLinkLabel: string): StudentContentBlock {
  return { id, contentType: type, externalUrl, externalLinkLabel };
}

/** MC-4: block-native. Each lesson is now zero-or-more ordered blocks rather than one flat content shape. */
export const FIXTURE_LESSON_DETAIL: Record<number, StudentLessonDetailDTO> = {
  501: {
    lessonId: 501, moduleId: 401, title: 'Tattadavu — video walkthrough', lessonOrder: 1,
    blocks: [videoBlock(9501, { videoId: 'dQw4w9WgXcQ', videoAvailability: 'AVAILABLE' })],
    practiceNotes: 'Practice slowly with a metronome before increasing tempo.',
    nextLessonId: 502
  },
  502: {
    lessonId: 502, moduleId: 401, title: 'Tattadavu — this video is currently unavailable', lessonOrder: 2,
    blocks: [videoBlock(9502, { videoAvailability: 'UNAVAILABLE' })],
    previousLessonId: 501, nextLessonId: 503
  },
  503: {
    lessonId: 503, moduleId: 401, title: 'Counting and rhythm notes', lessonOrder: 3,
    blocks: [textBlock(9503, 'Tattadavu is counted in cycles of eight. Begin with the right foot, keeping the torso still and the arms in a relaxed second position.')],
    previousLessonId: 502, nextLessonId: 504
  },
  504: {
    lessonId: 504, moduleId: 401, title: 'Printable practice sheet', lessonOrder: 4,
    blocks: [linkBlock(9504, 'PDF_LINK', 'https://example.test/practice-sheet.pdf', 'Download practice sheet (PDF)')],
    previousLessonId: 503, nextLessonId: 505
  },
  505: {
    lessonId: 505, moduleId: 401, title: 'Reference recording (external)', lessonOrder: 5,
    blocks: [linkBlock(9505, 'EXTERNAL_LINK', 'https://example.test/reference-recording', 'Listen to the reference recording')],
    previousLessonId: 504, nextLessonId: 506
  },
  // MC-4: dedicated fixture for the approved "This lesson's content isn't
  // available right now." copy -- an authorized PUBLISHED lesson with no
  // usable blocks. Title/practice notes/previous-next nav all stay
  // available; only the content area shows the message (never a 404).
  506: {
    lessonId: 506, moduleId: 401, title: 'Content not yet available', lessonOrder: 6,
    blocks: [],
    practiceNotes: 'This fixture demonstrates the approved empty-content state.',
    previousLessonId: 505
  }
};

export const FIXTURE_CLASS_INFO: Record<number, ClassInfoDTO> = {
  301: {
    className: 'Saturday Beginners', schedule: 'Sat 10:00 AM', curriculumTitle: 'Bharatanatyam Foundations', level: 'Beginner',
    providerDisplayName: 'LasyaRasa Dance Academy', danceStyleName: 'Bharatanatyam', ageGroupName: 'Ages 8-12'
  },
  // Dance style present, age group absent -- exercises one-set-one-missing.
  302: {
    className: 'Weekday Technique Intensive', schedule: 'Tue/Thu 5:00 PM', curriculumTitle: 'Bharatanatyam Technique', level: 'Intermediate',
    providerDisplayName: 'LasyaRasa Dance Academy', danceStyleName: 'Bharatanatyam'
  },
  // Neither set -- continues to exercise the missing-value state alongside the existing missing-curriculum/partial-error case.
  303: { className: 'Sunday Foundation', schedule: 'Sun 11:00 AM', providerDisplayName: 'LasyaRasa Dance Academy' }
};
