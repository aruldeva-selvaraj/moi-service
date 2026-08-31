import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/index';
import { LoadingSpinnerComponent } from '../../shared/components/index';
import { AuthService } from '../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';

// ── Confirm Delete Dialog ─────────────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `<h3 mat-dialog-title>Delete User</h3><mat-dialog-content><p>Permanently delete this user account? This cannot be undone.</p></mat-dialog-content><mat-dialog-actions align="end"><button mat-button mat-dialog-close>Cancel</button><button mat-raised-button color="warn" [mat-dialog-close]="true">Delete</button></mat-dialog-actions>`,
})
class ConfirmDeleteUserDialog {}

// ── Confirm Role Change Dialog ────────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h3 mat-dialog-title>Confirm Role Change</h3>
    <mat-dialog-content>
      <p>
        Change <strong>{{ data.username }}</strong>'s role from
        <strong>{{ data.oldRole }}</strong> to <strong>{{ data.newRole }}</strong>?
      </p>
      <p style="color: var(--mat-sys-on-surface-variant, #666); font-size: 0.85rem; margin-top: 4px;">
        This affects what the user can access in the system.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="true">Confirm Change</button>
    </mat-dialog-actions>
  `,
})
class ConfirmRoleChangeDialog {
  data = inject(MAT_DIALOG_DATA) as { username: string; oldRole: string; newRole: string };
}

// ── Confirm Status Toggle Dialog ──────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h3 mat-dialog-title>{{ data.newStatus ? 'Activate' : 'Deactivate' }} User</h3>
    <mat-dialog-content>
      <p>
        {{ data.newStatus ? 'Activate' : 'Deactivate' }} account for
        <strong>{{ data.username }}</strong>?
      </p>
      <p style="color: var(--mat-sys-on-surface-variant, #666); font-size: 0.85rem; margin-top: 4px;">
        {{ data.newStatus
          ? 'The user will regain access to the application.'
          : 'The user will be unable to log in until reactivated.' }}
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button [color]="data.newStatus ? 'primary' : 'warn'" [mat-dialog-close]="true">
        {{ data.newStatus ? 'Activate' : 'Deactivate' }}
      </button>
    </mat-dialog-actions>
  `,
})
class ConfirmStatusToggleDialog {
  data = inject(MAT_DIALOG_DATA) as { username: string; newStatus: boolean };
}

// ── Main Interface ────────────────────────────────────────────────────────────
export interface AppUser {
  id: number;
  username: string;
  full_name: string;
  mobile_number?: string;
  role: string;
  is_active?: boolean;
  created_at: string;
  last_login_at?: string;
}

// ── User Management Component ─────────────────────────────────────────────────
@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    MatButtonModule, MatIconModule, MatTableModule, MatChipsModule,
    MatSnackBarModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule,
    RouterLink, PageHeaderComponent, LoadingSpinnerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit {
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  readonly auth = inject(AuthService);

  loading = signal(true);
  users = signal<AppUser[]>([]);
  search = signal('');
  displayedColumns = ['username', 'full_name', 'mobile_number', 'role', 'status', 'created_at', 'last_login_at', 'actions'];

  // M4: inline edit signals
  editingUserId = signal<number | null>(null);
  editName = signal('');
  editMobile = signal('');

  filteredUsers = computed(() => {
    const q = this.search().toLowerCase();
    return this.users().filter(u =>
      !q || u.username.toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.mobile_number || '').includes(q)
    );
  });

  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    this.loading.set(true);
    this.http.get<{ users: AppUser[] } | AppUser[]>(`${environment.apiUrl}/api/auth/users`)
      .pipe(map((r: any) => r.users ?? r))
      .subscribe({
        next: (data: AppUser[]) => { this.users.set(data); this.loading.set(false); },
        error: () => { this.loading.set(false); this.snackBar.open('Failed to load users', 'Close', { duration: 3000 }); },
      });
  }

  roleColor(role: string): string {
    return role === 'superadmin' ? 'warn' : role === 'admin' ? 'accent' : 'primary';
  }

  // ── Status Toggle — confirmation required ─────────────────────────────────
  toggleStatus(user: AppUser) {
    const newStatus = !user.is_active;
    this.dialog.open(ConfirmStatusToggleDialog, {
      data: { username: user.username, newStatus },
      width: '380px',
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.http.patch(`${environment.apiUrl}/api/auth/users/${user.id}/status`, { is_active: newStatus }).subscribe({
        next: () => {
          this.users.update(list => list.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
          this.snackBar.open(`User ${newStatus ? 'activated' : 'deactivated'}`, 'Close', { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to update user status', 'Close', { duration: 3000 }),
      });
    });
  }

  // ── Role Change — confirmation required ───────────────────────────────────
  updateRole(user: AppUser, newRole: string) {
    const oldRole = user.role;
    if (oldRole === newRole) return;

    // Optimistically update the signal so mat-select shows the selected value;
    // we revert below if the user cancels or the request fails.
    this.users.update(list => list.map(u => u.id === user.id ? { ...u, role: newRole } : u));

    this.dialog.open(ConfirmRoleChangeDialog, {
      data: { username: user.username, oldRole, newRole },
      width: '400px',
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) {
        // Revert the optimistic update
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, role: oldRole } : u));
        return;
      }
      this.http.patch(`${environment.apiUrl}/api/auth/users/${user.id}/role`, { role: newRole }).subscribe({
        next: () => this.snackBar.open('Role updated', 'Close', { duration: 2000 }),
        error: () => {
          // Revert on API error
          this.users.update(list => list.map(u => u.id === user.id ? { ...u, role: oldRole } : u));
          this.snackBar.open('Failed to update role', 'Close', { duration: 3000 });
        },
      });
    });
  }

  // M3: delete user
  deleteUser(id: number) {
    this.dialog.open(ConfirmDeleteUserDialog).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.http.delete(`${environment.apiUrl}/api/auth/users/${id}`).subscribe({
          next: () => {
            this.users.update(list => list.filter(u => u.id !== id));
            this.snackBar.open('User deleted', 'Close', { duration: 2000 });
          },
          error: () => this.snackBar.open('Failed to delete user', 'Close', { duration: 3000 }),
        });
      }
    });
  }

  // M4: inline edit methods
  startEdit(user: AppUser) {
    this.editingUserId.set(user.id);
    this.editName.set(user.full_name || '');
    this.editMobile.set(user.mobile_number || '');
  }

  saveEdit(id: number) {
    this.http.patch(`${environment.apiUrl}/api/auth/users/${id}`, {
      full_name: this.editName(),
      mobile_number: this.editMobile(),
    }).subscribe({
      next: () => {
        this.users.update(list => list.map(u =>
          u.id === id ? { ...u, full_name: this.editName(), mobile_number: this.editMobile() } : u
        ));
        this.editingUserId.set(null);
        this.snackBar.open('User updated', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to update user', 'Close', { duration: 3000 }),
    });
  }

  cancelEdit() {
    this.editingUserId.set(null);
  }
}
