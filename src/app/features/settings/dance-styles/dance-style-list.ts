import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { DanceStyle } from '../../../core/models/settings.model';
import { DanceStyleDialog } from './dance-style-dialog';

@Component({
  selector: 'app-dance-style-list',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatDialogModule, MatCardModule, MatChipsModule, MatSnackBarModule],
  templateUrl: './dance-style-list.html'
})
export class DanceStyleListComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  styles = signal<DanceStyle[]>([]);
  displayedColumns = ['name', 'description', 'sortOrder', 'active', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.http.get<DanceStyle[]>(`${environment.apiUrl}/school/settings/dance-styles`)
      .subscribe(data => this.styles.set(data));
  }

  openForm(style?: DanceStyle) {
    this.dialog.open(DanceStyleDialog, { width: '480px', data: style ?? null })
      .afterClosed().subscribe(saved => {
        if (saved) { this.load(); this.snack.open('Dance style saved', 'OK', { duration: 2500 }); }
      });
  }

  delete(id: number) {
    if (!confirm('Remove this dance style?')) return;
    this.http.delete(`${environment.apiUrl}/school/settings/dance-styles/${id}`)
      .subscribe(() => { this.load(); this.snack.open('Dance style removed', 'OK', { duration: 2500 }); });
  }
}
