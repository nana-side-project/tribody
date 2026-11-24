import { describe, expect, it } from 'vitest';
import { exerciseScores, normalize, search } from './search';

const top = (q: string, kind: 'condition' | 'muscle' | 'exercise', n = 3) =>
  search(q, [kind])
    .slice(0, n)
    .map((h) => h.id);

describe('search ranking', () => {
  it('normalises kana, width and 靭/靱', () => {
    expect(normalize('チュウデンキン')).toBe(normalize('ちゅうでんきん'));
    expect(normalize('腸脛靭帯')).toBe(normalize('腸脛靱帯'));
  });

  it('puts direct name matches before target / text matches', () => {
    expect(top('アキレス', 'condition', 2).sort()).toEqual(['achilles-insertional', 'achilles-midportion']);
    // both heel drops are about the Achilles tendon: they come before the calf raises that are only prescribed for it
    expect(top('アキレス', 'exercise', 1)[0]).toMatch(/heel-drop/);
    expect(top('中殿筋', 'muscle', 1)).toEqual(['gluteus-medius']);
  });

  it('understands everyday words (ひざ, かかと, 足裏)', () => {
    expect(top('ひざ', 'condition', 3)).toContain('patellofemoral-pain');
    expect(top('かかと', 'condition', 2)).toContain('achilles-insertional');
    expect(top('足裏', 'condition', 1)).toEqual(['plantar-heel-pain']);
  });

  it('requires every word of the query', () => {
    expect(search('アキレス 存在しない語')).toEqual([]);
    expect([...exerciseScores('').values()].every((s) => s > 0)).toBe(true);
  });
});
