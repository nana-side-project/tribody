// r3 — hip muscles + hip structures.
// Owner after the engine agent: rigging agent r3. See docs/ENGINE.md.
import type { MuscleId, StructureId } from '../../data/registry';
import type { MuscleRig, StructureRig } from './types';

export const muscles: Partial<Record<MuscleId, MuscleRig>> = {
  // SAMPLE — gluteus medius: fan from the outer ilium (below the iliac crest) to the greater trochanter.
  // 5 strands: anterior → posterior fibres. Paths sit ~1 cm lateral of the bone so the tube stays outside the ilium.
  'gluteus-medius': {
    id: 'gluteus-medius',
    strands: [
      {
        name: '前部線維',
        path: [
          { ref: 'pelvis:iliac_crest_ant', off: [0.006, -0.014, -0.006] },
          { bone: 'pelvis', rest: [0.152, 0.982, 0.016] },
          { ref: 'femur:greater_trochanter_ant', off: [0.006, 0.004, 0.0] },
        ],
        radius: 0.013,
        tendon: [0.0, 0.16],
      },
      {
        name: '中部線維（前）',
        path: [
          { ref: 'pelvis:iliac_crest_mid', off: [0.004, -0.013, 0.022] },
          { bone: 'pelvis', rest: [0.158, 0.978, -0.002] },
          { ref: 'femur:greater_trochanter_lat', off: [0.004, 0.008, 0.005] },
        ],
        radius: 0.0155,
        tendon: [0.0, 0.15],
      },
      {
        name: '中部線維',
        path: [
          { ref: 'pelvis:iliac_crest_mid', off: [0.0, -0.013, -0.012] },
          { bone: 'pelvis', rest: [0.155, 0.975, -0.026] },
          { ref: 'femur:greater_trochanter_lat', off: [0.003, 0.006, -0.003] },
        ],
        radius: 0.0155,
        tendon: [0.0, 0.15],
      },
      {
        name: '後部線維（前）',
        path: [
          { ref: 'pelvis:iliac_crest_post', off: [0.026, -0.016, 0.022] },
          { bone: 'pelvis', rest: [0.143, 0.97, -0.05] },
          { ref: 'femur:greater_trochanter_sup', off: [0.007, 0.0, -0.001] },
        ],
        radius: 0.0145,
        tendon: [0.0, 0.17],
      },
      {
        name: '後部線維',
        path: [
          { ref: 'pelvis:gluteal_surface_post', off: [0.012, 0.025, 0.004] },
          { bone: 'pelvis', rest: [0.126, 0.962, -0.068] },
          { ref: 'femur:greater_trochanter_sup', off: [0.003, -0.002, -0.006] },
        ],
        radius: 0.013,
        tendon: [0.0, 0.2],
      },
    ],
    // hip abduction shortens all fibres
    actionPose: { joints: { hip_R: { abd: 35 } } },
    // adduction (leg crossed behind) lengthens them
    stretchPose: { joints: { hip_R: { abd: -24, flex: -8, rot: 8 }, knee_R: { flex: 8 } } },
    camera: 'back',
    focus: 'hip',
  },
};

export const structures: Partial<Record<StructureId, StructureRig>> = {
  // SAMPLE — greater trochanter: bone piece tint + glow spot on its lateral facet.
  'greater-trochanter': {
    id: 'greater-trochanter',
    parts: [
      { type: 'bone', parts: ['greater_trochanter'] },
      { type: 'spot', at: 'femur:greater_trochanter_lat', radius: 0.016 },
    ],
    labelAt: 'femur:greater_trochanter_lat',
    camera: 'iso',
    focus: 'hip',
  },
};
