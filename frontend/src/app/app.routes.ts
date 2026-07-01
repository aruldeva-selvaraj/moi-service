import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard - Moi Manager'
  },
  {
    path: 'events',
    loadComponent: () => import('./features/weddings/wedding-list/wedding-list.component').then(m => m.WeddingListComponent),
    title: 'Events - Moi Manager'
  },
  {
    path: 'events/new',
    loadComponent: () => import('./features/weddings/wedding-form/wedding-form.component').then(m => m.WeddingFormComponent),
    title: 'New Event - Moi Manager'
  },
  {
    path: 'events/:id',
    loadComponent: () => import('./features/weddings/wedding-detail/wedding-detail.component').then(m => m.WeddingDetailComponent),
    title: 'Event Details - Moi Manager'
  },
  {
    path: 'events/:id/edit',
    loadComponent: () => import('./features/weddings/wedding-form/wedding-form.component').then(m => m.WeddingFormComponent),
    title: 'Edit Event - Moi Manager'
  },
  {
    path: 'moi',
    loadComponent: () => import('./features/moi/moi-list/moi-list.component').then(m => m.MoiListComponent),
    title: 'All Moi Entries - Moi Manager'
  },
  {
    path: 'reports',
    loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
    title: 'Reports - Moi Manager'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
