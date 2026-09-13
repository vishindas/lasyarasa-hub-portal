import { PortalAccessTargetStatus } from '../../../core/models/portal-access.model';
import { EnablePortalAccessTarget } from './enable-portal-access-dialog';

/** One derived, display-only row — never a fact this module invents; always computed from PortalAccessTargetStatus. */
export interface PortalAccessDisplayRow {
  label: string;
  chipClass: string;
  chipLabel: string;
  copy: string;
  cta: 'enable' | 'resend' | null;
  ctaAriaLabel: string;
  target: EnablePortalAccessTarget;
  storedEmail: string | null;
}

/**
 * Pure derivation from the four raw backend facts. Precedence, most
 * authoritative first: REVOKED, then ACTIVE+credentials established, then
 * ACTIVE without credentials, then a live invitation with no access row
 * yet, then Needs Setup. Never inferred from student.email/guardian.email.
 *
 * REVOKED is reported as a plain fact and given no CTA in this slice — the
 * backend does not itself treat a revoked row as blocking a fresh grant for
 * a still-unactivated placeholder (it never occupies the partial-unique
 * "current owner" index), so re-enabling is not technically impossible.
 * Not exposing it as a UI action here is a deliberate, deferred product
 * decision, not a claim that the backend forbids it.
 */
export function deriveDisplayRow(label: string, status: PortalAccessTargetStatus,
                                  target: EnablePortalAccessTarget, storedEmail: string | null): PortalAccessDisplayRow {
  const ctaLabel = target.kind === 'SELF' ? 'this student' : target.label;

  if (status.accessStatus === 'REVOKED') {
    return {
      label, chipClass: 'revoked', chipLabel: 'Revoked',
      copy: 'Portal access was revoked. Re-enabling access is not available from this screen.',
      cta: null, ctaAriaLabel: '', target, storedEmail
    };
  }
  if (status.accessStatus === 'ACTIVE' && status.credentialsEstablished === true) {
    return { label, chipClass: 'active', chipLabel: 'Active', copy: '', cta: null, ctaAriaLabel: '', target, storedEmail };
  }
  if (status.accessStatus === 'ACTIVE' && status.credentialsEstablished === false) {
    return {
      label, chipClass: 'pending', chipLabel: 'Pending — Setup Required',
      copy: status.hasLiveInvitation && status.pendingInvitationEmail
        ? `Invitation sent to ${status.pendingInvitationEmail}.`
        : 'Access granted — awaiting setup.',
      cta: 'resend', ctaAriaLabel: `Resend portal access invitation for ${ctaLabel}`, target, storedEmail
    };
  }
  if (status.hasLiveInvitation) {
    return {
      label, chipClass: 'pending', chipLabel: 'Pending — Invitation Sent',
      copy: status.pendingInvitationEmail ? `Sent to ${status.pendingInvitationEmail}.` : '',
      cta: 'resend', ctaAriaLabel: `Resend portal access invitation for ${ctaLabel}`, target, storedEmail
    };
  }
  return {
    label, chipClass: 'inactive', chipLabel: 'Needs Setup', copy: 'No portal access set up yet.',
    cta: 'enable', ctaAriaLabel: `Enable portal access for ${ctaLabel}`, target, storedEmail
  };
}
