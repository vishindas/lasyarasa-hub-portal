import { Injectable, signal } from '@angular/core';

/**
 * Part III's "Offline / network failure" state -- client-detected, not
 * server-reported (Part VII.4: "Offline is a client-detected condition (no
 * network response)"). Uses the browser's own online/offline events plus
 * the initial navigator.onLine value; deliberately no polling.
 */
@Injectable({ providedIn: 'root' })
export class OfflineDetectionService {
  private readonly _offline = signal<boolean>(typeof navigator !== 'undefined' && 'onLine' in navigator ? !navigator.onLine : false);
  readonly offline = this._offline.asReadonly();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this._offline.set(false));
      window.addEventListener('offline', () => this._offline.set(true));
    }
  }
}
