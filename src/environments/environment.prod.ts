export const environment = {
  production: true,
  apiUrl: 'https://app.lasyarasahub.com/api',
  // See environment.ts for the full rationale and the D6 go-live note.
  // Kept in sync with that file's value for consistency and readability --
  // confirmed empirically (a local build with only this file set to true)
  // that this file has NO effect on the actual production build output:
  // angular.json defines no fileReplacements for this project, so no build
  // configuration, including "production", ever substitutes this file for
  // environment.ts. environment.ts alone governs runtime behavior in every
  // configuration. This file's value is intentionally kept truthful/in sync
  // rather than left stale, so it never misleads a future reader into
  // thinking it's the lever to pull.
  studentLearningEntryEnabled: true
};
