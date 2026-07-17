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
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { environment } from '../../../../environments/environment';
import { Student } from '../../../core/models/student.model';
import { AgeGroup } from '../../../core/models/settings.model';
import { SchoolClass } from '../../../core/models/class.model';
import { StudentFormDialog } from './student-form-dialog';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, MatTableModule, MatButtonModule, MatIconModule,
            MatDialogModule, MatCardModule, MatSnackBarModule, DragDropModule,
            MatInputModule, MatFormFieldModule, MatTabsModule, MatMenuModule, MatCheckboxModule],
  templateUrl: './student-list.html'
})
export class StudentListComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  readonly tabs: { key: 'ALL'|'ACTIVE'|'ON_BREAK'|'NEEDS_ATTENTION'|'DROPPED'; label: string; icon?: string }[] = [
    { key: 'ACTIVE',           label: 'Active' },
    { key: 'ON_BREAK',         label: 'On Break' },
    { key: 'NEEDS_ATTENTION',  label: 'Needs Attention', icon: '🔴' },
    { key: 'DROPPED',          label: 'Dropped' },
  ];

  private allStudents = signal<Student[]>([]);
  searchQuery = signal('');
  activeTab = signal('ACTIVE');
  filterClasses = signal<string[]>([]);
  filterAgeGroups = signal<string[]>([]);

  uniqueClasses = computed(() => {
    const all = new Set<string>();
    this.allStudents().forEach(s => s.enrolledClasses?.forEach(c => all.add(c)));
    return [...all].sort();
  });

  counts = computed(() => {
    const all = this.allStudents();
    return {
      ALL:              all.length,
      ACTIVE:           all.filter(s => s.enrollmentStatus === 'ACTIVE').length,
      ON_BREAK:         all.filter(s => s.enrollmentStatus === 'ON_BREAK').length,
      NEEDS_ATTENTION:  all.filter(s => s.enrollmentStatus === 'NEEDS_ATTENTION').length,
      DROPPED:          all.filter(s => s.enrollmentStatus === 'DROPPED').length,
    };
  });

  students = computed(() => {
    const tab = this.activeTab();
    const q = this.searchQuery().toLowerCase().trim();
    const col = this.sortCol();
    const dir = this.sortDir();

    let list = tab === 'ALL'
      ? this.allStudents()
      : this.allStudents().filter(s => s.enrollmentStatus === tab);

    if (q) {
      list = list.filter(s =>
        (s.firstName + ' ' + s.lastName).toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.enrolledClasses?.some(c => c.toLowerCase().includes(q)) ||
        s.guardianNames?.some(g => g.toLowerCase().includes(q))
      );
    }

    const fc = this.filterClasses();
    if (fc.length) list = list.filter(s => s.enrolledClasses?.some(c => fc.includes(c)));

    const fa = this.filterAgeGroups();
    if (fa.length) list = list.filter(s => s.ageGroupLabel != null && fa.includes(s.ageGroupLabel));

    if (col) {
      list = [...list].sort((a, b) => {
        let av = '', bv = '';
        if (col === 'name')            { av = `${a.firstName} ${a.lastName}`; bv = `${b.firstName} ${b.lastName}`; }
        else if (col === 'ageGroup')   { av = a.ageGroupLabel ?? '';              bv = b.ageGroupLabel ?? ''; }
        else if (col === 'joinedDate') { av = a.joinedDate ?? '';                 bv = b.joinedDate ?? ''; }
        else if (col === 'classes')    { av = a.enrolledClasses?.[0] ?? '';       bv = b.enrolledClasses?.[0] ?? ''; }
        const cmp = av.localeCompare(bv);
        return dir === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  });
  ageGroups = signal<AgeGroup[]>([]);
  classes = signal<SchoolClass[]>([]);

  private colDef: Record<string, { label: string; width: string; sortable?: boolean }> = {
    name:       { label: 'Name',       width: '22%', sortable: true },
    classes:    { label: 'Classes',    width: '20%', sortable: true },
    ageGroup:   { label: 'Age Group',  width: '13%', sortable: true },
    phone:      { label: 'Phone',      width: '14%' },
    joinedDate: { label: 'Joined',     width: '12%', sortable: true },
    status:     { label: 'Status',     width: '10%' },
  };

  displayedColumns = signal(['name', 'classes', 'ageGroup', 'phone', 'joinedDate', 'status', 'actions']);

  draggableColumns = computed(() =>
    this.displayedColumns()
      .filter(c => c !== 'actions')
      .map(c => ({ key: c, label: this.colDef[c]?.label ?? c, width: this.colDef[c]?.width ?? 'auto', sortable: this.colDef[c]?.sortable ?? false }))
  );

  sortCol = signal('name');
  sortDir = signal<'asc'|'desc'>('asc');

  toggleClassFilter(cls: string) {
    this.filterClasses.update(list =>
      list.includes(cls) ? list.filter(c => c !== cls) : [...list, cls]
    );
  }

  toggleAgeGroupFilter(label: string) {
    this.filterAgeGroups.update(list =>
      list.includes(label) ? list.filter(l => l !== label) : [...list, label]
    );
  }

  clearFilters() {
    this.filterClasses.set([]);
    this.filterAgeGroups.set([]);
    this.searchQuery.set('');
  }

  toggleSort(col: string) {
    if (this.sortCol() === col) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortCol.set(col);
      this.sortDir.set('asc');
    }
  }

  ngOnInit() {
    this.load();
    this.http.get<AgeGroup[]>(`${environment.apiUrl}/school/settings/age-groups`)
      .subscribe(data => this.ageGroups.set(data));
    this.http.get<SchoolClass[]>(`${environment.apiUrl}/school/classes`)
      .subscribe(data => this.classes.set(data));
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
        classes: this.classes()
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
      .subscribe(data => this.allStudents.set(data));
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
