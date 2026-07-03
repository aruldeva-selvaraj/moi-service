import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    title: 'Login - Moify'
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard - Moify'
  },
  {
    path: 'events',
    canActivate: [authGuard],
    loadComponent: () => import('./features/weddings/wedding-list/wedding-list.component').then(m => m.WeddingListComponent),
    title: 'Events - Moify'
  },
  {
    path: 'events/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/weddings/wedding-form/wedding-form.component').then(m => m.WeddingFormComponent),
    title: 'New Event - Moify'
  },
  {
    path: 'events/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/weddings/wedding-detail/wedding-detail.component').then(m => m.WeddingDetailComponent),
    title: 'Event Details - Moify'
  },
  {
    path: 'events/:id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./features/weddings/wedding-form/wedding-form.component').then(m => m.WeddingFormComponent),
    title: 'Edit Event - Moify'
  },
  {
    path: 'moi',
    canActivate: [authGuard],
    loadComponent: () => import('./features/moi/moi-list/moi-list.component').then(m => m.MoiListComponent),
    title: 'All Moi Entries - Moify'
  },
  {
    path: 'reports',
    canActivate: [authGuard],
    loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
    title: 'Reports - Moify'
  },
  {
    path: 'users/create',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/auth/signup/signup.component').then(m => m.SignupComponent),
    title: 'Create User - Moify'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
