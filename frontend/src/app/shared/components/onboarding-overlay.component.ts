import { Component, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-onboarding-overlay',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <div class="onboarding-backdrop" (click)="skip()">
      <div class="onboarding-card" (click)="$event.stopPropagation()">
        <div class="step-indicators">
          @for (s of steps; track $index) {
            <span class="step-dot" [class.active]="$index === step()"></span>
          }
        </div>
        @switch (step()) {
          @case (0) {
            <mat-icon class="onboard-icon">celebration</mat-icon>
            <h2>Welcome to Moify! 🎉</h2>
            <p>Your smart digital wedding gift ledger. Track moi contributions, print receipts, and generate beautiful reports — all in one place.</p>
          }
          @case (1) {
            <mat-icon class="onboard-icon">event</mat-icon>
            <h2>Create Your First Event</h2>
            <p>Start by creating a wedding, birthday, or any celebration event. Set the date, venue, and family details.</p>
          }
          @case (2) {
            <mat-icon class="onboard-icon">payments</mat-icon>
            <h2>Record Moi Entries</h2>
            <p>At the event, quickly add guest names and gift amounts. Print thermal receipts instantly and export reports after.</p>
          }
        }
        <div class="onboard-actions">
          <button mat-button (click)="skip()">Skip</button>
          @if (step() < steps.length - 1) {
            <button mat-raised-button color="primary" (click)="next()">Next →</button>
          } @else {
            <button mat-raised-button color="primary" routerLink="/events/new" (click)="done()">Create First Event →</button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .onboarding-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:9999; }
    .onboarding-card { background:var(--color-surface,#fff); border-radius:16px; padding:40px; max-width:440px; width:90%; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.3); }
    .step-indicators { display:flex; gap:8px; justify-content:center; margin-bottom:24px; }
    .step-dot { width:10px; height:10px; border-radius:50%; background:#ddd; transition:background 0.3s; }
    .step-dot.active { background:var(--color-primary,#7b2d8b); }
    .onboard-icon { font-size:56px; width:56px; height:56px; color:var(--color-primary,#7b2d8b); margin-bottom:16px; }
    h2 { margin:0 0 12px; }
    p { color:var(--color-text-secondary,#666); margin-bottom:24px; line-height:1.6; }
    .onboard-actions { display:flex; gap:12px; justify-content:center; }
  `]
})
export class OnboardingOverlayComponent {
  @Output() closed = new EventEmitter<void>();
  step = signal(0);
  steps = [0, 1, 2];
  next() { this.step.update(s => s + 1); }
  skip() { this.finish(); }
  done() { this.finish(); }
  private finish() { try { localStorage.setItem('moify_onboarded', '1'); } catch {} this.closed.emit(); }
}
