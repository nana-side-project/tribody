import { describe, expect, it } from 'vitest';
import { getCondition } from '../data';
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

  it('reads everyday pain phrasing (膝が痛い, かかとの痛み, 膝痛, 坐骨神経痛)', () => {
    expect(top('膝が痛い', 'condition', 3)).toContain('patellofemoral-pain');
    expect(top('ひざがいたい', 'condition', 3)).toContain('patellofemoral-pain');
    expect(top('膝痛', 'condition', 3)).toContain('patellofemoral-pain');
    expect(top('かかとの痛み', 'condition', 2)).toContain('achilles-insertional');
    expect(top('足裏が痛い', 'condition', 1)).toEqual(['plantar-heel-pain']);
    expect(top('坐骨神経痛', 'condition', 1)).toEqual(['deep-gluteal-syndrome']);
    // a lone pain word next to a body part adds nothing
    expect(top('肩 痛い', 'condition', 4)).toContain('swimmers-shoulder');
    expect(search('痛み').length).toBeGreaterThan(0);
  });

  it('ranks the shoulder conditions for 肩が痛い / 肩痛 (肩 inside 肩甲 = the shoulder blade does not count as 肩)', () => {
    for (const q of ['肩が痛い', '肩痛', 'かたがいたい']) {
      const hits = search(q);
      const ids = hits.map((h) => h.id);
      expect(ids[0]).toBe('swimmers-shoulder');
      const pos = (id: string) => ids.indexOf(id);
      // every other shoulder condition comes before the shoulder-blade names that only start with 肩
      for (const blade of ['scapular-dyskinesis', 'subscapularis', 'levator-scapulae']) {
        expect(pos(blade)).toBeGreaterThan(pos('swimmers-shoulder'));
        expect(pos(blade)).toBeGreaterThan(pos('biceps-tendinopathy'));
      }
      // a pain query lists the conditions before muscles and exercises
      const firstOther = hits.findIndex((h) => h.kind !== 'condition');
      expect(hits.slice(firstOther).some((h) => h.kind === 'condition')).toBe(false);
    }
    // 肩甲 itself still finds the shoulder-blade names first
    expect(top('肩甲', 'muscle', 2).sort()).toEqual(['levator-scapulae', 'subscapularis']);
  });

  it('ranks the knee conditions before exercises for 膝が痛い (a knee posture in an exercise name is not 膝)', () => {
    for (const q of ['膝が痛い', 'ひざがいたい', '膝痛']) {
      const hits = search(q);
      const knee = ['patellofemoral-pain', 'patellar-tendinopathy', 'itb-syndrome', 'pes-anserine-pain'];
      const lastKnee = Math.max(...knee.map((id) => hits.findIndex((h) => h.id === id)));
      expect(knee.every((id) => hits.some((h) => h.id === id))).toBe(true);
      const firstExercise = hits.findIndex((h) => h.kind === 'exercise');
      expect(lastKnee).toBeLessThan(firstExercise);
    }
    // 膝曲げカーフレイズ (a calf exercise done with bent knees) is not the top knee exercise
    expect(top('膝', 'exercise', 1)).not.toEqual(['ex-calf-raise-bent']);
  });

  it('understands もも裏 / 筋トレ / 腹筋', () => {
    expect(top('もも裏', 'condition', 1)).toEqual(['proximal-hamstring-tendinopathy']);
    expect(top('もも裏', 'muscle', 4)).toContain('biceps-femoris');
    // 筋トレ / 補強: strength and isometric exercises, not stretches
    const strength = search('筋トレ', ['exercise']).slice(0, 10);
    expect(strength.length).toBeGreaterThan(5);
    expect(strength.every((h) => /筋力|アイソメトリック/.test(h.sub))).toBe(true);
    expect(top('腹筋', 'muscle', 3).sort()).toEqual(['obliques', 'rectus-abdominis', 'transversus-abdominis']);
  });

  it('does not match a short word inside an unrelated compound (首 ⊂ 足首, 腹筋 ⊂ 腓腹筋)', () => {
    expect(search('首 ストレッチ', ['exercise']).some((h) => /ヒラメ筋|腓腹筋|足底/.test(h.title))).toBe(false);
    expect(search('腹筋').some((h) => h.id === 'gastrocnemius' || h.id === 'ex-gastroc-stretch')).toBe(false);
  });

  it('ranks the rehab of a ligament injury for 靱帯 (not the ITBS rehab by its condition name)', () => {
    const ex = search('靱帯', ['exercise']).slice(0, 3).map((h) => h.id);
    const sprain = getCondition('ankle-sprain');
    expect(ex.every((id) => sprain?.phases.some((p) => p.exercises.includes(id as never)))).toBe(true);
  });
});
