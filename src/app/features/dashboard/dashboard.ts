import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DatePipe, CurrencyPipe, TitleCasePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

interface DashboardSummary {
  totalStudents: number;
  activeClasses: number;
  pendingFees: number;
  pendingFeeStudents: number;
}

interface DashboardClass {
  id: number;
  name: string;
  danceStyle: string;
  ageGroup: string;
  studentCount: number;
}

interface DashboardRegistration {
  id: number;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
}

interface DashboardStudent {
  id: number;
  firstName: string;
  lastName: string;
  joinedDate: string;
  enrolledClasses: string | null;
}

interface DashboardFeeSnapshot {
  pendingAmount: number;
  pendingStudents: number;
}

interface Dashboard {
  summary: DashboardSummary;
  activeClasses: DashboardClass[];
  recentRegistrations: DashboardRegistration[];
  recentStudents: DashboardStudent[];
  feeSnapshot: DashboardFeeSnapshot;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, TitleCasePipe,
            MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  dashboard = signal<Dashboard | null>(null);
  loading = signal(true);

  ngOnInit() {
    this.http.get<Dashboard>(`${environment.apiUrl}/school/dashboard`)
      .subscribe({
        next: d => { this.dashboard.set(d); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
  }

  go(path: string, queryParams?: Record<string, string>) {
    this.router.navigate([path], queryParams ? { queryParams } : {});
  }

  firstName(): string {
    const email = this.auth.currentUser()?.email ?? '';
    return email.split('@')[0];
  }

  regStatusClass(status: string): string {
    if (status === 'APPROVED') return 'status-active';
    if (status === 'REJECTED') return 'status-dropped';
    return 'status-pending';
  }
}
