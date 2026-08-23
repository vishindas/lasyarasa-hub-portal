import { validateForPublish } from './assignment-publish-validation.util';
import { AssignmentQuestionDTO } from '../data-access/assignment-staff.model';

function q(overrides: Partial<AssignmentQuestionDTO>): AssignmentQuestionDTO {
  return {
    id: 1, templateVersionId: 1000, questionType: 'SHORT_TEXT', prompt: 'p',
    questionOrder: 1, maxSelections: null, rowVersion: 0, options: [],
    ...overrides
  };
}

describe('validateForPublish (mirrors AssignmentTemplateService.validateAnswerKey exactly)', () => {
  it('rejects an empty question list', () => {
    const err = validateForPublish([]);
    expect(err?.kind).toBe('validation');
    expect(err?.message).toContain('at least one question');
  });

  it('accepts a single SHORT_TEXT question with no options at all', () => {
    expect(validateForPublish([q({ questionType: 'SHORT_TEXT' })])).toBeNull();
  });

  it('accepts a single LONG_TEXT question with no options at all', () => {
    expect(validateForPublish([q({ questionType: 'LONG_TEXT' })])).toBeNull();
  });

  it('rejects a SINGLE_CHOICE question with fewer than 2 options', () => {
    const err = validateForPublish([q({
      questionType: 'SINGLE_CHOICE',
      options: [{ id: 1, questionId: 1, optionLabel: 'A', optionOrder: 1, isCorrect: true, rowVersion: 0 }]
    })]);
    expect(err?.message).toContain('at least two options');
  });

  it('rejects a SINGLE_CHOICE question with zero correct options', () => {
    const err = validateForPublish([q({
      questionType: 'SINGLE_CHOICE',
      options: [
        { id: 1, questionId: 1, optionLabel: 'A', optionOrder: 1, isCorrect: false, rowVersion: 0 },
        { id: 2, questionId: 1, optionLabel: 'B', optionOrder: 2, isCorrect: false, rowVersion: 0 }
      ]
    })]);
    expect(err?.message).toContain('exactly one correct option');
  });

  it('rejects a SINGLE_CHOICE question with two correct options', () => {
    const err = validateForPublish([q({
      questionType: 'SINGLE_CHOICE',
      options: [
        { id: 1, questionId: 1, optionLabel: 'A', optionOrder: 1, isCorrect: true, rowVersion: 0 },
        { id: 2, questionId: 1, optionLabel: 'B', optionOrder: 2, isCorrect: true, rowVersion: 0 }
      ]
    })]);
    expect(err?.message).toContain('exactly one correct option');
  });

  it('accepts a SINGLE_CHOICE question with exactly one correct option', () => {
    expect(validateForPublish([q({
      questionType: 'SINGLE_CHOICE',
      options: [
        { id: 1, questionId: 1, optionLabel: 'A', optionOrder: 1, isCorrect: true, rowVersion: 0 },
        { id: 2, questionId: 1, optionLabel: 'B', optionOrder: 2, isCorrect: false, rowVersion: 0 }
      ]
    })])).toBeNull();
  });

  it('rejects a MULTIPLE_CHOICE question with zero correct options', () => {
    const err = validateForPublish([q({
      questionType: 'MULTIPLE_CHOICE', maxSelections: 2,
      options: [
        { id: 1, questionId: 1, optionLabel: 'A', optionOrder: 1, isCorrect: false, rowVersion: 0 },
        { id: 2, questionId: 1, optionLabel: 'B', optionOrder: 2, isCorrect: false, rowVersion: 0 }
      ]
    })]);
    expect(err?.message).toContain('at least one correct option');
  });

  it('accepts a MULTIPLE_CHOICE question with at least one correct option', () => {
    expect(validateForPublish([q({
      questionType: 'MULTIPLE_CHOICE', maxSelections: 2,
      options: [
        { id: 1, questionId: 1, optionLabel: 'A', optionOrder: 1, isCorrect: true, rowVersion: 0 },
        { id: 2, questionId: 1, optionLabel: 'B', optionOrder: 2, isCorrect: false, rowVersion: 0 }
      ]
    })])).toBeNull();
  });

  it('rejects MULTIPLE_CHOICE with maxSelections greater than the number of configured options', () => {
    const err = validateForPublish([q({
      questionType: 'MULTIPLE_CHOICE', maxSelections: 3,
      options: [
        { id: 1, questionId: 1, optionLabel: 'A', optionOrder: 1, isCorrect: true, rowVersion: 0 },
        { id: 2, questionId: 1, optionLabel: 'B', optionOrder: 2, isCorrect: false, rowVersion: 0 }
      ]
    })]);
    expect(err?.message).toContain('more options');
  });

  it('reports the first invalid question by its questionOrder', () => {
    const err = validateForPublish([
      q({ id: 1, questionOrder: 1, questionType: 'SHORT_TEXT' }),
      q({ id: 2, questionOrder: 2, questionType: 'SINGLE_CHOICE', options: [] })
    ]);
    expect(err?.message).toContain('Question 2');
  });

  it('accepts a mixed set of all 4 question types when each is individually valid', () => {
    const questions: AssignmentQuestionDTO[] = [
      q({ id: 1, questionOrder: 1, questionType: 'SINGLE_CHOICE', options: [
        { id: 1, questionId: 1, optionLabel: 'A', optionOrder: 1, isCorrect: true, rowVersion: 0 },
        { id: 2, questionId: 1, optionLabel: 'B', optionOrder: 2, isCorrect: false, rowVersion: 0 }
      ] }),
      q({ id: 2, questionOrder: 2, questionType: 'MULTIPLE_CHOICE', maxSelections: 2, options: [
        { id: 3, questionId: 2, optionLabel: 'C', optionOrder: 1, isCorrect: true, rowVersion: 0 },
        { id: 4, questionId: 2, optionLabel: 'D', optionOrder: 2, isCorrect: true, rowVersion: 0 }
      ] }),
      q({ id: 3, questionOrder: 3, questionType: 'SHORT_TEXT' }),
      q({ id: 4, questionOrder: 4, questionType: 'LONG_TEXT' })
    ];
    expect(validateForPublish(questions)).toBeNull();
  });
});
