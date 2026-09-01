import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
    component.icon = '🎉';
    component.title = 'Nothing here';
    component.message = 'Add something to get started';
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders icon', () => {
    expect(fixture.nativeElement.querySelector('.empty-icon')?.textContent).toContain('🎉');
  });

  it('renders title', () => {
    expect(fixture.nativeElement.querySelector('h3')?.textContent).toContain('Nothing here');
  });

  it('renders message', () => {
    expect(fixture.nativeElement.querySelector('p')?.textContent).toContain('Add something');
  });

  it('does not render action button when actionLabel not set', () => {
    expect(fixture.nativeElement.querySelector('a.empty-action')).toBeNull();
  });

  it('renders action button when actionLabel and actionLink are set', () => {
    component.actionLabel = 'Add Event';
    component.actionLink = '/events/new';
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('a.empty-action');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Add Event');
  });

  it('does not render action button when only actionLabel is set (no link)', () => {
    component.actionLabel = 'Add Event';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a.empty-action')).toBeNull();
  });

  it('accepts array actionLink', () => {
    component.actionLabel = 'Go';
    component.actionLink = ['/events', '1'];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a.empty-action')).toBeTruthy();
  });
});
