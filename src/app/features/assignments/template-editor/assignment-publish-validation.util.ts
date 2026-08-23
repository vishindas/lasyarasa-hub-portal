import { AssignmentQuestionDTO } from '../data-access/assignment-staff.model';
import { AssignmentUiError } from '../../../core/services/assignment-api-error.util';

/**
 * Mirrors AssignmentTemplateService.validateAnswerKey() and the
 * questions-non-empty check exactly (rasa-ai
 * domain/service/school/assignment/AssignmentTemplateService.java,
 * `publish()` + `validateAnswerKey()`), so the frontend's technical publish
 * gate rejects the same drafts the backend would reject with
 * VALIDATION_FAILED, before ever opening the human-confirmation attestation
 * dialog. Deliberately does not invent any rule beyond what that method
 * actually checks -- there is no backend rule tying maxSelections to option
 * count or correct-answer count at publish time (maxSelections is only
 * constrained at question create/update time by the DB CHECK
 * chk_atq_max_selections_shape: MULTIPLE_CHOICE requires >= 2, every other
 * type requires NULL).
 */
export function validateForPublish(questions: AssignmentQuestionDTO[]): AssignmentUiError | null {
  if (questions.length === 0) {
    return {
      kind: 'validation',
      message: 'A template must have at least one question before it can be published.',
      resource: 'AssignmentTemplateVersion'
    };
  }

  for (const q of questions) {
    if (q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE') {
      if (q.options.length < 2) {
        return {
          kind: 'validation',
          message: `Question ${q.questionOrder} must have at least two options.`,
          resource: 'AssignmentTemplateQuestion'
        };
      }
      const correctCount = q.options.filter(o => o.isCorrect === true).length;
      if (q.questionType === 'SINGLE_CHOICE' && correctCount !== 1) {
        return {
          kind: 'validation',
          message: `Question ${q.questionOrder} (single choice) must have exactly one correct option.`,
          resource: 'AssignmentTemplateQuestion'
        };
      }
      if (q.questionType === 'MULTIPLE_CHOICE' && correctCount < 1) {
        return {
          kind: 'validation',
          message: `Question ${q.questionOrder} (multiple choice) must have at least one correct option.`,
          resource: 'AssignmentTemplateQuestion'
        };
      }
      if (q.questionType === 'MULTIPLE_CHOICE') {
        // Not a backend publish-time check (see header comment) -- a
        // narrow, evidence-backed client-side guard against a student-facing
        // impossibility: maxSelections must be satisfiable against the
        // options actually configured. maxSelections >= 2 itself is already
        // enforced at question create/update time by chk_atq_max_selections_shape.
        if (q.maxSelections != null && q.maxSelections > q.options.length) {
          return {
            kind: 'validation',
            message: `Question ${q.questionOrder} allows selecting more options (${q.maxSelections}) than exist (${q.options.length}).`,
            resource: 'AssignmentTemplateQuestion'
          };
        }
      }
    }
    // SHORT_TEXT / LONG_TEXT: no answer-key validation, matching the backend exactly.
  }

  return null;
}
