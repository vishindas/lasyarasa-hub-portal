import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private http = inject(HttpClient);

  studentCount = signal(0);
  classCount = signal(0);
  pendingFees = signal(0);

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/school/students`).subscribe(d => this.studentCount.set(d.length));
    this.http.get<any[]>(`${environment.apiUrl}/school/classes`).subscribe(d => this.classCount.set(d.length));
    this.http.get<any[]>(`${environment.apiUrl}/school/fees`).subscribe(d =>
      this.pendingFees.set(d.filter(f => f.status === 'PENDING' || f.status === 'OVERDUE').length)
    );
  }
}
