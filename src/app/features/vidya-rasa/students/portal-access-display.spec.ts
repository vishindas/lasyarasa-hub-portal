import { deriveDisplayRow } from './portal-access-display';
import { PortalAccessTargetStatus } from '../../../core/models/portal-access.model';
import { EnablePortalAccessTarget } from './enable-portal-access-dialog';

describe('deriveDisplayRow', () => {
  const SELF: EnablePortalAccessTarget = { kind: 'SELF' };
  const GUARDIAN: EnablePortalAccessTarget = { kind: 'GUARDIAN', guardianId: 7, label: 'Priya Sharma' };

  function status(overrides: Partial<PortalAccessTargetStatus>): PortalAccessTargetStatus {
    return {
      accessStatus: null, userId: null, credentialsEstablished: null,
      hasLiveInvitation: false, pendingInvitationEmail: null, ...overrides
    };
  }

  it('no access, no invitation -> Needs Setup, Enable CTA', () => {
    const row = deriveDisplayRow('Self Access', status({}), SELF, null);
    expect(row.chipClass).toBe('inactive');
    expect(row.chipLabel).toBe('Needs Setup');
    expect(row.cta).toBe('enable');
  });

  it('no access, live invitation -> Pending Invitation Sent, Resend CTA, shows invitation email', () => {
    const row = deriveDisplayRow('Self Access',
      status({ hasLiveInvitation: true, pendingInvitationEmail: 'typed@example.com' }), SELF, null);
    expect(row.chipLabel).toBe('Pending — Invitation Sent');
    expect(row.cta).toBe('resend');
    expect(row.copy).toContain('typed@example.com');
  });

  it('ACTIVE + credentials established -> Active, no CTA', () => {
    const row = deriveDisplayRow('Self Access',
      status({ accessStatus: 'ACTIVE', userId: 5, credentialsEstablished: true }), SELF, null);
    expect(row.chipClass).toBe('active');
    expect(row.chipLabel).toBe('Active');
    expect(row.cta).toBeNull();
  });

  it('ACTIVE + credentials not established -> Pending Setup Required, Resend CTA', () => {
    const row = deriveDisplayRow('Self Access',
      status({ accessStatus: 'ACTIVE', userId: 5, credentialsEstablished: false }), SELF, null);
    expect(row.chipLabel).toBe('Pending — Setup Required');
    expect(row.cta).toBe('resend');
  });

  it('ACTIVE + credentials not established + live invitation -> copy includes the invitation email', () => {
    const row = deriveDisplayRow('Self Access',
      status({ accessStatus: 'ACTIVE', credentialsEstablished: false, hasLiveInvitation: true, pendingInvitationEmail: 'a@b.com' }),
      SELF, null);
    expect(row.copy).toContain('a@b.com');
  });

  it('REVOKED -> Revoked chip, non-actionable copy, no CTA -- even when a live invitation also exists', () => {
    const row = deriveDisplayRow('Self Access',
      status({ accessStatus: 'REVOKED', userId: 5, hasLiveInvitation: true, pendingInvitationEmail: 'stale@example.com' }),
      SELF, null);
    expect(row.chipClass).toBe('revoked');
    expect(row.chipLabel).toBe('Revoked');
    expect(row.copy).toBe('Portal access was revoked. Re-enabling access is not available from this screen.');
    expect(row.cta).toBeNull();
  });

  it('REVOKED takes precedence over ACTIVE (defensive -- not reachable under current partial-unique-index design)', () => {
    const row = deriveDisplayRow('Self Access', status({ accessStatus: 'REVOKED' }), SELF, null);
    expect(row.chipLabel).toBe('Revoked');
  });

  it('GUARDIAN target -- Enable CTA aria-label names the guardian, not "this student"', () => {
    const row = deriveDisplayRow('Priya Sharma (Mother)', status({}), GUARDIAN, null);
    expect(row.ctaAriaLabel).toBe('Enable portal access for Priya Sharma');
  });

  it('SELF target -- Resend CTA aria-label reads "this student"', () => {
    const row = deriveDisplayRow('Self Access',
      status({ accessStatus: 'ACTIVE', credentialsEstablished: false }), SELF, null);
    expect(row.ctaAriaLabel).toBe('Resend portal access invitation for this student');
  });

  it('storedEmail is passed through unchanged, never derived here', () => {
    const row = deriveDisplayRow('Self Access', status({}), SELF, 'stored@example.com');
    expect(row.storedEmail).toBe('stored@example.com');
  });
});
