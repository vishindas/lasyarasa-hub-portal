export const environment = {
  production: false,
  apiUrl: 'https://app.lasyarasahub.com/api',
  // Slice 12 dormant-deployment gate (architect decision 4): committed
  // false in every environment including production. While false, My
  // Students renders with zero visible/behavioral change and exposes no
  // learning entry point; the routes still compile into the bundle but are
  // reachable only by direct URL, where the backend's own disabled-feature
  // gate (classroom-lite.student-learning-enabled=false) fails safely.
  // Build-time only, per architect instruction -- no runtime config.
  studentLearningEntryEnabled: false
};
