import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { StudentAccessApiService } from '../../core/services/student-access-api.service';
import { StudentAccessDTO } from '../../core/models/student-learning.model';
import { environment } from '../../../environments/environment';

type StudentAccess = StudentAccessDTO;

type ViewState = 'loading' | 'loaded' | 'empty' | 'error';

@Component({
  selector: 'app-my-students',
  standalone: true,
  imports: [
    MatToolbarModule, MatCardModule, MatIconModule, MatButtonModule,
    MatMenuModule, MatProgressSpinnerModule, RouterLink
  ],
  styles: [`
    .my-students-page {
      min-height: 100vh;
      background: #f8f9fb;
    }
    .my-students-topbar {
      background: #1a1f36 !important;
      color: #fff;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 1.05rem;
    }
    .brand .logo { font-size: 1.3rem; }
    .spacer { flex: 1 1 auto; }
    .user-menu-header {
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .role-badge {
      font-size: 0.75rem;
      color: #6c757d;
      text-transform: capitalize;
    }
    .my-students-content {
      max-width: 960px;
      margin: 0 auto;
      padding: 32px 20px 60px;
    }
    .page-title {
      margin: 0 0 24px;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a1f36;
    }
    .students-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }
    .student-card {
      border-radius: 12px !important;
    }
    /* Slice 12 dormant gate: while studentLearningEntryEnabled is false, cards
       render with zero visual/behavioral change from today -- no cursor
       change, no hover affordance, no link semantics (see enableEntry()
       below, which controls whether routerLink is even bound). This rule
       only ever applies once that flag is true. */
    a.student-card {
      display: block;
      text-decoration: none;
      cursor: pointer;
      transition: box-shadow 0.15s ease;
    }
    a.student-card:hover, a.student-card:focus-visible {
      box-shadow: 0 2px 10px rgba(0,0,0,0.12);
    }
    @media (prefers-reduced-motion: reduce) {
      a.student-card { transition: none; }
    }
    .student-name {
      margin: 0 0 4px;
      font-size: 1.05rem;
      font-weight: 700;
      color: #1a1f36;
    }
    .provider-name {
      margin: 0 0 12px;
      font-size: 0.85rem;
      color: #6c757d;
    }
    .access-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
      background: #eef2ff;
      color: #3730a3;
    }
    .state-block {
      text-align: center;
      padding: 80px 16px;
      color: #6c757d;
    }
    .state-icon {
      font-size: 44px;
      width: 44px;
      height: 44px;
      margin-bottom: 12px;
      color: #9ca3af;
    }
    .state-subtext {
      font-size: 0.85rem;
      margin-top: 4px;
    }
    @media (max-width: 480px) {
      .my-students-content { padding: 20px 14px 48px; }
    }
  `],
  template: `
    <div class="my-students-page">
      <mat-toolbar class="my-students-topbar">
        <span class="brand"><span class="logo">🪷</span> LasyaRasa Hub</span>
        <span class="spacer"></span>
        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <div class="user-menu-header">
            <strong>{{ auth.currentUser()?.email }}</strong>
          </div>
          <button mat-menu-item (click)="auth.logout()">
            <mat-icon>logout</mat-icon>
            Sign out
          </button>
        </mat-menu>
      </mat-toolbar>

      <main class="my-students-content">
        <h1 class="page-title">My Students</h1>

        @if (view() === 'loading') {
          <div class="state-block">
            <mat-spinner diameter="36" style="margin:0 auto" />
          </div>
        }

        @if (view() === 'loaded') {
          <div class="students-grid">
            @for (s of students(); track trackByAccess($index, s)) {
              @if (entryEnabled) {
                <!-- Slice 12: entry point exposed only when studentLearningEntryEnabled is true (architect decision 4). -->
                <a class="student-card" mat-card [routerLink]="['/my-students', s.studentId, 'home']">
                  <mat-card-content>
                    <h2 class="student-name">{{ s.studentDisplayName }}</h2>
                    <p class="provider-name">{{ s.providerDisplayName }}</p>
                    <span class="access-badge">{{ accessLabel(s.accessType) }}</span>
                  </mat-card-content>
                </a>
              } @else {
                <mat-card class="student-card">
                  <mat-card-content>
                    <h2 class="student-name">{{ s.studentDisplayName }}</h2>
                    <p class="provider-name">{{ s.providerDisplayName }}</p>
                    <span class="access-badge">{{ accessLabel(s.accessType) }}</span>
                  </mat-card-content>
                </mat-card>
              }
            }
          </div>
        }

        @if (view() === 'empty') {
          <div class="state-block">
            <mat-icon class="state-icon">group_off</mat-icon>
            <p>No students are linked to this account yet.</p>
            <p class="state-subtext">If you expected to see a student here, please contact your school.</p>
          </div>
        }

        @if (view() === 'error') {
          <div class="state-block">
            <mat-icon class="state-icon" style="color:#ef4444">error_outline</mat-icon>
            <p>We couldn't load your students right now.</p>
            <button mat-flat-button color="primary" (click)="load()">Retry</button>
          </div>
        }
      </main>
    </div>
  `
})
export class MyStudentsComponent implements OnInit {
  private studentAccessApi = inject(StudentAccessApiService);
  auth = inject(AuthService);

  /** Slice 12 dormant gate (architect decision 4) -- committed false everywhere; a build-time value only, never read at runtime from config. */
  readonly entryEnabled = environment.studentLearningEntryEnabled;

  view = signal<ViewState>('loading');
  students = signal<StudentAccess[]>([]);

  ngOnInit() {
    this.load();
  }

  load() {
    this.view.set('loading');
    this.studentAccessApi.list().subscribe({
      next: (res) => {
        const list = res ?? [];
        this.students.set(list);
        this.view.set(list.length > 0 ? 'loaded' : 'empty');
      },
      error: () => {
        this.students.set([]);
        this.view.set('error');
      }
    });
  }

  accessLabel(type: 'SELF' | 'GUARDIAN'): string {
    return type === 'SELF' ? 'Student access' : 'Guardian access';
  }

  trackByAccess(_index: number, item: StudentAccess): string {
    return `${item.providerId}-${item.studentId}`;
  }
}
