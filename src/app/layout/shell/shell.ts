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
import { AssignmentCapabilityStateService } from '../../core/services/assignment-capability-state.service';

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
  // Slice 15 Plan v2.1.2 §9.4: this field initializer alone constructs the
  // root-provided AssignmentCapabilityStateService as soon as ShellComponent
  // is instantiated (i.e. on normal app startup, right after
  // login/session-restore, since ShellComponent is the persistent
  // authenticated wrapper) -- that construction runs the service's own
  // constructor, which registers the auth-state effect that performs the
  // first capability refresh once currentUser().providerId is available.
  // No ngOnInit() call is added for this -- inject() must run in a valid
  // injection context (constructor / field initializer / factory), not
  // inside an already-running lifecycle method.
  private readonly capabilityState = inject(AssignmentCapabilityStateService);

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
