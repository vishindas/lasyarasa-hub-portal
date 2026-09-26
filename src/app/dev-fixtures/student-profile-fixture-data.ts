// TEST/DEV-ONLY. See dev-fixtures/README.md. Static fixture data for
// verifying StudentProfileComponent + PortalAccessCard locally, in every
// Portal Access state, without a real backend.

export const FIXTURE_STUDENT_DETAIL = {
  student: {
    id: 501, firstName: 'Ananya', lastName: 'Rao', email: 'ananya.rao@example.com', phone: '9876543210',
    dateOfBirth: '2014-03-12', enrollmentStatus: 'ACTIVE', joinedDate: '2023-06-01', ageGroupLabel: 'Juniors',
    feeGenerationPaused: false,
    address: '', city: '', state: '', zipCode: '',
    emergencyContactName: '', emergencyContactRelationship: '', emergencyContactPhone: '',
    previousExperience: '',
    photoConsent: null, termsAccepted: null
  },
  guardians: [
    { id: 601, firstName: 'Priya', lastName: 'Rao', email: 'priya.rao@example.com', phone: '9876500000', relationship: 'MOTHER', primary: true, linkNotes: '' },
    { id: 602, firstName: 'Vikram', lastName: 'Rao', email: 'vikram.rao@example.com', phone: '9876500001', relationship: 'FATHER', primary: false, linkNotes: '' }
  ],
  notes: [],
  // Issue #66 Phase 2A: one current enrollment, so the End action has
  // something real to act on during a verify-build pass; mutated in place
  // by student-profile-fixture.interceptor.ts's Add/End handlers.
  enrollments: [
    { id: 9101, classId: 1, className: 'Saturday Beginners', danceStyleId: 1, danceStyleName: 'Bharatanatyam',
      feeTierId: null, feeTierLabel: null, status: 'ACTIVE', startDate: '2026-01-15', resolvedFeeAmount: null,
      endDate: null, endReason: null, endReasonDetails: null, rowVersion: 0 }
  ] as Array<{
    id: number; classId: number; className: string; danceStyleId: number; danceStyleName: string;
    feeTierId: number | null; feeTierLabel: string | null; status: string; startDate: string; resolvedFeeAmount: number | null;
    endDate: string | null; endReason: string | null; endReasonDetails: string | null; rowVersion: number;
  }>
};

export type PortalAccessFixtureScenario = 'needsSetup' | 'pendingInvitation' | 'pendingSetup' | 'active' | 'revoked';

interface FixtureTargetStatus {
  accessStatus: 'ACTIVE' | 'REVOKED' | null;
  userId: number | null;
  credentialsEstablished: boolean | null;
  hasLiveInvitation: boolean;
  pendingInvitationEmail: string | null;
}

const NEEDS_SETUP: FixtureTargetStatus = {
  accessStatus: null, userId: null, credentialsEstablished: null, hasLiveInvitation: false, pendingInvitationEmail: null
};

/**
 * Vikram (father) is deliberately fixed at Needs Setup in every scenario --
 * a second, always-present guardian row so multi-row scannability and
 * SELF-vs-GUARDIAN layout can both be reviewed in a single screenshot,
 * without a sixth "mixed" scenario.
 */
function fixtureStatusFor(scenario: PortalAccessFixtureScenario, selfEmail: string, guardianEmail: string) {
  const selfStatus: FixtureTargetStatus = (() => {
    switch (scenario) {
      case 'needsSetup': return NEEDS_SETUP;
      case 'pendingInvitation':
        return { accessStatus: null, userId: null, credentialsEstablished: null, hasLiveInvitation: true, pendingInvitationEmail: selfEmail };
      case 'pendingSetup':
        return { accessStatus: 'ACTIVE', userId: 9001, credentialsEstablished: false, hasLiveInvitation: true, pendingInvitationEmail: selfEmail };
      case 'active':
        return { accessStatus: 'ACTIVE', userId: 9001, credentialsEstablished: true, hasLiveInvitation: false, pendingInvitationEmail: null };
      case 'revoked':
        return { accessStatus: 'REVOKED', userId: 9001, credentialsEstablished: false, hasLiveInvitation: false, pendingInvitationEmail: null };
    }
  })();

  // Priya (mother) mirrors self's exact state, under her own email/userId,
  // so SELF and GUARDIAN can be compared side by side for the same state.
  const guardianStatus: FixtureTargetStatus = { ...selfStatus };
  if (guardianStatus.userId !== null) guardianStatus.userId = 9002;
  if (guardianStatus.pendingInvitationEmail !== null) guardianStatus.pendingInvitationEmail = guardianEmail;

  return { self: selfStatus, mother: guardianStatus };
}

export function fixturePortalAccessStatus(scenario: PortalAccessFixtureScenario) {
  const { self, mother } = fixtureStatusFor(scenario, 'ananya.new-login@example.com', 'priya.new-login@example.com');
  return {
    self,
    guardians: [
      { guardianId: 601, firstName: 'Priya', lastName: 'Rao', relationship: 'MOTHER', status: mother },
      { guardianId: 602, firstName: 'Vikram', lastName: 'Rao', relationship: 'FATHER', status: NEEDS_SETUP }
    ]
  };
}
