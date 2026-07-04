import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { filter } from 'rxjs/operators';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SidebarComponent } from '../sidebar/sidebar';
import { TopbarComponent } from '../topbar/topbar';
import { ChatWidgetComponent } from '../chat-widget/chat-widget';
import { CurrencyService } from '../../core/services/currency.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, MatSidenavModule, SidebarComponent, TopbarComponent, ChatWidgetComponent],
  templateUrl: './shell.html'
})
export class ShellComponent implements OnInit {
  private breakpoint = inject(BreakpointObserver);
  private router = inject(Router);
  private currencyService = inject(CurrencyService);

  isMobile = signal(false);
  sidenavOpen = signal(true);

  ngOnInit() {
    this.currencyService.load();
    this.breakpoint.observe(['(max-width: 768px)']).subscribe(r => {
      this.isMobile.set(r.matches);
      this.sidenavOpen.set(!r.matches);
    });

    // Close drawer after navigation on mobile
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile()) this.sidenavOpen.set(false);
      });
  }

  toggleSidenav() { this.sidenavOpen.update(v => !v); }
}
