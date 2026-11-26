// Learning guides (sections with typed blocks): their figures show what they say, their 3D views have something to
// play, their teaching colours are never the condition red, and exercises added from a guide stay grouped under it.
import { describe, expect, it } from 'vitest';
import { guides, type GuideBlock } from './index';
import { getRegionDiagram } from '../svg/regions';
import { CLIPS } from '../three/clips';
import { MUSCLE_RIGS } from '../three/rig-data';
import { CONDITION_SCENES } from '../three/scenes';
import { FIGURE_ROLE, VIEWER_ROLE, conditionTeachingHighlights, figureHighlights, viewerHighlights, viewerSource } from '../components/GuideBlocks';
import { menuActions, menuStore } from '../lib/useMenu';

const blocksOf = <K extends GuideBlock['kind']>(kind: K) =>
  guides.flatMap((g) =>
    g.sections.flatMap((s, si) =>
      (s.blocks ?? []).flatMap((b, bi) => (b.kind === kind ? [{ g: g.id, at: `${g.id} §${si + 1} block ${bi + 1}`, b: b as Extract<GuideBlock, { kind: K }> }] : [])),
    ),
  );

describe('guide figures', () => {
  // NOTE: the lowback 'sagittal' view (「横から（骨盤と腰椎）」) is drawn by the 2D builder; until it is registered the
  // hip-pelvis-balance figures on it fail here, as they should.
  it('open on a view their region diagram has', () => {
    const missing = blocksOf('figure')
      .filter(({ b }) => !getRegionDiagram(b.region)?.views.some((v) => v.id === b.view))
      .map(({ at, b }) => `${at}: ${b.region} has no view '${b.view}'`);
    expect(missing).toEqual([]);
  });

  it('highlight only parts that view draws', () => {
    const notDrawn = blocksOf('figure').flatMap(({ at, b }) => {
      const parts = (getRegionDiagram(b.region)?.parts?.[b.view] ?? []) as string[];
      return Object.keys(b.highlights)
        .filter((id) => !parts.includes(id))
        .map((id) => `${at}: ${id} is not drawn in ${b.region}/${b.view}`);
    });
    expect(notDrawn).toEqual([]);
  });

  it('use the teaching colours, never the condition red', () => {
    expect(Object.values(FIGURE_ROLE)).not.toContain('injured');
    expect(Object.values(VIEWER_ROLE)).not.toContain('injured');
    for (const { b } of blocksOf('figure')) expect(Object.values(figureHighlights(b.highlights))).not.toContain('injured');
    for (const { b } of blocksOf('viewer3d')) {
      if (b.highlights) expect(Object.values(viewerHighlights(b.highlights))).not.toContain('injured');
      if (b.condition) expect(Object.values(conditionTeachingHighlights(b.condition))).not.toContain('injured');
    }
  });
});

describe('guide 3D views', () => {
  it('have exactly one source', () => {
    const bad = blocksOf('viewer3d')
      .filter(({ b }) => viewerSource(b) === null || (viewerSource(b) === 'highlights' && !b.focus))
      .map(({ at }) => at);
    expect(bad).toEqual([]);
  });

  it('have something to play: an exercise clip, a muscle demo, a condition scene', () => {
    const missing = blocksOf('viewer3d').flatMap(({ at, b }) => [
      ...(b.exercise && !CLIPS[b.exercise] ? [`${at}: no clip for ${b.exercise}`] : []),
      ...(b.muscle && !MUSCLE_RIGS[b.muscle] ? [`${at}: no rig for ${b.muscle}`] : []),
      ...(b.condition && !CONDITION_SCENES[b.condition] ? [`${at}: no 3D scene for ${b.condition}`] : []),
    ]);
    expect(missing).toEqual([]);
  });

  it('every exercise a guide offers for My Menu has a clip', () => {
    const missing = blocksOf('exercises').flatMap(({ at, b }) => b.ids.filter((e) => !CLIPS[e]).map((e) => `${at}: no clip for ${e}`));
    expect(missing).toEqual([]);
  });
});

describe('exercises added from a guide', () => {
  it('keep the guide as their source (My Menu groups them under it)', () => {
    const list = blocksOf('exercises').find(({ b }) => b.addToMenu);
    if (!list) return;
    const before = menuStore.get();
    try {
      menuStore.set(() => ({ items: [], done: {} }));
      const n = menuActions.addMany(list.b.ids, { guide: list.g });
      expect(n).toBe(new Set(list.b.ids).size);
      expect(menuStore.get().items.every((i) => i.from?.guide === list.g)).toBe(true);
      // adding again adds nothing
      expect(menuActions.addMany(list.b.ids, { guide: list.g })).toBe(0);
    } finally {
      menuStore.set(() => before);
    }
  });
});
