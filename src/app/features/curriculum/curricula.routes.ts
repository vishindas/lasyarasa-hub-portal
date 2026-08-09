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
  }
];
