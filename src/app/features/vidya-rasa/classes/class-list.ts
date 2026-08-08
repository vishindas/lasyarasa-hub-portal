import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
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
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatDialogModule, MatCardModule, MatSnackBarModule],
  templateUrl: './class-list.html'
})
export class ClassListComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  classes = signal<SchoolClass[]>([]);
  displayedColumns = ['danceStyle', 'ageGroup', 'batchName', 'schedule', 'feeTier', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.http.get<SchoolClass[]>(`${environment.apiUrl}/school/classes`)
      .subscribe(data => this.classes.set(data));
  }

  openDetail(cls: SchoolClass) {
    this.router.navigate(['/vidya-rasa/classes', cls.id]);
  }

  openForm(cls?: SchoolClass) {
    this.dialog.open(ClassFormDialog, { width: '480px', data: cls ?? null })
      .afterClosed().subscribe(saved => { if (saved) { this.load(); this.snack.open('Class saved', 'OK', { duration: 2500 }); } });
  }

  delete(id: number) {
    this.dialog.open(ConfirmDialog, { width: '360px', data: { title: 'Remove Class', message: 'Remove this class? This cannot be undone.' } })
      .afterClosed().subscribe(confirmed => {
        if (!confirmed) return;
        this.http.delete(`${environment.apiUrl}/school/classes/${id}`)
          .subscribe(() => { this.load(); this.snack.open('Class removed', 'OK', { duration: 2500 }); });
      });
  }
}
