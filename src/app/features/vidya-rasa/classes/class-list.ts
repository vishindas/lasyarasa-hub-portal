import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { SchoolClass } from '../../../core/models/class.model';
import { ClassFormDialog } from './class-form-dialog';
import { ConfirmDialog } from '../../../shared/confirm-dialog';

@Component({
  selector: 'app-class-list',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatButtonToggleModule, MatIconModule, MatDialogModule, MatCardModule, MatSnackBarModule],
  templateUrl: './class-list.html'
})
export class ClassListComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  classes = signal<SchoolClass[]>([]);
  view = signal<'active' | 'archived'>('active');
  displayedColumns = ['danceStyle', 'ageGroup', 'batchName', 'schedule', 'feeTier', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    const path = this.view() === 'archived' ? '/school/classes/archived' : '/school/classes';
    this.http.get<SchoolClass[]>(`${environment.apiUrl}${path}`)
      .subscribe(data => this.classes.set(data));
  }

  setView(view: 'active' | 'archived') {
    this.view.set(view);
    this.load();
  }

  openDetail(cls: SchoolClass) {
    this.router.navigate(['/vidya-rasa/classes', cls.id]);
  }

  openForm(cls?: SchoolClass) {
    this.dialog.open(ClassFormDialog, { width: '480px', data: cls ?? null })
      .afterClosed().subscribe(saved => { if (saved) { this.load(); this.snack.open('Class saved', 'OK', { duration: 2500 }); } });
  }

  archive(cls: SchoolClass) {
    this.dialog.open(ConfirmDialog, { width: '400px', data: {
      title: 'Archive Class',
      message: `Archive "${cls.batchName}"? It will no longer appear as an option for new enrollments, assignments, or curriculum, but all its history is preserved.`,
      confirmLabel: 'Archive'
    } }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.http.post(`${environment.apiUrl}/school/classes/${cls.id}/archive`, { expectedRowVersion: cls.rowVersion })
        .subscribe({
          next: () => { this.load(); this.snack.open('Class archived', 'OK', { duration: 2500 }); },
          error: (err: HttpErrorResponse) => this.snack.open(err.error?.message || 'Could not archive this class.', 'OK', { duration: 5000 })
        });
    });
  }

  restore(cls: SchoolClass) {
    this.http.post(`${environment.apiUrl}/school/classes/${cls.id}/restore`, { expectedRowVersion: cls.rowVersion })
      .subscribe({
        next: () => { this.load(); this.snack.open('Class restored', 'OK', { duration: 2500 }); },
        error: (err: HttpErrorResponse) => this.snack.open(err.error?.message || 'Could not restore this class.', 'OK', { duration: 5000 })
      });
  }

  delete(id: number) {
    this.dialog.open(ConfirmDialog, { width: '360px', data: { title: 'Remove Class', message: 'Remove this class? This cannot be undone.' } })
      .afterClosed().subscribe(confirmed => {
        if (!confirmed) return;
        this.http.delete(`${environment.apiUrl}/school/classes/${id}`)
          .subscribe({
            next: () => { this.load(); this.snack.open('Class removed', 'OK', { duration: 2500 }); },
            error: (err: HttpErrorResponse) => this.snack.open(err.error?.message || 'Could not delete this class.', 'OK', { duration: 5000 })
          });
      });
  }
}
