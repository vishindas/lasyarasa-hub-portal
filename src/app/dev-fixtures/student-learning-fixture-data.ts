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
      { lessonId: 501, title: 'Tattadavu — video walkthrough', contentType: 'VIDEO', lessonOrder: 1, videoAvailability: 'AVAILABLE' },
      { lessonId: 502, title: 'Tattadavu — this video is currently unavailable', contentType: 'VIDEO', lessonOrder: 2, videoAvailability: 'UNAVAILABLE' },
      { lessonId: 503, title: 'Counting and rhythm notes', contentType: 'TEXT', lessonOrder: 3 },
      { lessonId: 504, title: 'Printable practice sheet', contentType: 'PDF_LINK', lessonOrder: 4 },
      { lessonId: 505, title: 'Reference recording (external)', contentType: 'EXTERNAL_LINK', lessonOrder: 5 }
    ]
  },
  402: {
    moduleId: 402,
    title: 'Namaskaram',
    moduleOrder: 2,
    status: 'COMPLETED',
    objectives: 'The opening invocation sequence.',
    lessons: [
      { lessonId: 510, title: 'Namaskaram sequence', contentType: 'VIDEO', lessonOrder: 1, videoAvailability: 'AVAILABLE' }
    ]
  },
  411: {
    moduleId: 411,
    title: 'Jatis and Rhythm',
    moduleOrder: 1,
    status: 'RELEASED',
    objectives: 'Rhythmic footwork patterns.',
    lessons: [
      { lessonId: 520, title: 'Jati 1', contentType: 'VIDEO', lessonOrder: 1, videoAvailability: 'AVAILABLE' },
      { lessonId: 521, title: 'Jati 2', contentType: 'VIDEO', lessonOrder: 2, videoAvailability: 'AVAILABLE' }
    ]
  }
};

export const FIXTURE_LESSON_DETAIL: Record<number, StudentLessonDetailDTO> = {
  501: {
    lessonId: 501, moduleId: 401, title: 'Tattadavu — video walkthrough', contentType: 'VIDEO', lessonOrder: 1,
    videoAvailability: 'AVAILABLE', videoId: 'dQw4w9WgXcQ',
    practiceNotes: 'Practice slowly with a metronome before increasing tempo.',
    nextLessonId: 502
  },
  502: {
    lessonId: 502, moduleId: 401, title: 'Tattadavu — this video is currently unavailable', contentType: 'VIDEO', lessonOrder: 2,
    videoAvailability: 'UNAVAILABLE',
    previousLessonId: 501, nextLessonId: 503
  },
  503: {
    lessonId: 503, moduleId: 401, title: 'Counting and rhythm notes', contentType: 'TEXT', lessonOrder: 3,
    textContent: 'Tattadavu is counted in cycles of eight. Begin with the right foot, keeping the torso still and the arms in a relaxed second position.',
    previousLessonId: 502, nextLessonId: 504
  },
  504: {
    lessonId: 504, moduleId: 401, title: 'Printable practice sheet', contentType: 'PDF_LINK', lessonOrder: 4,
    externalUrl: 'https://example.test/practice-sheet.pdf', externalLinkLabel: 'Download practice sheet (PDF)',
    previousLessonId: 503, nextLessonId: 505
  },
  505: {
    lessonId: 505, moduleId: 401, title: 'Reference recording (external)', contentType: 'EXTERNAL_LINK', lessonOrder: 5,
    externalUrl: 'https://example.test/reference-recording', externalLinkLabel: 'Listen to the reference recording',
    previousLessonId: 504
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
