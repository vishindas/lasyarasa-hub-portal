import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: 'dance-styles',
    loadComponent: () => import('./dance-styles/dance-style-list').then(m => m.DanceStyleListComponent)
  },
  {
    path: 'fee-tiers',
    loadComponent: () => import('./fee-tiers/fee-tier-list').then(m => m.FeeTierListComponent)
  },
  {
    path: 'age-groups',
    loadComponent: () => import('./age-groups/age-group-list').then(m => m.AgeGroupListComponent)
  },
  { path: '', redirectTo: 'dance-styles', pathMatch: 'full' }
];
