import { environment as devEnvironment } from './environment';
import { environment as prodEnvironment } from './environment.prod';

/**
 * Slice 12 verification-closure item #5, updated for the D6 go-live: these
 * two imports reference each environment file by its own explicit path (not
 * the replaceable './environment' specifier), so both are read as real
 * committed source regardless of build configuration -- this is what let
 * this project discover, empirically, before the go-live activation, that
 * environment.prod.ts is never actually substituted for environment.ts by
 * any build configuration (angular.json defines no fileReplacements at
 * all for this project). environment.ts alone governs runtime behavior in
 * every configuration, including production; environment.prod.ts is kept
 * in sync for readability only. This test now guards the post-activation
 * state -- both files committing `true` -- the same way it previously
 * guarded the pre-activation dormant state committing `false`.
 */
describe('Student Learning entry gate (architect decision 4) -- both committed environment files', () => {
  it('environment.ts commits studentLearningEntryEnabled: true (D6 go-live)', () => {
    expect(devEnvironment.studentLearningEntryEnabled).toBe(true);
  });

  it('environment.prod.ts commits studentLearningEntryEnabled: true (kept in sync, though unused by any real build)', () => {
    expect(prodEnvironment.studentLearningEntryEnabled).toBe(true);
  });
});
