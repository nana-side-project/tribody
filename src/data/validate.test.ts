import { describe, expect, it } from 'vitest';
import type { Guide } from './types';
import { formatIssues, validate, validateGuides } from './validate';

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

describe('guide checks', () => {
  it('reports blocks that name unknown ids or a 3D view without exactly one source', () => {
    const bad = {
      id: 'hip-pelvis-balance',
      title: 't',
      summary: 's',
      sections: [
        {
          heading: 'h',
          body: ['b'],
          blocks: [
            { kind: 'viewer3d', exercise: 'ex-glute-bridge', muscle: 'iliopsoas' },
            { kind: 'viewer3d' },
            { kind: 'viewer3d', highlights: { iliopsoas: 'focus' } },
            { kind: 'figure', region: 'hip', view: 'front', highlights: { 'not-a-part': 'focus' } },
            { kind: 'exercises', ids: ['ex-glute-bridge', 'ex-glute-bridge'] },
            { kind: 'muscles', ids: [] },
          ],
        },
      ],
      related: { regions: ['nowhere'], conditions: ['hip-impingement'], muscles: ['iliopsoas'] },
    } as unknown as Guide;
    const msgs = validateGuides([bad]).map((i) => i.msg);
    expect(msgs.some((m) => /block 1 .*exactly one source.*exercise, muscle/.test(m))).toBe(true);
    expect(msgs.some((m) => /block 2 .*exactly one source.*none/.test(m))).toBe(true);
    expect(msgs.some((m) => /block 3 .*without focus/.test(m))).toBe(true);
    expect(msgs.some((m) => /not-a-part is not a muscle or structure/.test(m))).toBe(true);
    expect(msgs.some((m) => /listed twice/.test(m))).toBe(true);
    expect(msgs.some((m) => /no muscles/.test(m))).toBe(true);
    expect(msgs.some((m) => /related region nowhere/.test(m))).toBe(true);
    expect(msgs.some((m) => /related (condition|muscle)/.test(m))).toBe(false);
  });

  it('accepts the guides in the content', () => {
    expect(formatIssues(validateGuides().filter((i) => i.level === 'error'))).toBe('');
  });
});
