import { Routes } from '@angular/router';

export const CURRICULUM_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./library/curriculum-library').then(m => m.CurriculumLibraryComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./builder/curriculum-builder').then(m => m.CurriculumBuilderComponent)
  },
  {
    path: ':curriculumId/versions/:versionId',
    loadComponent: () => import('./builder/curriculum-builder').then(m => m.CurriculumBuilderComponent)
  },
  {
    path: ':curriculumId/versions/:versionId/preview',
    loadComponent: () => import('./preview/curriculum-preview').then(m => m.CurriculumPreviewComponent)
  },
  {
    path: ':curriculumId/versions/:versionId/modules/:moduleId',
    loadComponent: () => import('./module-detail/module-detail-panel').then(m => m.ModuleDetailPanelComponent)
  },
  {
    path: ':curriculumId/versions/:versionId/modules/:moduleId/lessons',
    loadComponent: () => import('./lessons/lesson-list').then(m => m.LessonListComponent)
  },
  {
    // Issue #54: reuses LessonListComponent (Figure 1) in a read-only,
    // published-lessons-only mode reached from Curriculum Preview -- the
    // same component/data source as the teacher's normal lesson list,
    // never a parallel preview model. `previewMode: true` in route data is
    // the only thing that distinguishes this from the ordinary editing
    // route above; see LessonListComponent's own previewMode() handling.
    path: ':curriculumId/versions/:versionId/modules/:moduleId/lessons/preview',
    loadComponent: () => import('./lessons/lesson-list').then(m => m.LessonListComponent),
    data: { previewMode: true }
  },
  {
    path: ':curriculumId/versions/:versionId/modules/:moduleId/lessons/new',
    loadComponent: () => import('./lessons/lesson-editor').then(m => m.LessonEditorComponent)
  },
  {
    path: ':curriculumId/versions/:versionId/modules/:moduleId/lessons/:lessonId/edit',
    loadComponent: () => import('./lessons/lesson-editor').then(m => m.LessonEditorComponent)
  },
  {
    path: ':curriculumId/versions/:versionId/modules/:moduleId/lessons/:lessonId/preview',
    loadComponent: () => import('./lessons/lesson-preview').then(m => m.LessonPreviewComponent)
  },
  {
    // Issue #56: read-only, answer-key-free preview of a module's published
    // assignment template, reached only from lessons/preview's "Related
    // Assignments" section. A brand-new component -- never
    // TemplatePreviewComponent, never features/assignments/data-access/**.
    path: ':curriculumId/versions/:versionId/modules/:moduleId/assignments/:templateId/preview',
    loadComponent: () => import('./assignments/curriculum-assignment-preview').then(m => m.CurriculumAssignmentPreviewComponent)
  }
];
