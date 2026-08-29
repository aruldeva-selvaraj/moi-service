import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';

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
    data: { breadcrumb: 'Events' },
    loadComponent: () => import('./features/weddings/wedding-list/wedding-list.component').then(m => m.WeddingListComponent),
    title: 'Events - Moify'
  },
  {
    path: 'events/new',
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { breadcrumb: 'New Event' },
    loadComponent: () => import('./features/weddings/wedding-form/wedding-form.component').then(m => m.WeddingFormComponent),
    title: 'New Event - Moify'
  },
  {
    path: 'events/:id',
    canActivate: [authGuard],
    data: { breadcrumb: 'Event Detail' },
    loadComponent: () => import('./features/weddings/wedding-detail/wedding-detail.component').then(m => m.WeddingDetailComponent),
    title: 'Event Details - Moify'
  },
  {
    path: 'events/:id/edit',
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { breadcrumb: 'Edit Event' },
    loadComponent: () => import('./features/weddings/wedding-form/wedding-form.component').then(m => m.WeddingFormComponent),
    title: 'Edit Event - Moify'
  },
  {
    path: 'moi',
    canActivate: [authGuard],
    data: { breadcrumb: 'Moi Entries' },
    loadComponent: () => import('./features/moi/moi-list/moi-list.component').then(m => m.MoiListComponent),
    title: 'All Moi Entries - Moify'
  },
  {
    path: 'reports',
    canActivate: [authGuard],
    data: { breadcrumb: 'Reports' },
    loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
    title: 'Reports - Moify'
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    data: { breadcrumb: 'Profile' },
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    title: 'My Profile - Moify'
  },
  {
    path: 'users',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/user-management/user-management.component').then(m => m.UserManagementComponent),
    title: 'Users - Moify'
  },
  {
    path: 'users/create',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/auth/signup/signup.component').then(m => m.SignupComponent),
    title: 'Create User - Moify'
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: '404 - Moify'
  }
];
