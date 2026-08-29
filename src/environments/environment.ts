export const environment = {
  production: false,
  apiUrl: 'https://app.lasyarasahub.com/api',
  // D6 final go-live (2026-08-29): architect-authorized activation.
  // Slice 12's dormant-deployment gate (architect decision 4) held this at
  // false from D1 through the end of D6, deliberately, while the promoted
  // StudentDashboardEntryComponent and the CLIENT account menu were built
  // and verified dormant in production. This is the single, explicit,
  // separately-authorized flip that gate was always waiting for -- normal
  // per-student navigation (single-student direct entry, multi-student
  // selection) is now live for every CLIENT user of every provider. This is
  // the only file that governs it: confirmed empirically before this
  // activation that angular.json has no fileReplacements entry for this
  // project, so environment.prod.ts (kept in sync below, for the reasons
  // documented in its own comment) is never actually substituted by any
  // build configuration, including production -- this file's value is what
  // ships, in every configuration. Build-time only, no runtime config.
  studentLearningEntryEnabled: true
};
