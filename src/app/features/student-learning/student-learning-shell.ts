import { Component, DestroyRef, Injector, OnInit, afterNextRender, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { StudentLearningContextService } from '../../core/services/student-learning-context.service';
import { StudentAccessLossService } from '../../core/services/student-access-loss.service';
import { OfflineDetectionService } from '../../core/services/offline-detection.service';
import { ClassroomLiteModeService } from '../../core/services/classroom-lite-mode.service';
import { ClassContextBarComponent } from './class-context-bar';
import { FullOutageBlockComponent } from '../../shared/curriculum/full-outage-block';
import { OfflineBlockComponent } from './offline-block';
import { LostAccessBlockComponent } from './lost-access-block';
import { StudentShellNavComponent } from './shell-nav/student-shell-nav';

/**
 * Route-level wrapper for every /my-students/:studentId/... screen. Owns
 * state-precedence exactly per Part III.1: FULL_OUTAGE/offline first
 * (suppress everything, including the header -- "no partial/stale content
 * shown underneath"), then lost-student-access scoped to the *currently
 * routed* studentId, then ordinary route content. Also owns the
 * one-time-per-student classes fetch (avoids every child screen
 * independently re-requesting the same list) and the route-change
 * H1-focus mechanism the verified v1.1.2 contract requires after every
 * switcher selection.
 *
 * Security correction (found via manual review): lost access must hide
 * EVERYTHING student-derived, including the switcher itself -- it shows
 * the routed student's own name, so "header/switcher stay as a valid
 * escape" was wrong; "Back to My Students" is the only escape now. There
 * is no separate authenticated-account-identity menu in this header only
 * `auth` (AuthService) is injected and it renders nothing on its own --
 * if one is ever added, it must show the signed-in account's own
 * identity, never anything student-derived, and so is exempt from this
 * suppression; until then there is nothing else here to preserve.
 * The effect() below actively clears StudentLearningContextService's
 * selection (not just suppresses rendering) the moment access is lost,
 * so no later re-render, re-navigation, or query-param change can surface
 * the previous student's class name without a fresh, successful
 * authorization response first.
 *
 * D6: AccountMenuComponent (email/change-password/sign-out) fills the
 * "separate authenticated-account-identity menu" this comment already
 * anticipated -- it shows only the signed-in account's own identity, never
 * anything student-derived, so it is deliberately placed outside the
 * lost-access suppression below, unlike the switcher.
 */
@Component({
  selector: 'app-student-learning-shell',
  standalone: true,
  imports: [RouterOutlet, MatIconModule, ClassContextBarComponent, FullOutageBlockComponent, OfflineBlockComponent, LostAccessBlockComponent, StudentShellNavComponent],
  styles: [`
    :host { display: block; min-height: 100vh; background: #FBF7EC; }

    .skip-link {
      position: absolute; left: -9999px; top: 0; z-index: 100;
      background: #1C1A16; color: #FAF6EC; padding: 10px 16px; border-radius: 0 0 8px 0;
      text-decoration: none; font-size: 0.9rem;
    }
    .skip-link:focus { left: 0; }

    .shell { display: flex; min-height: 100vh; }

    .rail {
      width: 264px; flex: none; background: #FBF7EC; border-right: 1px solid #E3DCC8;
    }

    .scrim { position: fixed; inset: 0; background: rgba(28, 26, 22, 0.4); z-index: 5; }

    .shell-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

    .topbar {
      display: flex; align-items: center; gap: 10px; padding: 10px 16px;
      background: #1C1A16; color: #FAF6EC; position: sticky; top: 0; z-index: 2;
    }
    .menu-toggle {
      min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center;
      background: none; border: none; color: inherit; cursor: pointer; border-radius: 8px; padding: 0;
    }
    .menu-toggle:focus-visible { outline: 2px solid #A3762C; outline-offset: 2px; }
    .topbar-brand { font-family: Fraunces, Georgia, serif; font-weight: 700; }

    main { flex: 1; }
    main:focus-visible { outline: none; }

    @media (max-width: 860px) {
      .rail {
        position: fixed; top: 0; left: 0; bottom: 0; z-index: 10;
        width: 280px; max-width: 84vw;
        transform: translateX(-100%);
        transition: transform 0.22s ease;
        box-shadow: 2px 0 16px rgba(0, 0, 0, 0.14);
      }
      .rail.open { transform: translateX(0); }
    }
    @media (max-width: 860px) and (prefers-reduced-motion: reduce) {
      .rail { transition: none; }
    }
  `],
  template: `
    @if (mode.mode() === 'FULL_OUTAGE') {
      <app-full-outage-block />
    } @else if (offline.offline()) {
      <app-offline-block (retry)="reload()" />
    } @else {
      <a class="skip-link" href="#main-content">Skip to main content</a>
      <div class="shell">
        <nav id="student-shell-rail" class="rail" [class.open]="mobileNavOpen()" aria-label="Student portal">
          <!-- Security fix (unchanged from before this slice): the switcher
               and nav links must never render while access is lost for the
               currently routed student -- StudentShellNavComponent hides
               them itself via its lostAccess input. The account menu
               shows only the signed-in account's own identity, never
               anything student-derived, so it stays visible regardless. -->
          <app-student-shell-nav [studentId]="studentId()" [lostAccess]="accessLoss.lostAccessFor() === studentId()" />
        </nav>
        @if (isMobile() && mobileNavOpen()) {
          <div class="scrim" (click)="closeMobileNav()"></div>
        }
        <div class="shell-main">
          @if (isMobile()) {
            <header class="topbar">
              <button
                class="menu-toggle" type="button" (click)="toggleMobileNav()"
                [attr.aria-expanded]="mobileNavOpen()" aria-controls="student-shell-rail" aria-label="Open navigation">
                <mat-icon aria-hidden="true">menu</mat-icon>
              </button>
              <span class="topbar-brand">LasyaRasa</span>
            </header>
          }
          @if (accessLoss.lostAccessFor() === studentId()) {
            <app-lost-access-block (backToMyStudents)="backToMyStudents()" />
          } @else {
            <app-class-context-bar [classes]="context.classes()" [selectedClassId]="context.selectedClassId()" (classSelected)="onClassSelected($event)" />
            <main id="main-content" tabindex="-1">
              <router-outlet />
            </main>
          }
        </div>
      </div>
    }
  `
})
export class StudentLearningShellComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private breakpoint = inject(BreakpointObserver);
  auth = inject(AuthService);
  context = inject(StudentLearningContextService);
  accessLoss = inject(StudentAccessLossService);
  offline = inject(OfflineDetectionService);
  mode = inject(ClassroomLiteModeService);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);

  studentId = signal<number>(0);
  isMobile = signal(false);
  mobileNavOpen = signal(false);

  constructor() {
    // v1.1.2 verified contract: selecting a switcher option moves focus to
    // the resulting page's H1. Centralized here (once) rather than
    // duplicated per screen -- applies to every navigation within this
    // shell, not just switcher-driven ones, which is the correct general
    // SPA route-change focus behavior the design also asks for.
    // UX-01: also closes the mobile drawer after every navigation, matching
    // the admin shell's own established close-on-navigate behavior.
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(() => {
      if (this.isMobile()) this.mobileNavOpen.set(false);
      afterNextRender(() => this.focusPageHeading(), { injector: this.injector });
    });

    // Security: actively clears the shared class-selection state (not just
    // a template-level rendering suppression) the instant access is lost
    // for the currently routed student. Purely synchronous -- no HTTP call
    // is started here, so this is safe to run as a constructor effect.
    effect(() => {
      if (this.accessLoss.lostAccessFor() === this.studentId()) {
        this.context.clearSelection();
      }
    });
  }

  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const id = Number(params.get('studentId'));
      if (id !== this.studentId()) {
        this.studentId.set(id);
        this.accessLoss.clear();
        this.context.clearForNewStudent(id);
      }
    });

    // UX-01: the persistent rail becomes a slide-over drawer below 860px --
    // wide enough for the rail's labeled nav items + student-switcher name
    // + relationship caption to stay on one line without wrapping before
    // the drawer collapse kicks in.
    this.breakpoint.observe(['(max-width: 860px)']).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result => {
      this.isMobile.set(result.matches);
      if (!result.matches) this.mobileNavOpen.set(false);
    });
  }

  toggleMobileNav() {
    this.mobileNavOpen.update(v => !v);
  }

  closeMobileNav() {
    this.mobileNavOpen.set(false);
  }

  private focusPageHeading() {
    const h1 = document.querySelector<HTMLElement>('main h1, [role="main"] h1, h1[tabindex="-1"]');
    if (h1) {
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: false });
    }
  }

  onClassSelected(classId: number) {
    this.context.selectClass(classId);
    // D1 addition: switching class while already on the Dashboard stays on
    // the Dashboard rather than jumping to Learning Path -- every other
    // existing screen keeps its unchanged behavior below. The classId
    // query param makes this a genuinely different navigation (Angular
    // reuses the same component instance for a same-route, query-only
    // navigation and emits a fresh queryParamMap value rather than
    // rerunning ngOnInit) so Dashboard can react to it without needing the
    // router to destroy/recreate the component.
    if (this.router.url.includes('/dashboard')) {
      this.router.navigate(['/my-students', this.studentId(), 'dashboard'], { queryParams: { classId } });
      return;
    }
    this.router.navigate(['/my-students', this.studentId(), 'classes', classId, 'path']);
  }

  backToMyStudents() {
    this.router.navigate(['/my-students']);
  }

  reload() {
    this.context.clearForNewStudent(this.studentId());
  }
}
