import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { AgeGroup } from '../../../core/models/settings.model';
import { AgeGroupDialog } from './age-group-dialog';

@Component({
  selector: 'app-age-group-list',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatDialogModule, MatCardModule, MatSnackBarModule],
  templateUrl: './age-group-list.html'
})
export class AgeGroupListComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  groups = signal<AgeGroup[]>([]);
  displayedColumns = ['label', 'ageRange', 'sortOrder', 'active', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.http.get<AgeGroup[]>(`${environment.apiUrl}/school/settings/age-groups`)
      .subscribe(data => this.groups.set(data));
  }

  openForm(group?: AgeGroup) {
    this.dialog.open(AgeGroupDialog, { width: '480px', data: group ?? null })
      .afterClosed().subscribe(saved => {
        if (saved) { this.load(); this.snack.open('Age group saved', 'OK', { duration: 2500 }); }
      });
  }

  delete(id: number) {
    if (!confirm('Deactivate this age group?')) return;
    this.http.delete(`${environment.apiUrl}/school/settings/age-groups/${id}`)
      .subscribe(() => { this.load(); this.snack.open('Age group deactivated', 'OK', { duration: 2500 }); });
  }
}
