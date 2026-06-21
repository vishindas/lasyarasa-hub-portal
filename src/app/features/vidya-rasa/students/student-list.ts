import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { environment } from '../../../../environments/environment';
import { Student } from '../../../core/models/student.model';
import { AgeGroup, DanceStyle, FeeTier } from '../../../core/models/settings.model';
import { StudentFormDialog } from './student-form-dialog';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, MatTableModule, MatButtonModule, MatIconModule,
            MatDialogModule, MatCardModule, MatSnackBarModule, DragDropModule],
  templateUrl: './student-list.html'
})
export class StudentListComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  students = signal<Student[]>([]);
  ageGroups = signal<AgeGroup[]>([]);
  danceStyles = signal<DanceStyle[]>([]);
  feeTiers = signal<FeeTier[]>([]);

  private colDef: Record<string, { label: string; width: string }> = {
    name:       { label: 'Name',       width: '28%' },
    ageGroup:   { label: 'Age Group',  width: '16%' },
    phone:      { label: 'Phone',      width: '17%' },
    joinedDate: { label: 'Joined',     width: '17%' },
    status:     { label: 'Status',     width: '13%' },
  };

  displayedColumns = signal(['name', 'ageGroup', 'phone', 'joinedDate', 'status', 'actions']);

  draggableColumns = computed(() =>
    this.displayedColumns()
      .filter(c => c !== 'actions')
      .map(c => ({ key: c, label: this.colDef[c]?.label ?? c, width: this.colDef[c]?.width ?? 'auto' }))
  );

  ngOnInit() {
    this.load();
    this.http.get<AgeGroup[]>(`${environment.apiUrl}/school/settings/age-groups`)
      .subscribe(data => this.ageGroups.set(data));
    this.http.get<DanceStyle[]>(`${environment.apiUrl}/school/settings/dance-styles`)
      .subscribe(data => this.danceStyles.set(data));
    this.http.get<FeeTier[]>(`${environment.apiUrl}/school/settings/fee-tiers`)
      .subscribe(data => this.feeTiers.set(data));
  }

  dropColumn(event: CdkDragDrop<string[]>) {
    this.displayedColumns.update(cols => {
      const draggable = cols.filter(c => c !== 'actions');
      moveItemInArray(draggable, event.previousIndex, event.currentIndex);
      return [...draggable, 'actions'];
    });
  }

  viewProfile(id: number) {
    this.router.navigate(['/vidya-rasa/students', id]);
  }

  openForm(student?: Student) {
    if (student) {
      this.http.get(`${environment.apiUrl}/school/v2/students/${student.id}`)
        .subscribe(detail => this.openFormDialog(detail));
    } else {
      this.openFormDialog(null);
    }
  }

  private openFormDialog(studentDetail: any) {
    this.dialog.open(StudentFormDialog, {
      width: '620px',
      maxHeight: '90vh',
      data: {
        studentDetail,
        ageGroups: this.ageGroups(),
        danceStyles: this.danceStyles(),
        feeTiers: this.feeTiers()
      }
    }).afterClosed().subscribe(saved => {
      if (saved) {
        this.load();
        this.snack.open('Student saved', 'OK', { duration: 2500 });
      }
    });
  }

  load() {
    this.http.get<Student[]>(`${environment.apiUrl}/school/v2/students`)
      .subscribe(data => this.students.set(data));
  }

  delete(id: number) {
    if (!confirm('Remove this student?')) return;
    this.http.delete(`${environment.apiUrl}/school/v2/students/${id}`)
      .subscribe(() => {
        this.load();
        this.snack.open('Student removed', 'OK', { duration: 2500 });
      });
  }
}
