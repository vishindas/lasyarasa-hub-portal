import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem  { label: string; icon: string; route: string; }
interface NavGroup { label: string; icon: string; items: NavItem[]; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatListModule, MatIconModule],
  templateUrl: './sidebar.html'
})
export class SidebarComponent implements OnInit {
  auth   = inject(AuthService);
  private router = inject(Router);

  expandedGroups = signal<Set<string>>(new Set());

  private readonly studentsGroup: NavGroup = {
    label: 'Students', icon: 'people',
    items: [
      { label: 'Students',      icon: 'people',      route: '/vidya-rasa/students' },
      { label: 'Registrations', icon: 'how_to_reg',  route: '/vidya-rasa/registrations' },
    ]
  };

  private readonly classesGroup: NavGroup = {
    label: 'Classes', icon: 'school',
    items: [
      { label: 'Classes', icon: 'class', route: '/vidya-rasa/classes' },
    ]
  };

  private readonly financeGroup: NavGroup = {
    label: 'Finance', icon: 'payments',
    items: [
      { label: 'Fees',     icon: 'payments',     route: '/vidya-rasa/fees' },
      { label: 'Invoices', icon: 'receipt_long', route: '/vidya-rasa/invoices' },
    ]
  };

  private readonly settingsGroup: NavGroup = {
    label: 'Settings', icon: 'settings',
    items: [
      { label: 'Dance Styles',       icon: 'music_note',    route: '/settings/dance-styles' },
      { label: 'Fee Tiers',          icon: 'price_change',  route: '/settings/fee-tiers' },
      { label: 'Age Groups',         icon: 'group',         route: '/settings/age-groups' },
      { label: 'Invoice Reminders',  icon: 'schedule_send', route: '/settings/invoice-reminders' },
      { label: 'Currency',           icon: 'currency_exchange', route: '/settings/currency' },
      { label: 'Change Password',    icon: 'lock_reset',    route: '/settings/change-password' },
    ]
  };

  allGroups = computed((): NavGroup[] => {
    const role = this.auth.currentUser()?.role;
    const main = role === 'SCHOOL_ADMIN' || role === 'HUB_ADMIN' || role === 'SUPER_ADMIN'
      ? [this.studentsGroup, this.classesGroup, this.financeGroup]
      : [];
    return [...main, this.settingsGroup];
  });

  ngOnInit() {
    this.autoExpand(this.router.url);
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => this.autoExpand((e as NavigationEnd).urlAfterRedirects));
  }

  private autoExpand(url: string) {
    for (const group of this.allGroups()) {
      if (group.items.some(i => url.startsWith(i.route))) {
        this.expandedGroups.update(s => new Set([...s, group.label]));
      }
    }
  }

  toggleGroup(label: string) {
    this.expandedGroups.update(s => {
      const next = new Set(s);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  isExpanded(label: string) { return this.expandedGroups().has(label); }
}
