import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'providers',
    loadComponent: () => import('./providers/admin-providers').then(m => m.AdminProvidersComponent)
  },
  { path: '', redirectTo: 'providers', pathMatch: 'full' }
];
