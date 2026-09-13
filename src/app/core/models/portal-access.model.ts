/**
 * Portal Access Onboarding Slice 3. Mirrors the backend contract exactly —
 * see PortalAccessTargetStatus / PortalAccessGuardianStatus /
 * PortalAccessStatusResponse (backend, api/dto/school/student). Every field
 * is a raw fact; no client-side inference from student/guardian stored
 * email, and no reconstruction from a prior enable-access response.
 */
export interface PortalAccessTargetStatus {
  accessStatus: 'ACTIVE' | 'REVOKED' | null;
  userId: number | null;
  credentialsEstablished: boolean | null;
  hasLiveInvitation: boolean;
  pendingInvitationEmail: string | null;
}

export interface PortalAccessGuardianStatus {
  guardianId: number;
  firstName: string;
  lastName: string;
  relationship: string;
  status: PortalAccessTargetStatus;
}

export interface PortalAccessStatusResponse {
  self: PortalAccessTargetStatus;
  guardians: PortalAccessGuardianStatus[];
}

export type AccessType = 'SELF' | 'GUARDIAN';

export type EnablePortalAccessOutcome =
  | 'GRANTED_AND_INVITED'
  | 'ALREADY_ACTIVE'
  | 'INVITATION_SENT_TO_EXISTING_OWNER';

export interface EnablePortalAccessRequest {
  loginEmail: string;
  accessType: AccessType;
  guardianId: number | null;
}

export interface EnablePortalAccessResponse {
  outcome: EnablePortalAccessOutcome;
  userId: number | null;
  accessId: number | null;
}

export interface InviteExistingStudentAccessRequest {
  accessType: AccessType;
  guardianId: number | null;
  confirmed: boolean;
}

export interface InviteExistingStudentAccessResponse {
  invitationId: number;
  expiresAt: string;
  delivered: boolean;
}

/**
 * Stable, additive machine-readable discriminator on enable-portal-access's
 * two 500 outcomes (Slice 3) — never derive UI behavior from the
 * human-readable `error` string.
 */
export type EnablePortalAccessErrorCode =
  | 'INVITATION_DISPATCH_FAILED'
  | 'ACCESS_GRANTED_INVITATION_FAILED';

export interface ApiErrorBody {
  error: string;
  code?: EnablePortalAccessErrorCode;
}
