import { describe, expect, it } from 'vitest';
import { formatIssues, validate } from './validate';

// OWNER=B npm run validate   → only issues owned by B
// STRICT=1                   → warnings also fail
describe('content integrity', () => {
  it('has no errors', () => {
    const owner = process.env.OWNER;
    const all = validate().filter((i) => !owner || i.owner === owner);
    const errors = all.filter((i) => i.level === 'error');
    const warns = all.filter((i) => i.level === 'warn');
    if (warns.length) console.warn(`${warns.length} warnings:\n` + formatIssues(warns));
    if (errors.length) console.error(`${errors.length} errors:\n` + formatIssues(errors));
    expect(errors.length + (process.env.STRICT ? warns.length : 0)).toBe(0);
  });
});
