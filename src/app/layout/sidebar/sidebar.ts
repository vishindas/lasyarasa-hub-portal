import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatListModule, MatIconModule],
  templateUrl: './sidebar.html'
})
export class SidebarComponent {
  auth = inject(AuthService);

  commonNav: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' }
  ];

  vidyaRasaNav: NavItem[] = [
    { label: 'Students', icon: 'people', route: '/vidya-rasa/students' },
    { label: 'Classes', icon: 'class', route: '/vidya-rasa/classes' },
    { label: 'Fees', icon: 'payments', route: '/vidya-rasa/fees' },
    { label: 'Invoices', icon: 'receipt_long', route: '/vidya-rasa/invoices' }
  ];

  settingsNav: NavItem[] = [
    { label: 'Dance Styles', icon: 'music_note', route: '/settings/dance-styles' },
    { label: 'Fee Tiers', icon: 'price_change', route: '/settings/fee-tiers' },
    { label: 'Age Groups', icon: 'group', route: '/settings/age-groups' }
  ];

  vastraRasaNav: NavItem[] = [
    { label: 'Products', icon: 'inventory_2', route: '/vastra-rasa/products' },
    { label: 'Orders', icon: 'shopping_bag', route: '/vastra-rasa/orders' }
  ];

  roopaRasaNav: NavItem[] = [
    { label: 'Bookings', icon: 'event', route: '/roopa-rasa/bookings' },
    { label: 'Portfolio', icon: 'photo_library', route: '/roopa-rasa/portfolio' }
  ];

  chitraRasaNav: NavItem[] = [
    { label: 'Bookings', icon: 'event', route: '/chitra-rasa/bookings' },
    { label: 'Clients', icon: 'people', route: '/chitra-rasa/clients' }
  ];

  get verticalNav(): NavItem[] {
    const role = this.auth.currentUser()?.role;
    if (role === 'SCHOOL_ADMIN') return this.vidyaRasaNav;
    if (role === 'HUB_ADMIN' || role === 'SUPER_ADMIN') return [...this.vidyaRasaNav, ...this.vastraRasaNav, ...this.roopaRasaNav, ...this.chitraRasaNav];
    return [];
  }

  get verticalLabel(): string {
    const role = this.auth.currentUser()?.role;
    if (role === 'SCHOOL_ADMIN') return 'Vidya Rasa';
    if (role === 'HUB_ADMIN' || role === 'SUPER_ADMIN') return 'All Verticals';
    return '';
  }
}
