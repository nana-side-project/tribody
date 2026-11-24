# TriBody 3D engine — manual for rigging & clip agents

This is the complete reference for writing **muscle strands**, **structures** and **exercise clips** for the
`<AnatomyViewer>` (src/three). Read it top to bottom once; afterwards use it as a lookup.

- Public contract (UI ⇄ engine): `src/three/contract.ts` — **never change it**.
- Lazy wrapper: `src/three/index.tsx` — never change it.
- You only edit **your own data file** (see [Ownership](#1-ownership--files)).
- Dev harness: `/dev/engine.html` (see [Verification loop](#9-verification-loop)).

---

## 0. Concept in one minute

A clean translucent **mannequin** (smooth lofted skin, ~0.25 opacity) contains a simplified **skeleton**.
Muscles are **strands**: tapered tubes that run through named **bony landmarks** (origin → via points →
insertion). Because every point is attached to a bone, posing the skeleton automatically lengthens or
shortens the strands. The strand's *belly* gets thicker and deeper red when it shortens (収縮) and thinner
and lighter when it lengthens (ストレッチ). Tendon parts are cream and keep a fixed length in metres.
Origins get an **orange** marker (`--origin`), insertions a **blue** marker (`--insertion`).

You describe anatomy declaratively (TypeScript data, fully typed); the engine does the rest
(geometry, mirroring to the left side, colours, labels, camera, playback UI).

---

## 1. Ownership & files

| file | owner | contents |
|---|---|---|
| `src/three/rig-data/r1-shoulder.ts` | rigging r1 | shoulder / arm muscles (supraspinatus … triceps) + shoulder & neck structures |
| `src/three/rig-data/r2-trunk-thigh.ts` | rigging r2 | trunk / neck muscles (deep-neck-flexors, erector-spinae, multifidus, transversus-abdominis, obliques, rectus-abdominis, quadratus-lumborum) + thigh muscles (rectus-femoris, vasti, hamstrings) + spine structures (thoracic/cervical/lumbar spine, disc, SI joint, thoracolumbar fascia) + knee structures |
| `src/three/rig-data/r3-hip.ts` | rigging r3 | hip muscles (gluteals, piriformis, iliopsoas, TFL, adductors, gracilis, sartorius) + hip structures |
| `src/three/rig-data/r4-leg-foot.ts` | rigging r4 | leg / foot muscles (gastrocnemius, soleus, tibialis anterior/posterior, fibularis, FHL, abductor hallucis, FDB) + calf / ankle / foot structures |
| `src/three/clips/k1-upper-core.ts` | clip k1 | shoulder / neck / core exercises (owner A + E in the registry) |
| `src/three/clips/k2-hip.ts` | clip k2 | hip exercises (owner B) |
| `src/three/clips/k3-knee-foot.ts` | clip k3 | knee exercises (owner C except calf ones) + foot exercises (`ex-short-foot`, `ex-plantar-fascia-stretch`, `ex-towel-heel-raise`) |
| `src/three/clips/k4-calf-ankle.ts` | clip k4 | calf exercises (`ex-calf-raise-*`, `ex-isometric-calf-hold`, `ex-gastroc-stretch`, `ex-soleus-stretch`, `ex-tibialis-raise`, `ex-pogo-hops`) + ankle exercises (owner D except the 3 foot ones) |
| `rig-data/index.ts`, `clips/index.ts`, `rig-data/types.ts`, `clips/types.ts` | engine | merge files & types — don't edit |
| everything else in `src/three/` | engine | rig, landmarks, renderer… |

`/dev/engine.html?coverage=1` lists every MuscleId / StructureId / ExerciseId, whether it is rigged, and
**which file owns it**. Samples (keep them working, you may refine them): `supraspinatus`,
`subacromial-bursa` (r1) · `iliotibial-band`, `patellar-tendon` (r2) · `gluteus-medius`, `greater-trochanter`
(r3) · `gastrocnemius`, `soleus`, `achilles-tendon` (r4) · `ex-band-er` (k1) · `ex-glute-bridge`,
`ex-clamshell` (k2) · `ex-calf-raise-straight` (k4).

Each file exports exactly:

```ts
// rig-data/rN-*.ts
export const muscles: Partial<Record<MuscleId, MuscleRig>> = { … };
export const structures: Partial<Record<StructureId, StructureRig>> = { … };
// clips/kN-*.ts
export const clips: Partial<Record<ExerciseId, Clip>> = { … };
```

Missing rigs / clips are fine: the viewer shows the base pose and a small 「準備中」 note — it never crashes.
A bad landmark name only produces a console warning (`[tribody] gluteus-maximus strand 2 point 1: unknown
landmark "pelvis:sacrum" (did you mean sacrum_post, …?)`) and that strand is skipped.

---

## 2. Coordinate system

- Units: **metres**. Adult ~1.75 m. Floor: `y = 0`.
- **Y up**, the figure **faces +Z**, the figure's **LEFT is +X** (its right side is −X).
- Every segment frame is axis-aligned with the world in the **reference pose** (all DOFs 0 = anatomical
  position: standing, arms at the sides, palms forward). This is also where **L0** (rest length) is measured.
- **Rest coordinates** (used for landmarks, `{ bone, rest }` points, ring tables…) are written
  **lateral-positive**: `[lat, y, z]` where `lat` = distance from the midline (+ = lateral). The engine uses
  `x = −lat` on the right, `x = +lat` on the left. `y` = height above the floor in the reference pose,
  `z` = + anterior / − posterior.

### Segments

The rig is a tree rooted at the pelvis. Limb segments exist as `_R` / `_L`.

```
pelvis ─ lumbar ─ thorax ─ neck ─ head
                     └─ clavicle_S ─ scapula_S ─ humerus_S ─ forearm_S ─ hand_S      (S = R | L)
pelvis ─ femur_S ─ tibia_S ─ foot_S ─ toes_S
            └─ patella_S  (driven by knee flexion — slides down the trochlea)
```

`clavicle` is an internal sub-frame of the shoulder girdle: its public bone name is **`scapula`**
(`scapula:sc_joint`, `scapula:clavicle_mid` … ride the clavicle; `clavicle:…` works as an alias).

Segment origins (rest, lateral-positive):

| segment | origin [lat, y, z] | anatomical point |
|---|---|---|
| `pelvis` | 0, 0.92, 0 | midpoint of the hip joint centres |
| `lumbar` | 0, 1.012, -0.04 | L5/S1 |
| `thorax` | 0, 1.158, -0.047 | T12/L1 |
| `neck` | 0, 1.453, -0.028 | C7/T1 |
| `head` | 0, 1.585, -0.005 | atlanto-occipital joint |
| `clavicle` | 0.022, 1.43, 0.062 | sternoclavicular joint (girdle sub-frame) |
| `scapula` | 0.175, 1.448, -0.012 | acromioclavicular joint (girdle) |
| `humerus` | 0.175, 1.405, -0.008 | glenohumeral centre |
| `forearm` | 0.195, 1.085, -0.015 | elbow centre |
| `hand` | 0.24, 0.835, 0 | wrist centre |
| `femur` | 0.085, 0.92, 0 | hip joint centre |
| `patella` | 0.09, 0.528, 0.048 | patella centre (knee straight) |
| `tibia` | 0.088, 0.49, 0 | knee centre |
| `foot` | 0.09, 0.08, -0.005 | ankle (talocrural) centre |
| `toes` | 0.09, 0.016, 0.13 | MTP line |

---

## 3. Joints, DOFs and sign conventions

All angles in **degrees**, identical anatomical meaning on both sides (the rig mirrors internally).

| joint key | DOFs | + means |
|---|---|---|
| `lumbar`, `thorax`, `neck`, `head` | `flex`, `lat`, `rot` | flex + = forward bend (− = extension); lat + = side-bend toward the figure's **right**; rot + = turn toward the **right** |
| `scapula` | `elev`, `protr`, `upRot` | elev + = shrug; protr + = protraction (forward around the chest); upRot + = upward rotation (glenoid turns up) |
| `shoulder` | `flex`, `abd`, `rot` | flex + = arm forward/up; abd + = arm sideways/up; rot + = **external** rotation |
| `elbow` | `flex` | + = bend |
| `forearm` | `sup` | + = toward supination. **0 = anatomical (palm forward, fully supinated)**, −90 = thumb-up neutral, −150…−170 = pronated (palm back / down) |
| `wrist` | `flex` | + = palmar flexion, − = extension |
| `hip` | `flex`, `abd`, `rot` | flex + = thigh forward; abd + = thigh outward; rot + = **external** rotation |
| `knee` | `flex` | + = bend |
| `ankle` | `dorsi`, `inv` | dorsi + = dorsiflexion (toes up), − = plantarflexion; inv + = inversion (sole turns in) |
| `toes` | `ext` | + = toe extension (toes up relative to the foot) |

**Keys**: `hip` (no suffix) = **both** sides; `hip_R` / `hip_L` = one side. Axial joints have no suffix.
Types are strict — `{ knee_R: { abd: 10 } }` is a type error.

```ts
const pose: Pose = {
  root: { pos: [0, 0.92, 0], rot: [0, 0, 0] },     // optional
  joints: { hip_R: { flex: 30, rot: 10 }, knee: { flex: 20 }, ankle: { dorsi: -15 } },
};
```

### Euler orders

- **Spine** segments: intrinsic `flex` (X) → `lat` (Z) → `rot` (Y).
- **Shoulder & hip**: intrinsic **flex → abd → rot**: first flex about the transverse axis, then abduct about
  the (rotated) AP axis, then rotate about the bone's own long axis.
  - With flex = 0, `abd` is pure frontal-plane abduction. With flex = 90 (arm/thigh forward), `abd` swings
    it **horizontally** (+ = horizontal abduction, − = horizontal adduction / across the body).
  - `rot` is always about the humerus / femur long axis, so it never moves the elbow / knee position.
- **Shoulder angles are relative to the THORAX**, not to the scapula. The arm ends up where you say; the
  shoulder girdle moves by itself (see *Automatic couplings*). Use scapula DOFs only for deliberate shrug,
  retraction (protr −) / protraction (protr +) or extra upward rotation.
- **Forearm**: elbow `flex` then `sup` about the forearm axis. **Ankle**: `dorsi` then `inv` about the foot's long axis.
- **Root**: `pos` = pelvis origin (midpoint of the hip joint centres) in metres; `rot` = `[x, y, z]` degrees
  applied as **R = Ry(y) · Rx(x) · Rz(z)** (three.js Euler `'YXZ'`): heading, then pitch, then roll.
  `rot: [-90, 0, 0]` = lying supine (head toward −Z); `[90, 0, 0]` = prone (head toward +Z);
  `[0, 0, -90]` = lying on the LEFT side (head toward +X, front still facing +Z).

### Worked examples (shoulder, right side)

| goal | joints |
|---|---|
| arm straight overhead | `shoulder_R: { flex: 170 }` |
| arm out to the side at shoulder height | `shoulder_R: { abd: 90 }` |
| cross-body stretch (arm across the chest) | `shoulder_R: { flex: 90, abd: -40 }` |
| swim glide (arm reaching forward overhead, prone) | `SWIM` base already has `shoulder_R: { flex: 172, abd: 4 }, forearm_R: { sup: -150 }` |
| swim catch (high elbow, forearm vertical to the pool floor) on `SWIM` | `shoulder_R: { flex: 0, abd: 160, rot: -15 }, elbow_R: { flex: 100 }, forearm_R: { sup: -120 }` — raising the arm by **abduction** keeps the elbow crease facing anterior, so the elbow bends toward the pool floor |
| 90° abducted external rotation ("90/90") | `shoulder_R: { abd: 90, rot: 90 }, elbow_R: { flex: 90 }, forearm_R: { sup: -90 }` |
| band external rotation at the side | `shoulder_R: { abd: 10, rot: -15 → 55 }, elbow_R: { flex: 90 }, forearm_R: { sup: -85 }` |
| hand behind the back (Apley) | `shoulder_R: { flex: -35, abd: -12, rot: -75 }, elbow_R: { flex: 95 }` |
| push-up plus (protraction) | `scapula: { protr: 25 }` on top of a plank / push-up pose |
| shrug | `scapula: { elev: 25 }` |

Hip / leg:

| goal | joints |
|---|---|
| knee to chest | `hip_R: { flex: 120 }, knee_R: { flex: 130 }` |
| standing hip abduction | `hip_R: { abd: 35 }` |
| figure-4 start (supine, right shin across the body) | `hip_R: { flex: 70, abd: 30, rot: 45 }, knee_R: { flex: 100 }` + bend the left leg (`hip_L: { flex: 60 }, knee_L: { flex: 90 }`) and fine-tune with `?j=` |
| calf raise with the toes kept flat | `ankle: { dorsi: -34 }, toes: { ext: 34 }` + anchor on `toes:toes_mid` |
| heel drop off a step | `ankle: { dorsi: 28 }, toes: { ext: -28 }` on `STAND_STEP` |
| clamshell "open" (side-lying, hips 48° / knees 88°) | `hip_R: { flex: 42.5, abd: 25.0, rot: 23.9 }` — a 35° turn about the hip–heel axis from the clamshell's resting top leg (`hip_R.abd −1.3`, knees stacked on the re-grounded side-lying pose): heels stay together, the knee rises ~19 cm |

**Because `rot` is applied after `flex` and `abd`, one arm/leg orientation can need a surprising `rot`**
(e.g. with the arm raised by **flexion** to 170° the elbow crease faces backward, so bending the elbow folds the
forearm behind the head; raised by **abduction** to 160° the crease faces forward — that is the swim catch). Always check combined positions with
`?pose=…&j=…` before writing them into a rig or clip.

Tip: combined movements (like the clamshell) are rotations about *some* axis; solving them by hand is hard.
It is fine to compute DOFs numerically (e.g. a small esbuild/node script using `solveFK` from `src/three/rig.ts`
in your scratchpad) and paste the numbers with a comment, as the sample does.

### Limits

Values outside are clamped (and logged once to the console):

| joint | DOF | range |
|---|---|---|
| `lumbar` | `flex` | -35 … 60 |
| `lumbar` | `lat` | -35 … 35 |
| `lumbar` | `rot` | -15 … 15 |
| `thorax` | `flex` | -30 … 45 |
| `thorax` | `lat` | -30 … 30 |
| `thorax` | `rot` | -45 … 45 |
| `neck` | `flex` | -60 … 50 |
| `neck` | `lat` | -40 … 40 |
| `neck` | `rot` | -75 … 75 |
| `head` | `flex` | -30 … 30 |
| `head` | `lat` | -20 … 20 |
| `head` | `rot` | -20 … 20 |
| `scapula` | `elev` | -15 … 45 |
| `scapula` | `protr` | -30 … 35 |
| `scapula` | `upRot` | -20 … 60 |
| `shoulder` | `flex` | -65 … 185 |
| `shoulder` | `abd` | -60 … 185 |
| `shoulder` | `rot` | -95 … 105 |
| `elbow` | `flex` | -5 … 150 |
| `forearm` | `sup` | -175 … 10 |
| `wrist` | `flex` | -85 … 85 |
| `hip` | `flex` | -35 … 135 |
| `hip` | `abd` | -35 … 55 |
| `hip` | `rot` | -50 … 65 |
| `knee` | `flex` | -5 … 155 |
| `ankle` | `dorsi` | -60 … 35 |
| `ankle` | `inv` | -30 … 35 |
| `toes` | `ext` | -40 … 95 |

### Automatic couplings

- **Scapulohumeral rhythm** (`RIG_OPTIONS.autoScapula`, on): arm elevation *e* (angle from hanging) adds
  `upRot = clamp(0.22·(e − 30°), 0, 30°)` and `protr = 0.3 · upRot`. Upward rotation pivots about the
  scapular-plane normal through the middle of the scapular spine; the clavicle re-aims so the AC joint stays
  connected (→ natural clavicle elevation). Your explicit scapula DOFs are **added** on top.
- **Shoulder girdle model** (`RIG_OPTIONS`): `protr` / `elev` turn the **clavicle** about the sternoclavicular joint;
  the scapula hangs at its AC end and
  - **slides up / down** with `elev` (it turns with only `elevRot` = 20 % of the clavicle's elevation): a shrug
    lifts the scapula ~5 cm, a depression lowers it, the inferior angle no longer swings sideways;
  - **turns 65 %** (`protrRot`) with protraction, so the medial border glides ~1 cm over the ribs instead of winging
    off them (`protr: 25` moves the medial border ~5 cm laterally);
  - **retraction saturates** (`retractR` 15): effective angle = −15·tanh(−protr / 15) → −10 ≈ −8.7°, −20 ≈ −13°,
    −30 ≈ −14.5°; the medial border stops ~3 cm from the spinous processes (−20 used to move it 6 cm, onto the
    spine). Retraction values beyond −20 add almost nothing: for a visible squeeze use `protr` −12…−15 together with
    `elev` −5…−6 (band row, prone Y-T-W).
  - Pectoralis minor depresses / protracts / downwardly rotates the scapula, so `elev` < 0 or `upRot` < 0 SHORTEN it:
    a pec-minor stretch needs retraction plus extra `upRot` (posterior tilt), not "back and down" (doorway stretch).
  - In arm-elevation drills (wall slide) the automatic protraction (0.3·upRot) already lengthens the middle / lower
    trapezius; keep explicit `protr` small and add a little depression if the trapezius is a target that should not
    look stretched.
  Values for the scapula landmarks per pose: `node shots/eng-verify-motion/probe/run.mjs
  /home/user/forclaude/shots/qa3-fix-body/probe/girdle.ts`.
- **Patella** glides from the trochlea onto the condyles: its centre moves on an arc around the condyles and tilts
  ~0.6 × knee flexion. The tilt per knee angle (`PAT_TILT` in rig.ts) was solved so the **patellar tendon keeps
  its rest length** (apex → tibial tuberosity) at every knee angle — so `patella:*` landmarks stay on the femur and
  a quadriceps / patellar-tendon strand never stretches unrealistically. Patella landmarks ride the patella frame.

---

## 4. Base poses

`base` of a clip / muscle rig. Exported as `BASE_POSES` from `src/three/rig.ts` (each has a Japanese
description, default camera, grounding and default props). Look at them: `/dev/engine.html?pose=NAME`.

| name | what it looks like | placement | default props | camera |
|---|---|---|---|---|
| `STAND` | 立位 | lowest skin point → y=0 | — | iso |
| `SUPINE` | 仰向け（頭は −Z 方向）; arms by the sides, palms down on the floor | lowest skin point → y=0 | — | iso |
| `PRONE` | うつ伏せ（頭は +Z 方向） | lowest skin point → y=0 | — | iso |
| `SIDE_LYING` | 横向き（左側が下・右側が上、頭は +X 方向）; roll −81.9°, hips 40° / knees 60°, bottom hip adducted 5.6°, the top leg rests on the bottom one (`hip_R.abd −2.2`), head on the pillow (`neck.lat −19`), bottom forearm on the floor | lowest skin point → y=0 | pillow (head) | front |
| `QUADRUPED` | 四つ這い（手と膝をつく、頭は +Z 方向）; = the k1 clips' solved `QUAD` | lowest skin point → y=0 | — | iso |
| `HALF_KNEEL` | 片膝立ち（右膝が床、左足が前） | lowest skin point → y=0 | — | right |
| `LONG_SIT` | 長座（床に座り脚を伸ばす） | lowest skin point → y=0 | — | right |
| `SIT_CHAIR` | 椅子座位; arms hanging, hands holding the side edges of the seat | lowest skin point → y=0 | chair | iso |
| `PLANK` | プランク（前腕とつま先で支える） | lowest skin point → y=0 | — | right |
| `SIDE_PLANK` | サイドプランク（左前腕で支える） | lowest skin point → y=0 | — | front |
| `STAND_STEP` | 段差の縁に前足部で立つ（かかとは段差の外）; the step edge is 0.5 cm behind the MTP axis | lowest skin point → y=0.15, anchor `toes:toes_mid` (xyz) | step | right |
| `BIKE` | ロードバイク乗車姿勢（ブラケットを握る） | root as written | bike | right |
| `SWIM` | スイム（うつ伏せ水平・右腕を前に伸ばす） | lowest skin point → y=0.04 | — | iso |

Notes: `SUPINE` head is toward −Z; `PRONE`, `QUADRUPED`, `PLANK` head toward +Z; `SIDE_LYING` / `SIDE_PLANK`
head toward +X with the front facing +Z (so the default front camera sees the figure from the front).
`ANATOMICAL` = all zeros (the L0 reference). Contacts were solved numerically: in SUPINE the back of the head,
upper back, sacrum, heels and the hands (fingers 0 mm, palm heel 3.5 mm) touch (hip −2°, neck −8°); in PRONE the chest
and pelvis touch with the thighs and the tops of the feet ~2 cm above (the face is just off the floor); in QUADRUPED the
fingers / palms, toes and knees (5 mm) touch; in SIDE_LYING the bottom shoulder, hip, foot (knee 1 cm) and the head on
its pillow (4 mm in); in PLANK forearms and toes, in HALF_KNEEL the right knee + toes and the left foot. A **pillow that
comes with a base pose** (SIDE_LYING) is in every clip on that base — don't add another one; tune the clip's `neck.lat`
so the head rests on it (`side-clip.ts` below). The STAND_STEP step edge sits just behind the ball of the foot, so heel
drops (dorsiflexion about the toes) leave the forefoot on the edge (qa3-fix-clips; the edge used to be 3.5 cm further
back and the calf-stretch demo's foot sank 8 mm into it).

**Grounding = what you see.** `lowest skin point` is taken over every skin shape (`SKIN_SHAPES` in rig.ts). Since
qa3-fix-body the knees (femoral condyles, kneecap, upper tibia) and the buttocks are drawn shapes too, so a kneeling
knee, a seated or long-sitting pelvis and the forefoot sole (ball of the foot under the metatarsal heads, on the
`toes` segment) touch visibly where the figure is grounded (they used to hover 1–2 cm: the lofted rings were smaller
than the grounding shapes there). Visible-skin contacts per clip / base pose:
`node shots/eng-verify-motion/probe/run.mjs /home/user/forclaude/shots/qa3-fix-body/probe/contacts.ts out.json`
(+ `cmp-contacts.mjs base.json out.json` to compare two trees). SIT_CHAIR's thighs are still ~3 cm above the seat (the
drawn buttocks are the seated contact; lowering the knees would move every SIT_CHAIR demo / close-up camera).
The **exercise mat is 8 mm thick** (top at y 0.008) while `ground: true` puts the lowest point at y 0, so a body part
0–8 mm "above the floor" in the probes visually rests on the mat (the figure sinks into the soft mat); use
`ground: 0.008` only when the figure should stand on top of it (half-kneeling).

---

## 5. Landmarks & attachment refs

### Ref syntax (`AttachRef`)

```ts
'femur:greater_trochanter'                               // landmark; side from context (right for rigs)
'pelvis:asis_L' / 'femur_L:medial_epicondyle'            // explicit side. In a right-side muscle this means
                                                         // "contralateral"; mirroring swaps it too.
{ ref: 'pelvis:iliac_crest_mid', off: [0.012, -0.03, 0.02] }  // landmark + offset [lat, y, z] in the bone frame
{ bone: 'femur', rest: [0.168, 0.76, 0.0] }              // any point rigidly on a bone, in REST coords
{ mix: ['femur_R:medial_epicondyle', 'femur_L:medial_epicondyle'], t: 0.5 }  // world-space blend (can span bones)
{ mix: [a, b], t: 0.5, off: [0, 0.01, -0.004] }          // + offset [lat, y, z] in the FIRST point's bone frame
```

- Midline landmarks (marked ·mid below, `lat = 0`) have no side. Bilateral landmarks on midline bones
  (pelvis, lumbar, thorax, neck, head) get `_R` / `_L` variants automatically.
- `off` is lateral-positive like everything else (`+lat` = more lateral on either side).
- `{ bone, rest }` is the workhorse for **via points**: read the rest coordinates of nearby landmarks from
  the table, pick a point outside the bone surface, done. It stays rigid on that bone.
- A **mix of the same rest point on two neighbouring bones** spreads a joint's motion: the rig bends the whole lumbar
  spine at L5/S1 and the whole thoracic spine at T12/L1, so e.g. a point on L3 is
  `{ mix: [{ bone: 'pelvis', rest: P }, { bone: 'lumbar', rest: P }], t: 0.55 }` (erector spinae, multifidus and
  quadratus lumborum do this; a rigid lumbar point stretches short trunk muscles ~2× in a side bend).
- Landmarks sit on the modelled bone surface (+ ~2–3 mm): `node shots/eng-verify-motion/probe/run.mjs
  /home/user/forclaude/shots/qa3-fix-body/probe/lmbone.ts [regex] [thr]` lists the distance of each landmark to its
  bone. Some are intentionally off-bone: `foot:calcaneus_plantar` / `arch_mid` (sole / heel pad), `pelvis:iliac_fossa`
  (inside the basin), spinal `body_*` / `lamina_*` (muscle-side points), `thorax:rib6_ant` / `costal_margin` (front of
  the cartilages).
- Turn on `?debug=1` to see every landmark as a blue dot (names shown near the view centre, or all names of
  one bone with `&lm=femur`).

### Landmark table

269 landmarks. Coordinates are rest `[lat, y, z]` (m).

#### `pelvis`

| landmark | rest [lat, y, z] | description |
|---|---|---|
| `asis` | 0.120, 1.000, 0.065 | 上前腸骨棘 ASIS (sartorius, TFL) |
| `aiis` | 0.103, 0.968, 0.058 | 下前腸骨棘 AIIS (rectus femoris straight head) |
| `iliac_crest_ant` | 0.135, 1.045, 0.038 | 腸骨稜 前部 (obliques, TFL) |
| `iliac_crest_mid` | 0.142, 1.070, -0.012 | 腸骨稜 中部・腸骨結節 (obliques, QL lateral) |
| `iliac_crest_post` | 0.092, 1.066, -0.068 | 腸骨稜 後部 (QL, lats, erector) |
| `iliac_fossa` | 0.085, 1.015, 0.020 | 腸骨窩（内面） (iliacus) |
| `gluteal_surface_ant` | 0.135, 1.010, 0.020 | 腸骨外面 前部 (gluteus minimus / medius anterior) |
| `gluteal_surface_mid` | 0.132, 1.015, -0.030 | 腸骨外面 中部 (gluteus medius) |
| `gluteal_surface_post` | 0.098, 1.000, -0.072 | 腸骨外面 後部 (gluteus medius posterior, gluteus maximus) |
| `psis` | 0.045, 1.018, -0.092 | 上後腸骨棘 PSIS |
| `sacrum_post` ·mid | 0.000, 0.968, -0.098 | 仙骨後面（正中仙骨稜） (multifidus, gluteus maximus) |
| `sacrum_post_lat` | 0.030, 0.955, -0.096 | 仙骨後面 外側 (gluteus maximus, piriformis area) |
| `sacrum_ant` | 0.022, 0.975, -0.060 | 仙骨前面 (piriformis origin) |
| `sacral_promontory` ·mid | 0.000, 1.006, -0.046 | 仙骨岬角 |
| `coccyx` ·mid | 0.000, 0.885, -0.080 | 尾骨 |
| `ischial_tuberosity` | 0.062, 0.835, -0.035 | 坐骨結節 (hamstrings, adductor magnus) |
| `ischial_spine` | 0.045, 0.882, -0.058 | 坐骨棘 |
| `ischial_ramus` | 0.048, 0.840, -0.005 | 坐骨枝 (adductor magnus) |
| `pubic_tubercle` | 0.030, 0.893, 0.070 | 恥骨結節 (adductor longus, inguinal ligament) |
| `pubic_body` | 0.020, 0.880, 0.066 | 恥骨体 (adductor longus, gracilis) |
| `pubic_crest` | 0.015, 0.897, 0.072 | 恥骨稜 (rectus abdominis) |
| `inferior_pubic_ramus` | 0.035, 0.853, 0.045 | 恥骨下枝 (gracilis, adductor magnus) |
| `superior_pubic_ramus` | 0.055, 0.905, 0.058 | 恥骨上枝 (pectineus) |
| `acetabulum` | 0.085, 0.920, 0.000 | 寛骨臼（股関節中心） |
| `acetabulum_rim_sup` | 0.105, 0.948, 0.005 | 寛骨臼上縁（関節唇） |
| `acetabulum_rim_ant` | 0.092, 0.925, 0.032 | 寛骨臼前縁（関節唇） |
| `pubic_symphysis` ·mid | 0.000, 0.886, 0.070 | 恥骨結合 |
| `sacroiliac_joint` | 0.040, 0.990, -0.075 | 仙腸関節 |
| `greater_sciatic_notch` | 0.070, 0.930, -0.060 | 大坐骨切痕 (piriformis exits, sciatic nerve) |
| `ilium_inner_post` | 0.060, 1.035, -0.070 | 腸骨内面 後部 (iliolumbar ligament area) |

#### `lumbar`

| landmark | rest [lat, y, z] | description |
|---|---|---|
| `spinous_L1` ·mid | 0.000, 1.145, -0.101 | L1 棘突起 |
| `transverse_L1` | 0.045, 1.145, -0.076 | L1 横突起 (QL, psoas, multifidus) |
| `body_L1` | 0.024, 1.145, -0.032 | L1 椎体 前外側 (psoas) |
| `lamina_L1` | 0.014, 1.145, -0.089 | L1 椎弓・乳頭突起 (multifidus) |
| `spinous_L2` ·mid | 0.000, 1.115, -0.099 | L2 棘突起 |
| `transverse_L2` | 0.045, 1.115, -0.068 | L2 横突起 (QL, psoas, multifidus) |
| `body_L2` | 0.024, 1.115, -0.024 | L2 椎体 前外側 (psoas) |
| `lamina_L2` | 0.014, 1.115, -0.081 | L2 椎弓・乳頭突起 (multifidus) |
| `spinous_L3` ·mid | 0.000, 1.085, -0.095 | L3 棘突起 |
| `transverse_L3` | 0.045, 1.085, -0.062 | L3 横突起 (QL, psoas, multifidus) |
| `body_L3` | 0.024, 1.085, -0.018 | L3 椎体 前外側 (psoas) |
| `lamina_L3` | 0.014, 1.085, -0.075 | L3 椎弓・乳頭突起 (multifidus) |
| `spinous_L4` ·mid | 0.000, 1.056, -0.095 | L4 棘突起 |
| `transverse_L4` | 0.045, 1.056, -0.062 | L4 横突起 (QL, psoas, multifidus) |
| `body_L4` | 0.024, 1.056, -0.018 | L4 椎体 前外側 (psoas) |
| `lamina_L4` | 0.014, 1.056, -0.075 | L4 椎弓・乳頭突起 (multifidus) |
| `spinous_L5` ·mid | 0.000, 1.028, -0.098 | L5 棘突起 |
| `transverse_L5` | 0.045, 1.028, -0.068 | L5 横突起 (QL, psoas, multifidus) |
| `body_L5` | 0.024, 1.028, -0.024 | L5 椎体 前外側 (psoas) |
| `lamina_L5` | 0.014, 1.028, -0.081 | L5 椎弓・乳頭突起 (multifidus) |
| `disc_L4_L5` ·mid | 0.000, 1.042, -0.028 | L4/L5 椎間板 |
| `disc_L5_S1` ·mid | 0.000, 1.014, -0.036 | L5/S1 椎間板 |

#### `thorax`

| landmark | rest [lat, y, z] | description |
|---|---|---|
| `spinous_T1` ·mid | 0.000, 1.445, -0.085 | T1 棘突起 (trapezius, rhomboids, lats) |
| `transverse_T1` | 0.034, 1.445, -0.065 | T1 横突起 |
| `body_T1` | 0.018, 1.445, -0.018 | T1 椎体 前外側 |
| `spinous_T2` ·mid | 0.000, 1.425, -0.098 | T2 棘突起 (trapezius, rhomboids, lats) |
| `transverse_T2` | 0.035, 1.425, -0.075 | T2 横突起 |
| `body_T2` | 0.018, 1.425, -0.028 | T2 椎体 前外側 |
| `spinous_T3` ·mid | 0.000, 1.402, -0.108 | T3 棘突起 (trapezius, rhomboids, lats) |
| `transverse_T3` | 0.035, 1.402, -0.083 | T3 横突起 |
| `body_T3` | 0.018, 1.402, -0.036 | T3 椎体 前外側 |
| `spinous_T4` ·mid | 0.000, 1.378, -0.115 | T4 棘突起 (trapezius, rhomboids, lats) |
| `transverse_T4` | 0.036, 1.378, -0.090 | T4 横突起 |
| `body_T4` | 0.018, 1.378, -0.043 | T4 椎体 前外側 |
| `spinous_T5` ·mid | 0.000, 1.353, -0.116 | T5 棘突起 (trapezius, rhomboids, lats) |
| `transverse_T5` | 0.036, 1.353, -0.095 | T5 横突起 |
| `body_T5` | 0.018, 1.353, -0.048 | T5 椎体 前外側 |
| `spinous_T6` ·mid | 0.000, 1.327, -0.118 | T6 棘突起 (trapezius, rhomboids, lats) |
| `transverse_T6` | 0.037, 1.327, -0.098 | T6 横突起 |
| `body_T6` | 0.018, 1.327, -0.051 | T6 椎体 前外側 |
| `spinous_T7` ·mid | 0.000, 1.300, -0.120 | T7 棘突起 (trapezius, rhomboids, lats) |
| `transverse_T7` | 0.038, 1.300, -0.099 | T7 横突起 |
| `body_T7` | 0.018, 1.300, -0.052 | T7 椎体 前外側 |
| `spinous_T8` ·mid | 0.000, 1.273, -0.120 | T8 棘突起 (trapezius, rhomboids, lats) |
| `transverse_T8` | 0.038, 1.273, -0.099 | T8 横突起 |
| `body_T8` | 0.018, 1.273, -0.052 | T8 椎体 前外側 |
| `spinous_T9` ·mid | 0.000, 1.247, -0.119 | T9 棘突起 (trapezius, rhomboids, lats) |
| `transverse_T9` | 0.039, 1.247, -0.097 | T9 横突起 |
| `body_T9` | 0.018, 1.247, -0.050 | T9 椎体 前外側 |
| `spinous_T10` ·mid | 0.000, 1.222, -0.117 | T10 棘突起 (trapezius, rhomboids, lats) |
| `transverse_T10` | 0.039, 1.222, -0.094 | T10 横突起 |
| `body_T10` | 0.018, 1.222, -0.047 | T10 椎体 前外側 |
| `spinous_T11` ·mid | 0.000, 1.197, -0.112 | T11 棘突起 (trapezius, rhomboids, lats) |
| `transverse_T11` | 0.040, 1.197, -0.090 | T11 横突起 |
| `body_T11` | 0.018, 1.197, -0.043 | T11 椎体 前外側 |
| `spinous_T12` ·mid | 0.000, 1.172, -0.107 | T12 棘突起 (trapezius, rhomboids, lats) |
| `transverse_T12` | 0.041, 1.172, -0.085 | T12 横突起 |
| `body_T12` | 0.018, 1.172, -0.038 | T12 椎体 前外側 |
| `rib1_lat` | 0.056, 1.428, 0.032 | 第1肋骨 外側面 |
| `rib2_lat` | 0.082, 1.387, 0.039 | 第2肋骨 外側面 |
| `rib3_lat` | 0.106, 1.357, 0.033 | 第3肋骨 外側面 |
| `rib4_lat` | 0.122, 1.328, 0.029 | 第4肋骨 外側面 |
| `rib5_lat` | 0.134, 1.298, 0.024 | 第5肋骨 外側面 |
| `rib6_lat` | 0.143, 1.269, 0.020 | 第6肋骨 外側面 |
| `rib7_lat` | 0.149, 1.240, 0.014 | 第7肋骨 外側面 |
| `rib8_lat` | 0.148, 1.211, 0.007 | 第8肋骨 外側面 |
| `rib9_lat` | 0.148, 1.186, 0.001 | 第9肋骨 外側面 |
| `rib10_lat` | 0.144, 1.168, -0.011 | 第10肋骨 外側面 |
| `rib11_lat` | 0.134, 1.160, -0.036 | 第11肋骨 外側面 |
| `rib1_ant` | 0.035, 1.413, 0.060 | 第1肋骨 前端（胸骨柄の外側） (subclavius, scalenes area) |
| `rib3_ant` | 0.079, 1.346, 0.067 | 第3肋骨 前面 (pectoralis minor) |
| `rib4_ant` | 0.089, 1.314, 0.074 | 第4肋骨 前面 (pectoralis minor) |
| `rib5_ant` | 0.095, 1.280, 0.078 | 第5肋骨 前面 (pectoralis minor) |
| `rib6_ant` | 0.085, 1.270, 0.100 | 第6肋骨 前面 (pectoralis major lower fibres, rectus) |
| `costal_cartilage_5_7` | 0.062, 1.246, 0.104 | 第5〜7肋軟骨 (rectus abdominis insertion) |
| `costal_margin` | 0.105, 1.200, 0.085 | 肋骨弓 (external oblique, transversus) |
| `rib12_post` | 0.075, 1.142, -0.098 | 第12肋骨 下縁 (quadratus lumborum) |
| `rib_angle_6` | 0.060, 1.300, -0.118 | 第6肋骨角（背面） (iliocostalis) |
| `sternum_manubrium` ·mid | 0.000, 1.412, 0.076 | 胸骨柄 (pectoralis major clavicular/sternal) |
| `sternum_body` ·mid | 0.000, 1.330, 0.094 | 胸骨体 (pectoralis major sternal) |
| `xiphoid` ·mid | 0.000, 1.244, 0.095 | 剣状突起 (rectus abdominis) |
| `clavicle_notch` ·mid | 0.000, 1.438, 0.070 | 頸切痕（胸骨上縁） |
| `sternum_lat` | 0.018, 1.360, 0.092 | 胸骨外側縁 (pectoralis major) |

#### `neck`

| landmark | rest [lat, y, z] | description |
|---|---|---|
| `body_C1` | 0.008, 1.575, 0.012 | C1 椎体 前面 (deep neck flexors) |
| `transverse_C1` | 0.036, 1.575, -0.008 | C1 横突起 (levator scapulae, scalenes) |
| `body_C2` | 0.008, 1.555, 0.012 | C2 椎体 前面 (deep neck flexors) |
| `spinous_C2` ·mid | 0.000, 1.555, -0.056 | C2 棘突起 |
| `transverse_C2` | 0.026, 1.555, -0.008 | C2 横突起 (levator scapulae, scalenes) |
| `body_C3` | 0.008, 1.535, 0.012 | C3 椎体 前面 (deep neck flexors) |
| `spinous_C3` ·mid | 0.000, 1.535, -0.050 | C3 棘突起 |
| `transverse_C3` | 0.026, 1.535, -0.008 | C3 横突起 (levator scapulae, scalenes) |
| `body_C4` | 0.008, 1.515, 0.010 | C4 椎体 前面 (deep neck flexors) |
| `spinous_C4` ·mid | 0.000, 1.515, -0.050 | C4 棘突起 |
| `transverse_C4` | 0.026, 1.515, -0.010 | C4 横突起 (levator scapulae, scalenes) |
| `body_C5` | 0.008, 1.497, 0.006 | C5 椎体 前面 (deep neck flexors) |
| `spinous_C5` ·mid | 0.000, 1.497, -0.053 | C5 棘突起 |
| `transverse_C5` | 0.026, 1.497, -0.014 | C5 横突起 (levator scapulae, scalenes) |
| `body_C6` | 0.008, 1.479, 0.000 | C6 椎体 前面 (deep neck flexors) |
| `spinous_C6` ·mid | 0.000, 1.479, -0.060 | C6 棘突起 |
| `transverse_C6` | 0.026, 1.479, -0.020 | C6 横突起 (levator scapulae, scalenes) |
| `body_C7` | 0.008, 1.462, -0.008 | C7 椎体 前面 (deep neck flexors) |
| `spinous_C7` ·mid | 0.000, 1.462, -0.076 | C7 棘突起 |
| `spinous_C1` ·mid | 0.000, 1.575, -0.045 | C1 後結節 |

#### `head`

| landmark | rest [lat, y, z] | description |
|---|---|---|
| `occiput` ·mid | 0.000, 1.625, -0.084 | 外後頭隆起 |
| `nuchal_line_sup` | 0.040, 1.625, -0.075 | 上項線 (trapezius upper fibres) |
| `nuchal_line_inf` | 0.030, 1.605, -0.070 | 下項線 (suboccipitals, semispinalis) |
| `mastoid` | 0.052, 1.600, -0.024 | 乳様突起 (SCM) |
| `skull_base_ant` | 0.010, 1.598, 0.002 | 後頭骨底部 前面 (longus capitis) |
| `vertex` ·mid | 0.000, 1.750, 0.000 | 頭頂 |
| `chin` ·mid | 0.000, 1.528, 0.075 | おとがい |

#### `scapula`

| landmark | rest [lat, y, z] | description |
|---|---|---|
| `sc_joint` | 0.022, 1.430, 0.062 | 胸鎖関節 |
| `clavicle_medial` | 0.038, 1.436, 0.062 | 鎖骨 内側1/3 (SCM, pectoralis major clavicular) |
| `clavicle_mid` | 0.100, 1.446, 0.050 | 鎖骨 中央 |
| `clavicle_lateral` | 0.160, 1.452, 0.008 | 鎖骨 外側1/3 (deltoid anterior, trapezius) |
| `acromion` | 0.192, 1.452, -0.006 | 肩峰 外側端 (deltoid middle, trapezius) |
| `acromion_ant` | 0.188, 1.448, 0.012 | 肩峰 前縁 (coracoacromial arch) |
| `acromion_under` | 0.180, 1.438, -0.004 | 肩峰 下面 (subacromial space) |
| `coracoid` | 0.150, 1.418, 0.035 | 烏口突起 (pec minor, biceps short head) |
| `spine_medial` | 0.075, 1.382, -0.106 | 肩甲棘 内側端（棘三角） |
| `spine_mid` | 0.120, 1.410, -0.088 | 肩甲棘 中央 (deltoid posterior, trapezius) |
| `spine_lateral` | 0.165, 1.437, -0.050 | 肩甲棘 外側 |
| `supraspinous_fossa` | 0.108, 1.425, -0.080 | 棘上窩 (supraspinatus) |
| `infraspinous_fossa` | 0.110, 1.330, -0.084 | 棘下窩 (infraspinatus) |
| `subscapular_fossa` | 0.108, 1.335, -0.072 | 肩甲下窩（前面） (subscapularis) |
| `superior_angle` | 0.077, 1.435, -0.090 | 上角 (levator scapulae) |
| `medial_border_mid` | 0.083, 1.333, -0.100 | 内側縁 中央 (rhomboids, serratus anterior) |
| `inferior_angle` | 0.086, 1.236, -0.104 | 下角 (serratus, teres major) |
| `lateral_border` | 0.112, 1.300, -0.077 | 外側縁 (teres minor, teres major) |
| `glenoid` | 0.153, 1.405, -0.023 | 関節窩 |
| `supraglenoid_tubercle` | 0.155, 1.430, -0.006 | 関節上結節 (biceps long head) |
| `infraglenoid_tubercle` | 0.150, 1.376, -0.022 | 関節下結節 (triceps long head) |

#### `humerus`

| landmark | rest [lat, y, z] | description |
|---|---|---|
| `head` | 0.175, 1.406, -0.008 | 上腕骨頭 |
| `greater_tubercle_sup` | 0.193, 1.424, 0.000 | 大結節 上面 (supraspinatus) |
| `greater_tubercle_mid` | 0.200, 1.405, -0.013 | 大結節 中面 (infraspinatus) |
| `greater_tubercle_inf` | 0.196, 1.384, -0.022 | 大結節 下面 (teres minor) |
| `lesser_tubercle` | 0.178, 1.395, 0.022 | 小結節 (subscapularis) |
| `bicipital_groove` | 0.190, 1.385, 0.020 | 結節間溝 (biceps long head tendon) |
| `crest_greater_tubercle` | 0.196, 1.330, 0.016 | 大結節稜 (pectoralis major) |
| `crest_lesser_tubercle` | 0.183, 1.340, 0.012 | 小結節稜 (latissimus, teres major) |
| `deltoid_tuberosity` | 0.207, 1.270, 0.000 | 三角筋粗面 |
| `shaft_post_mid` | 0.190, 1.250, -0.019 | 上腕骨後面 中央 (triceps medial/lateral heads) |
| `shaft_post_prox` | 0.198, 1.330, -0.018 | 上腕骨後面 上部 (triceps lateral head) |
| `shaft_ant_dist` | 0.192, 1.160, 0.010 | 上腕骨前面 下部 (brachialis) |
| `lateral_epicondyle` | 0.226, 1.093, -0.015 | 外側上顆 (wrist extensors) |
| `medial_epicondyle` | 0.155, 1.093, -0.020 | 内側上顆 (wrist flexors) |

#### `forearm`

| landmark | rest [lat, y, z] | description |
|---|---|---|
| `radial_tuberosity` | 0.205, 1.053, 0.006 | 橈骨粗面 (biceps) |
| `ulna_tuberosity` | 0.190, 1.058, 0.004 | 尺骨粗面 (brachialis) |
| `olecranon` | 0.186, 1.098, -0.040 | 肘頭 (triceps) |
| `ulna_mid` | 0.205, 0.965, -0.016 | 尺骨 中央 |
| `radius_mid` | 0.228, 0.965, 0.002 | 橈骨 中央 |
| `radius_distal` | 0.262, 0.842, 0.002 | 橈骨 遠位端（茎状突起） |
| `ulna_distal` | 0.218, 0.842, -0.010 | 尺骨 遠位端（尺骨頭） |

#### `hand`

| landmark | rest [lat, y, z] | description |
|---|---|---|
| `palm` | 0.246, 0.775, 0.016 | 手掌 中央（グリップ点） |
| `knuckles` | 0.248, 0.735, -0.004 | MP関節 背側 |
| `fingertips` | 0.254, 0.665, 0.012 | 指先 |

#### `femur`

| landmark | rest [lat, y, z] | description |
|---|---|---|
| `head` | 0.085, 0.920, 0.000 | 大腿骨頭 |
| `neck` | 0.110, 0.905, 0.005 | 大腿骨頸部 |
| `greater_trochanter` | 0.152, 0.905, -0.010 | 大転子 外側の頂点 |
| `greater_trochanter_ant` | 0.148, 0.905, 0.012 | 大転子 前面 (gluteus minimus) |
| `greater_trochanter_lat` | 0.160, 0.896, -0.006 | 大転子 外側面 (gluteus medius) |
| `greater_trochanter_sup` | 0.143, 0.925, -0.014 | 大転子 上後面 (gluteus medius posterior, piriformis) |
| `trochanteric_fossa` | 0.128, 0.912, -0.020 | 転子窩 (deep rotators) |
| `lesser_trochanter` | 0.097, 0.855, -0.012 | 小転子 (iliopsoas) |
| `intertrochanteric_line` | 0.125, 0.885, 0.020 | 転子間線 (vastus medialis origin) |
| `gluteal_tuberosity` | 0.137, 0.830, -0.020 | 殿筋粗面 (gluteus maximus) |
| `shaft_ant_prox` | 0.118, 0.820, 0.020 | 大腿骨前面 上部 (vastus intermedius) |
| `shaft_lat_prox` | 0.138, 0.852, 0.004 | 大腿骨外側 上部 (vastus lateralis) |
| `shaft_med_prox` | 0.102, 0.840, 0.012 | 大腿骨内側 上部 (vastus medialis) |
| `shaft_ant_mid` | 0.110, 0.700, 0.024 | 大腿骨前面 中央 |
| `linea_aspera_prox` | 0.125, 0.800, -0.018 | 粗線 上部 (adductors, vastus) |
| `linea_aspera_mid` | 0.111, 0.700, -0.013 | 粗線 中央 (adductor longus/magnus, biceps short head) |
| `linea_aspera_dist` | 0.099, 0.600, -0.016 | 粗線 下部 (adductor magnus) |
| `adductor_tubercle` | 0.058, 0.540, -0.010 | 内転筋結節 (adductor magnus) |
| `lateral_epicondyle` | 0.132, 0.515, -0.004 | 外側上顆 (ITB passes over, LCL) |
| `medial_epicondyle` | 0.046, 0.515, -0.004 | 内側上顆 (MCL) |
| `lateral_condyle_post` | 0.118, 0.522, -0.030 | 外側顆 後上部 (gastrocnemius lateral head) |
| `medial_condyle_post` | 0.060, 0.522, -0.030 | 内側顆 後上部 (gastrocnemius medial head) |
| `trochlear_groove` | 0.090, 0.512, 0.032 | 滑車溝（膝蓋大腿関節） |
| `popliteal_surface` | 0.090, 0.545, -0.024 | 膝窩面 (plantaris) |
| `condyle_lat_dist` | 0.115, 0.490, 0.000 | 外側顆 遠位（脛骨関節面） |
| `condyle_med_dist` | 0.065, 0.490, 0.000 | 内側顆 遠位（脛骨関節面） |

#### `patella`

| landmark | rest [lat, y, z] | description |
|---|---|---|
| `base` | 0.090, 0.552, 0.047 | 膝蓋骨底（上縁） (quadriceps tendon) |
| `apex` | 0.090, 0.505, 0.050 | 膝蓋骨尖（下縁） (patellar tendon) |
| `center` | 0.090, 0.528, 0.056 | 膝蓋骨 前面中央 |
| `medial` | 0.070, 0.530, 0.048 | 膝蓋骨 内側縁 (vastus medialis) |
| `lateral` | 0.110, 0.530, 0.048 | 膝蓋骨 外側縁 (vastus lateralis) |
| `articular` | 0.090, 0.528, 0.038 | 膝蓋骨 関節面（軟骨） |

#### `tibia`

| landmark | rest [lat, y, z] | description |
|---|---|---|
| `tibial_tuberosity` | 0.090, 0.448, 0.034 | 脛骨粗面 (patellar tendon) |
| `pes_anserinus` | 0.074, 0.432, 0.015 | 鵞足（脛骨内側上部） (sartorius, gracilis, semitendinosus) |
| `gerdy_tubercle` | 0.114, 0.462, 0.026 | ガーディー結節 (iliotibial band) |
| `medial_condyle` | 0.054, 0.474, 0.000 | 脛骨内側顆 |
| `medial_condyle_post` | 0.060, 0.468, -0.022 | 脛骨内側顆 後面 (semimembranosus) |
| `lateral_condyle` | 0.122, 0.474, 0.000 | 脛骨外側顆 |
| `plateau` | 0.088, 0.484, 0.000 | 脛骨高原（半月板） |
| `fibular_head` | 0.126, 0.455, -0.022 | 腓骨頭 (biceps femoris, LCL, soleus) |
| `soleal_line` | 0.082, 0.420, -0.026 | ヒラメ筋線 (soleus) |
| `posterior_prox` | 0.092, 0.440, -0.026 | 脛骨後面 上部 (popliteus, tib post) |
| `interosseous_mid` | 0.105, 0.300, -0.010 | 骨間膜 中央 (tibialis posterior) |
| `medial_border_mid` | 0.070, 0.280, 0.000 | 脛骨内側縁 中央 (soleus, MTSS) |
| `medial_border_dist` | 0.068, 0.170, 0.000 | 脛骨内側縁 遠位1/3 (MTSS) |
| `anterior_crest_mid` | 0.086, 0.300, 0.020 | 脛骨前縁 中央（すね） |
| `anterior_lat_prox` | 0.103, 0.415, 0.020 | 脛骨外側面 上部 (tibialis anterior) |
| `anterior_lat_mid` | 0.100, 0.320, 0.017 | 脛骨外側面 中央 (tibialis anterior) |
| `fibula_lat_prox` | 0.132, 0.400, -0.020 | 腓骨外側 上部 (fibularis longus) |
| `fibula_lat_mid` | 0.127, 0.270, -0.022 | 腓骨外側 中央〜下部 (fibularis brevis) |
| `fibula_post_mid` | 0.117, 0.260, -0.030 | 腓骨後面 中央〜下部 (flexor hallucis longus) |
| `fibula_post_prox` | 0.122, 0.420, -0.030 | 腓骨後面 上部 (soleus) |
| `medial_malleolus` | 0.062, 0.072, 0.002 | 内果 |
| `lateral_malleolus` | 0.118, 0.060, -0.020 | 外果 |
| `retro_medial_malleolus` | 0.064, 0.078, -0.022 | 内果の後方 (tibialis posterior / FHL tendons) |
| `retro_lateral_malleolus` | 0.122, 0.068, -0.040 | 外果の後方 (fibularis tendons) |
| `distal_ant` | 0.088, 0.110, 0.022 | 脛骨遠位 前面 (extensor retinaculum) |
| `distal_post` | 0.088, 0.110, -0.022 | 脛骨遠位 後面 |

#### `foot`

| landmark | rest [lat, y, z] | description |
|---|---|---|
| `calcaneus_post` | 0.090, 0.034, -0.071 | 踵骨隆起 後面 (Achilles insertion) |
| `calcaneus_post_sup` | 0.090, 0.056, -0.060 | 踵骨 後上部 (retrocalcaneal bursa) |
| `calcaneus_plantar_medial` | 0.080, 0.018, -0.040 | 踵骨隆起 内側突起 (plantar fascia, abductor hallucis, FDB) |
| `calcaneus_plantar` | 0.090, 0.006, -0.030 | 踵骨 足底面（踵の脂肪体） |
| `calcaneus_lat` | 0.114, 0.030, -0.034 | 踵骨 外側面 (CFL) |
| `sustentaculum_tali` | 0.066, 0.048, -0.012 | 載距突起 (FHL groove, spring ligament) |
| `talus` | 0.090, 0.066, 0.004 | 距骨 滑車 |
| `talus_neck_lat` | 0.110, 0.058, 0.025 | 距骨頸 外側 (ATFL) |
| `navicular_tuberosity` | 0.062, 0.047, 0.056 | 舟状骨粗面 (tibialis posterior) |
| `medial_cuneiform_plantar` | 0.066, 0.024, 0.086 | 内側楔状骨 足底 (tib post, fib longus, tib ant) |
| `medial_cuneiform_dorsal` | 0.064, 0.050, 0.082 | 内側楔状骨 内背側 (tibialis anterior) |
| `cuboid_groove` | 0.114, 0.020, 0.050 | 立方骨 長腓骨筋腱溝 |
| `first_met_base` | 0.066, 0.030, 0.096 | 第1中足骨底 (fibularis longus, tib ant) |
| `fifth_met_base` | 0.127, 0.022, 0.061 | 第5中足骨底（粗面） (fibularis brevis) |
| `met_head_1` | 0.064, 0.013, 0.140 | 第1中足骨頭（母趾球） |
| `met_head_2` | 0.080, 0.012, 0.142 | 第2中足骨頭 |
| `met_head_3` | 0.095, 0.012, 0.134 | 第3中足骨頭 |
| `met_head_5` | 0.125, 0.012, 0.114 | 第5中足骨頭（小趾球） |
| `met_2_3_shaft` | 0.088, 0.030, 0.110 | 第2・3中足骨 骨幹（疲労骨折の好発部位） |
| `interspace_3_4` | 0.102, 0.012, 0.130 | 第3–4趾間（モートン病） |
| `arch_mid` | 0.075, 0.028, 0.040 | 内側縦アーチ 中央（足底） |
| `dorsum_mid` | 0.088, 0.062, 0.070 | 足背 中央 |

#### `toes`

| landmark | rest [lat, y, z] | description |
|---|---|---|
| `hallux_distal` | 0.062, 0.011, 0.188 | 母趾 末節骨底 (FHL) |
| `hallux_prox` | 0.064, 0.012, 0.158 | 母趾 基節骨 (abductor hallucis) |
| `toes_mid` | 0.095, 0.011, 0.162 | 第2〜4趾 中節骨（FDB停止・接地点） |
| `toe_tips` | 0.095, 0.009, 0.185 | 趾先 |

---

## 6. Writing muscle strands (`MuscleRig`)

```ts
import type { MuscleRig } from './types';

'gluteus-medius': {
  id: 'gluteus-medius',
  strands: [
    {
      name: '中部線維',                                    // optional, shown in debug
      path: [
        { ref: 'pelvis:iliac_crest_mid', off: [0.0, -0.013, -0.012] },   // origin (orange marker)
        { bone: 'pelvis', rest: [0.155, 0.975, -0.026] },                 // via point: keeps it outside the ilium
        { ref: 'femur:greater_trochanter_lat', off: [0.003, 0.006, -0.003] }, // insertion (blue marker)
      ],
      radius: 0.0155,          // belly radius at rest (m)
      tendon: [0.0, 0.15],     // fractions of the rest length that are tendon at [origin, insertion]
    },
    // … more strands for a fan
  ],
  actionPose: { joints: { hip_R: { abd: 35 } } },                 // muscle SHORT
  stretchPose: { joints: { hip_R: { abd: -24, flex: -8, rot: 8 } } }, // muscle LONG
  camera: 'back',              // preset, { dir: [x,y,z] } or { position, target }
  focus: 'hip',                // RegionId for framing
},
```

Fields: `strands`, `actionPose`, `stretchPose` (required); `base` (default `'STAND'`), `restPose` (on top of
the base, e.g. bent knees), `camera`, `focus`, `anchor`, `ground`, `props` (same meaning as in clips).

**Always define the RIGHT side.** The left side is mirrored automatically.

### Paths & via points

- Order: **origin → via points → insertion** (2–7 points). The curve is a centripetal Catmull-Rom through
  all points, so via points are passed through exactly.
- Put via points where the real muscle **wraps** around bone or changes direction: under the acromion
  (supraspinatus — the via point belongs to the **scapula**, the "roof" the tendon slides under), behind the medial malleolus
  (tibialis posterior, attach to the **tibia**), under the cuboid (fibularis longus, attach to the **foot**),
  around the greater trochanter, in front of the hip joint (iliopsoas over the pubic ramus, on the **pelvis**).
- Attach each via point to the bone it wraps around — then the path is right in every pose.
- **Caution with via points on the moving bone right next to the joint centre** (e.g. on top of the humeral
  head): the point swings with the bone and, at large angles, ends up *behind* the previous point, so the path
  kinks and the length barely changes. Prefer the fixed "pulley" bone (acromion → scapula, malleolus → tibia,
  trochlea → femur). Always check the three demo poses in `?debug=1` (belly change ±10–35 %).
- Keep the tube **outside** the bone: offset the path by about the strand radius from the bone surface.
- Two-joint muscles must cross both joints: e.g. gastrocnemius starts on the **femur** condyles and runs via
  points on the **tibia** to the **foot** (calcaneus).

### Radius guide (belly radius at rest)

| muscle size | radius (m) | examples |
|---|---|---|
| tiny / deep | 0.004 – 0.007 | deep neck flexors, rotator-cuff slips, FDB slips |
| small | 0.007 – 0.011 | supraspinatus, teres minor, piriformis, tibialis posterior |
| medium | 0.011 – 0.016 | gluteus medius strands, biceps brachii, soleus strands, vastus medialis |
| large | 0.016 – 0.024 | gastrocnemius heads, vastus lateralis, rectus femoris, gluteus maximus strands |
| huge | 0.024 – 0.03 | (rarely: one strand standing for a whole quadriceps head) |

Belly radius is multiplied at runtime by `clamp(sqrt(L0_belly / L_belly), 0.65, 1.5)`.

### Fans and broad muscles

Use **several strands** (3–8) spread over the origin area converging on the insertion: gluteus medius 5,
gluteus maximus 5–6, deltoid 3 (anterior / middle / posterior) – 5, pectoralis major 4–5 (clavicular → sternal
→ abdominal), trapezius 4–6 (upper / middle / lower), latissimus 4–5, serratus anterior 1 per digitation
(ribs 1–9 → medial border), obliques 3–4, erector spinae 3 columns. Slightly vary radius per strand.
For a sheet that should look flat (aponeurosis, fascia-like muscle), add `flat: { width, normal }`.

### Tendon fractions

`tendon: [atOrigin, atInsertion]`, fractions of the **rest** length. The tendon keeps its length in metres
when the pose changes; only the belly shortens/lengthens. Guide: fleshy origin `0`; supraspinatus insertion
0.3; gastrocnemius `[0.05, 0.47]` (Achilles); soleus `[0.04, 0.3]`; biceps femoris `[0.12, 0.25]`; tibialis
posterior `[0.05, 0.45]`; FHL `[0.05, 0.5]`; rectus femoris `[0.1, 0.2]`; long-tendon forearm-type
muscles 0.4–0.5 at the insertion.

### actionPose / stretchPose

- Both are applied on top of `base` (+ `restPose`), on the right side unless you use both-side keys.
- `actionPose` = the muscle's main **concentric action** (shortens). `stretchPose` = the classic stretch
  (lengthens). Pick clear, safe, everyday positions (the 2D content describes the same movements).
- **Two-joint muscles**: shorten across both joints for the action if natural (hamstrings: knee flex + hip
  extension), stretch across both (hamstrings: hip flex with knee straight).
- Choose a base where the moving limb is free: standing hip abduction is fine on `STAND`; calf work on
  `STAND_STEP` (heel raise / heel drop with the toes anchored); quadriceps in `PRONE` or `STAND`; hip
  flexors in `HALF_KNEEL`; rotator cuff in `STAND`.
- **Make the movement visible.** A rotation about a straight limb's own axis shows almost nothing (the piriformis demo
  used to spin a straight standing leg: identical silhouettes, feet out of frame). Bend the next joint so a segment
  swings: hip rotators on `PRONE` with `restPose` knee 90 (the shin swings like a wiper — the piriformis demo; keep
  the hip near neutral, its rotation action reverses in deep flexion), shoulder rotators with the elbow at 90.
- Strands that lie entirely on one rigid segment never change length (the cervical spine is one segment from C7/T1
  to C0/C1, the lumbar spine one from L5/S1 to T12/L1): give their points a `{ mix }` of the same rest point on the
  segment below and on their own segment, `t` ≈ the point's height fraction along the segment (longus colli upper
  oblique: C4 0.47, C2 0.73).
- A muscle whose main action has no skeletal motion (transversus abdominis: drawing-in) can show its shortening with
  a substitute movement, but then say so: `actionLabel` / `stretchLabel` replace the phase labels of the demo (≤ 14
  characters), e.g. TrA `actionLabel: '収縮：ひねると短くなる'` with a modest 30° twist.
- Verify the numbers: `/dev/engine.html?muscle=<id>&debug=1` prints
  `rest 1.000 → action 0.765 (belly 0.721) / stretch 1.141 (belly 1.168)  OK ✓`. **Both must pass** (action
  shorter, stretch longer than rest). Aim for a belly change of ±10–35 %.
- Demo timeline (auto-built): rest → action (label 「収縮：筋が短くなる」 or `actionLabel`, hold) → rest → stretch
  (label 「ストレッチ：筋が伸びる」 or `stretchLabel`, hold) → rest, 7 s loop. Peaks are at `t = 0.2` (action) and
  `t = 0.7` (stretch).

### Colours & roles (automatic)

Belly colour: `--muscle` (vivid for primary) → deeper red when short, `--muscle-light` when long. Tendons
`--tendon`. Roles (`Highlight3DRole`): `primary` vivid + slight emissive · `secondary` lighter · `injured`
red-orange (`--injured`) with a pulsing glow halo · `involved` amber · `selected` brighter emissive.
`injured` and `involved` keep their hue at every length (a stretched injured muscle stays red, a stretched involved
one stays amber — never salmon / pink): only their lightness follows the length (shorter a little deeper, longer a
little lighter in the light theme / more muted in the dark theme); thickness shows the rest.
The colour always follows the **current** belly ratio (the strand is measured first, then coloured), also for a
single `setTime()` frame. Flat strands (`flat: {…}`) are shaded with a gently curved normal across their width, so a
sheet at rest looks like the round strands next to it (not uniformly dark = "contracted").
Non-scope muscles are hidden (`?all=1` shows every rigged muscle faintly).

---

## 7. Structures (`StructureRig`)

```ts
'achilles-tendon': {
  id: 'achilles-tendon',
  parts: [{ type: 'tendon', path: [{ bone: 'tibia', rest: [0.09, 0.25, -0.05] }, { bone: 'tibia', rest: [0.09, 0.115, -0.05] },
                                    { ref: 'foot:calcaneus_post', off: [0, 0.006, -0.002] }],
            radius: 0.005, flat: { width: 0.016, normal: 'posterior' } }],
  camera: 'isoBack', focus: 'ankle',
},
```

| part `type` | fields | look |
|---|---|---|
| `tendon`, `ligament` | `path`, `radius`, `flat?` | cream cord / band |
| `fascia` | `path`, `radius` (thickness), `flat: { width, normal }` | wide translucent cream sheet (ITB, plantar fascia, thoracolumbar fascia) |
| `nerve` | `path`, `radius` (~0.003–0.005) | thin yellow cord (sciatic, interdigital); where muscles or bones hide it, a see-through copy keeps it visible (any mode; drawn only where something is in front of it) |
| `bursa` | `at`, `radii: [lat, y, z]`, `off?` | soft blue ellipsoid oriented with `at`'s bone |
| `cartilage`, `fatpad` | `at`, `radii`, `off?` | pale cushion (labrum, meniscus, disc, PF cartilage, heel fat pad) |
| `spot` | `at`, `radius` | glow sphere on a bony point or joint (greater trochanter, joint line, medial tibial border, stress-fracture site). A spot is a **lesion marker**: drawn only when the structure is `injured` (then 1.45 × `radius`, the brightest red of the view) or when the structure has nothing else; on a merely `involved` structure (the tibia in shin splints) it is hidden, so it never reads as a focal injury |
| `bone` | `parts: BonePartId[]` | tints whole bone pieces (injured without a spot: strong red; injured with a spot, or involved: lighter, so the spot / the injured soft tissue stays the strongest colour): `tibia`, `fibula`, `calcaneus`, `talus`, `navicular`, `metatarsals`, `patella`, `scapula`, `acromion`, `humeral_head`, `greater_trochanter`, `femoral_head`, `thoracic`, `cervical`, `lumbar`, `discs`, `sacrum`, `ilium`, `ischial_tuberosity`, `pubic_symphysis`, `lateral_epicondyle`, `medial_malleolus`, `lateral_malleolus` … (see `skeleton-parts.ts`) |

Mix parts freely (e.g. `greater-trochanter` = `bone` tint + `spot`). `labelAt?: AttachRef` sets the label
anchor; `base`, `camera`, `focus` are used when the structure is shown on its own (highlights without a teaching
scene, or a scene with `camera: 'rig'` — see below). Flat `normal` is a bone-frame direction:
`lateral | medial | anterior | posterior | superior | inferior` of the **first** path point's bone.

### Condition & region pages: teaching scenes (`scenes.ts`)

Condition pages pass `condition={id}` with their `highlights`; region pages pass `focus` + their key muscles. In
highlights mode the engine then uses a **scene** from `src/three/scenes.ts` (`CONDITION_SCENES[id]`, else
`REGION_SCENES[focus]` when there is no condition). Exercise and muscle pages never use scenes.

What the app passes (src/pages): a condition page maps each `involved` part to `injured` (roles injured / irritated /
compressed) or `involved` (the rest), in that order — the part whose role is `injured` comes first in the object, so it
is the first injured part the engine sees. A region page passes its key muscles as `secondary` (muscle colour — amber
means 「関係」 on condition pages) and the one the user taps in the chip row under the viewer as `selected`; when that
muscle lies outside the region's crop (its data names other regions, or `BELLY_ELSEWHERE` in RegionPage.tsx, e.g.
大腿筋膜張筋 on the knee page) the page passes that muscle's first region as `focus` instead.

```ts
'itb-syndrome': {
  base: 'STAND',
  joints: { hip_R: { flex: 20 }, knee_R: { flex: 30 } },          // the posture the text talks about
  camera: { dir: [-1, 0.12, 0.12] },                               // preset | { dir } (fitted) | 'rig'
  frame: ['femur:lateral_epicondyle', 'tibia:gerdy_tubercle', …],  // the crop (right side unless _L)
  minSize: 0.22,
  fade: { 'iliotibial-band': 0.35 },                               // superficial tissue drawn translucent
  minor: ['tensor-fasciae-latae', 'gluteus-medius', 'gluteus-maximus'],  // labels start in 「+N」
},
```

| field | meaning |
|---|---|
| `base`, `joints` | base pose + joint changes (default base: the injured structure rig's `base`, else `STAND`) |
| `camera` | preset or `{ dir }`, fitted to the crop. `'rig'` = the injured structure rig's own camera as authored (its exact close-ups were made for condition pages). A **muscle** rig's exact camera is never used in highlights mode (it belongs to that muscle's demo): only its direction, fitted |
| `frame` | crop points. Without `frame`: the injured parts + the focus region's landmarks (`REGION_POINTS`). Involved context parts **never widen the frame**: they may run off the card (their label sits on a visible bit, or goes into 「+N」, see Labels) |
| `frameInjured` | also frame the injured parts (default: `true` without `frame`, `false` with it) |
| `minSize` | minimum size of the framed box (m) |
| `fade` | `{ id: opacity }` — translucent parts (e.g. gluteus maximus over the sciatic nerve). Never applied to an injured part |
| `both` | parts drawn on both sides (central / bilateral problems: low back, neck) |
| `roles` | role overrides for this scene (e.g. a nerve the text says is only rarely irritated → `involved`) |
| `minor` | context parts whose labels start collapsed in 「+N」 |

On top of the scene, every **injured** part in highlights mode gets a see-through copy wherever other anatomy hides
it (same technique as nerves: drawn after the opaque anatomy with depth test GREATER, so only the hidden stretches
show, at ~55 % opacity) — an injured tendon or bursa under a superficial muscle is never lost.

---

## 8. Clips (`Clip`)

```ts
'ex-calf-raise-straight': {
  id: 'ex-calf-raise-straight',
  duration: 5,                       // seconds per cycle
  base: 'STAND',
  pose: { joints: { … } },           // optional: common changes for every key (e.g. hook-lying knees)
  keys: [
    { t: 0, label: 'かかとを上げる（1秒）' },
    { t: 0.2, pose: { joints: { ankle: { dorsi: -34 }, toes: { ext: 34 } } }, label: 'キープ' },
    { t: 0.38, pose: { joints: { ankle: { dorsi: -34 }, toes: { ext: 34 } } }, label: 'ゆっくり下ろす（3秒）' },
    { t: 0.9 },                        // back to base; 0.9 → 1.0 rests, then loops
  ],
  loop: 'loop',
  anchor: { point: 'toes:toes_mid', axes: 'xyz' },  // the forefoot stays put → the heel rises
  ground: true,
  camera: 'isoBack', focus: 'calf',
  sides: 'both',
  highlights: { gastrocnemius: 'primary', soleus: 'secondary' },   // fallback if the exercise data has none
},
```

### Keys

- `t` in 0..1, increasing. Each key's pose = **base ⊕ clip.pose ⊕ key.pose** — keys are **not cumulative**
  (a key without `pose` returns to base + clip.pose). Unspecified DOFs come from base.
- Between keys the engine eases (sine in-out) every DOF and the root: **every normal key is a velocity stop**.
- `hold` (seconds): the key's pose is held for that long before moving on (taken from the time until the
  next key). Repeating the same pose on two keys is an equivalent, more explicit way to hold.
- `pass: true` — a **pass-through key**: the motion goes through this pose *without stopping*. A run of pass keys
  between two normal keys is one smooth (C1) curve per DOF and root value, eased only at the two normal keys.
  Use it for solved mid poses that keep a contact (back on the wall halfway down a wall sit, the hand on its path
  in a row, the knee on the bench in a Copenhagen plank) — previously such a mid key made the movement stop and
  go. The curve is a cubic Hermite spline whose tangents are the 3-point (Catmull–Rom) slopes, limited like a
  monotone spline: a DOF that turns at the pass key stops there (0 slope) and no DOF ever overshoots its key
  values, so joint limits are never crossed between keys (contacts are NOT guaranteed — a hand or foot can still
  sweep through the floor between two good keys, so check the whole cycle). Rules: `hold` is ignored on a pass
  key (warning); in `'pingpong'` clips the first / last key cannot pass; `label` works as usual; in `'loop'` clips
  the first and last keys may pass (the curve wraps around). Clips without pass keys are bit-identical to before
  (`shots/eng-verify-motion/probe/cmp-engine.mjs` compares every clip against the pre-pass `clip.ts` from git).
- **A pass key only passes if its pose lies between its neighbours.** Every DOF that turns at the key (or is equal
  to a neighbour) gets slope 0 there; if almost all do, the "pass" key is a full stop again. The compiler warns:
  `[tribody] clip ex-… key 13 (t 0.565): pass key is (almost) a stop — …` (angular speed through the key < 20 % of
  the straight neighbour-to-neighbour speed). Fix it by moving the key's pose part of the way toward the next key
  (e.g. the 90-90 hands-lift key: shoulders 15 % on their way instead of unchanged).

  ```ts
  { t: 0, label: 'ゆっくりしゃがむ（3秒）' },
  { t: 0.15, pose: WALL_MID, pass: true },   // solved: back still on the wall — no stop here
  { t: 0.3, pose: WALL_BOTTOM, hold: 2 },
  ```

  Recipe used for the shipped clips: blend the two neighbouring keys at 25 / 50 / 75 %, keep the "progress" DOFs
  (e.g. knee flexion) as the blend, solve the others for the contacts (per-clip solvers in `shots/eng-motion/probe/`,
  e.g. `quad-solve.ts`, `row-solve.ts`, `cp-solve.ts`, `hd-solve.ts`, on top of `lib.ts`; qa3-fix-clips' solvers on the
  visible skin are in `shots/qa3-fix-clips/probe/` — `lib.ts` (patch a key, compile the whole clip, Nelder–Mead), e.g.
  `wallslide-solve.ts`, `hands-wall.ts`, `pup-solve.ts`, `row-solve.ts`, `gastroc-solve.ts`, `side-clip.ts`, and
  `variant.ts` / `keygaps.ts` / `series-gap.ts` / `ratio-series.ts` to check contacts and belly ratios), insert the results as pass
  keys (the same poses in reverse order on the way back), then re-check the whole cycle with
  `node shots/eng-verify-motion/probe/run.mjs sweep.ts <id…|changed|all>`: visible skin (loft + hands / feet / head)
  against the floor and every prop, joint limits, overshoot, speed at each pass key relative to its run, and every
  body-part ↔ prop contact (min / max gap over the cycle).
- `label` (Japanese, short, 動作の指示): shown from that key until the next labelled key, e.g. 「ゆっくり持ち上げる」
  「1秒キープ」「ゆっくり戻す（3秒）」. Also sent to `onPhase`.
- `loop: 'loop'` — if the last key's `t` < 1 the engine eases back to the first key over the remaining
  time (seamless). `'pingpong'` plays 0→1→0 (labels then follow time, so prefer `'loop'` for labelled clips).
- Tempo: make the concentric part ~1 s and the eccentric part ~2–3 s for strength work, long holds for
  stretches (e.g. duration 6, hold 2–3 s).

### Placement: `ground` & `anchor`

- `ground: true | number` — every frame the lowest skin point is put at y = 0 (or the number). Default comes
  from the base pose (`STAND_STEP` uses 0.15, `BIKE` none).
- `anchor: { point, axes }` — keeps a body point where it is at `t = 0` (after grounding).
  - `'xyz'`: fully pinned (calf raise: toes; heel drop on a step: toes; standing on one foot: that foot).
  - `'xz'`: pinned horizontally, height from `ground` (glute bridge: the heels stay where they are while the
    lowest point stays on the mat).
  - `anchor: null` disables the base pose's anchor.
- The engine has **no IK**: make the geometry consistent (e.g. in a bridge, choose pelvis tilt / hip / knee /
  ankle so both shoulders and feet touch). `?debug=1` prints `contacts(<3cm)` per segment — use it with
  `?t=` to check each key. The bridge sample shows solved values with a comment.

### Props

| kind | fields | notes |
|---|---|---|
| `band` | `from`, `to`, `width?`, `color?` | follows the body every frame; thins and darkens as it stretches |
| `step`, `box` | `at` (centre of the TOP face), `size? [x, h, z]` | furniture: placed once from t = 0 |
| `wall` | `at` (point on the surface at floor level), `normal?`, `width?`, `height?` | semi-transparent |
| `mat` | `at?` (default: under the pelvis), `size? [len, width]`, `rotY?` | lies on the floor |
| `roller` | `at` (roller centre), `axis? 'x'|'z'`, `length?`, `radius?`, `color?` | foam roller |
| `ball` | `at`, `radius?`, `color?` | follows every frame, e.g. `{ mix: ['femur_R:medial_epicondyle', 'femur_L:medial_epicondyle'], t: 0.5 }` between the knees |
| `towel` | `at`, `axis? 'x'|'y'|'z'|[x,y,z]`, `length?` (0.2), `radius?` (0.03), `color?`; or `size? [x, h, z]`, `rotY?` | rolled towel (dusty lavender roll, spiral on the ends — a hue no anatomy colour uses, so it reads on bones, skin, furniture and the mat in both themes). On a **body point** it follows that bone every frame, position *and* orientation (`axis` in the bone's rest frame), e.g. squeezed between the upper arm and the waist: `{ kind: 'towel', at: { bone: 'lumbar', rest: [0.1625, 1.135, -0.012] }, axis: 'z', radius: 0.034, length: 0.17 }` (solve lat / y / radius so it touches BOTH the trunk and the arm); on a **world point** it lies still (`axis` in world), e.g. under the toes. With `size` it is a **folded** flat towel placed once (`at` = centre of its top, total height `h`), e.g. under the head |
| `pillow` | `at` (centre of the TOP), `size? [x, h, z]`, `rotY?`, `color?` | soft cushion, placed once: flat bottom, the top puffs up toward the middle, which is 1.35 × `h` tall (edges `h`), so `at.y` = 1.35 × h puts it on the floor. For a resting head put the top 3–5 mm above the head's lowest point (it sinks in a little) |
| `dumbbell` | `hand? 'R'|'L'`, `size?` | held in the palm, follows the hand |
| `slant` | `at` (bottom centre), `angle?`, `size?`, `rotY?` | slant board rising toward +z |
| `chair`, `bench` | `at` (centre of the seat's top), `rotY?` | e.g. `{ at: { mix: ['pelvis:ischial_tuberosity_R', 'pelvis:ischial_tuberosity_L'], t: 0.5 }, off: [0, -0.035, -0.03] }` |
| `doorframe` | `at`, `width?`, `height?`, `normal?` | for doorway stretches |
| `bike` | — | road bike fitted to the figure (saddle under the sit bones, bars at the hands, cranks at the feet) |

`PropPoint` = world `[x, y, z]` | `AttachRef` | `{ at: AttachRef, off: [x, y, z] }` (world offset). With
`mirror: true` world points and offsets are mirrored in x.

### Camera & framing

- `camera`: a preset `'front' | 'back' | 'left' | 'right' | 'top' | 'iso' | 'isoBack' | 'isoLeft'`
  (`iso*` look at the figure's **right** side; `left` = camera on the figure's left), **or** `{ dir: [x, y, z] }`
  (custom view direction, auto-fitted — recommended), or `{ position, target }` (exact; scaled back on
  narrow screens).
- `focus: RegionId` frames that region (landmark set in `camera.ts → REGION_POINTS`); without focus the
  whole body (+ furniture) is framed over the whole clip. `frame: AttachRef[]` adds body points that must stay
  in view (e.g. `['hand:palm', 'scapula:acromion']` for band ER). With `frame` and no `focus`, **only** the
  frame points are framed.
- "Over the whole clip" = sampled at **every key time and hold end, plus 16 uniform times**, so an extreme
  pose anywhere in the clip stays in view — you no longer need extra `frame` points just for in-between poses.
- Your clip's framing is what the app shows: the exercise page's `focus` prop does **not** override a clip
  (it only frames the 「準備中」 fallback when no clip exists). Same for muscle rigs (`rig.focus` wins).
- Muscle demos frame the muscle (all three poses) plus the segment it moves: from each strand's insertion to the
  next joint (elbow / wrist / fingertips / knee / ankle / toe tips), over the whole loop and clear of the phase
  pill / player bar. A rig's exact camera (`{ position, target }`) is kept when all of that fits; otherwise the view
  is fitted to it along the authored direction (like `{ dir }`), so e.g. a gluteus-medius close-up still shows the
  thigh abducting in a 300 px card.
- Framing keeps clear of the phase pill (top, 46 px band) and the player bar (bottom). Users can orbit / pinch;
  「視点リセット」 returns to your framing.
- **No headless crops**: when a clip's `frame` crop (no `focus`) would show the upper trunk (neck base, breastbone,
  lower ribs or waist) at some time while the top of the head is out of view — a figure whose head sits under the
  phase pill — the engine adds the head (`head:vertex`, `head:chin`) to the framed points, i.e. shows the whole
  figure. Crops at the hips or lower (a calf / ankle close-up) are kept. To get a close-up, crop at the hips or below.

### Other fields

- `mirror: true` — perform on the LEFT side (swaps every R/L, mirrors root & props & camera).
- `sides: 'R' | 'L' | 'both'` — which side's muscles are highlighted. Use `'both'` for symmetric exercises
  (bridge, squat, calf raise), `'R'` for unilateral ones (the moving side).
- `partSides` — per-part override of `sides` for a part that works on the other side in a one-sided exercise:
  `partSides: { 'gluteus-medius': 'L' }` on the standing knee drive (the stance-leg gluteus medius holds the pelvis),
  `{ obliques: 'L' }` on the Copenhagen plank (the floor-side obliques hold the hips up). `'R' | 'L' | 'both'`, swapped
  with `mirror` like `sides`. Compiled into `CompiledClip.partSides` (`Side[]` per id). **Not applied yet**: the engine
  (engine.ts) still builds the scope and the labels from `cc.sides` only — it needs to use
  `cc.partSides[id] ?? (both.has(id) ? ['R', 'L'] : sides)` per part in `anatomy.setScope` (today `ScopeOptions.both`)
  and in `setupLabels`' `sidesOf`.
- `highlights` — used when the Exercise data (`primary` / `secondary` in src/data) is empty. When the data
  exists the viewer highlights `Exercise.primary` (primary) and `Exercise.secondary` (secondary); if **none** of
  those muscles is rigged yet, it falls back to the clip's `highlights`, so always set them.
- `extraHighlights` — parts highlighted **in addition** to the exercise's own targets (data or fallback), merged
  on top in exercise mode. Use it for what the data lists can't contain, e.g. a nerve on a nerve glide:
  `extraHighlights: { 'sciatic-nerve': 'involved' }`. Any `Highlight3DRole` (`'primary' | 'secondary' |
  'involved' | 'injured' | 'selected'`) and any rigged muscle / structure id. Nerves stay visible through
  muscles (see-through copy) and their label dot is nerve-yellow unless the role is `injured` / `involved`.

### Labels (automatic)

One floating name per highlighted part (max 10), placed by `labels.ts` in the **free space around the figure**:
the skin silhouette and the highlighted anatomy are rasterised to a coarse screen grid every frame, and each
label picks the spot (left / right of its dot, the card margins, above / below) with the least body / anatomy
overlap and the shortest, uncrossed leader line. The phase pill, legend, player bar and reset button are
measured from the DOM and are never covered; a dot under them moves to a visible point of its part (see below).

- **Tiers**: `injured` / `selected` / `primary` = full pill (11.5 px, bold); `involved` / `secondary` = smaller,
  lighter pill (11 px). Major labels are placed first.
- **No jitter**: staying put or moving along with the dot is free, any other spot must be clearly better
  (hysteresis), a label prefers its typical spot over the clip (only while the camera is at its home framing — after
  the user orbits, that screen-space prior no longer applies), and positions glide (≈85 ms smoothing).
- **「+N」 chip**: when the view opens, a pre-pass lays out ~12 sampled times of the clip; minor labels that would
  have to cover the highlighted anatomy (or the body while there is free space) in > 15 % of them collapse into a
  small 「+N」 chip next to the labels. Tapping it shows all names (「−」 hides them again).
- **Side**: with `sides: 'both'` each label goes on the side whose dot is in view and nearer the camera at
  `t = 0` (if neither dot is in view: the side with more of the part in view); with `'L'` (no mirror) on the left side.
- **Partly visible parts**: when a label's dot (belly centre / `labelAt`) is off-view or under the phase pill / player
  bar, the dot moves to the visible point of the part (its strand / cord control points, sampled in between) nearest
  to it, so a close-up still names the tendon or muscle that runs out of the frame (the tibialis posterior tendon in
  the short-foot close-up, the quadriceps in a patellar-tendon close-up). A minor part with nothing in view at all goes
  into 「+N」; expanding the chip lists it as 「画面外：…」 next to the chip (a major part with nothing in view has no
  label — scenes frame the injured parts, so this does not happen on condition pages).
- **Scenes** (condition / region pages) can start context labels collapsed in 「+N」 (`minor`, see §7). The chip is
  only in the DOM while it has something to show (no hidden 「ほかに0つ」 button).
- Writing a clip: nothing to do. Long Japanese names are shortened by `labelName()` (parenthetical notes dropped).

### Clip checklist of good practice

1. Start from a base pose; set the common configuration in `clip.pose`.
2. Keys: starting position (label = first instruction), end of the concentric part (hold), return. Solved mid
   poses that only keep a contact go in as `pass: true` keys (no stop halfway).
3. Pin what should not move (`anchor`), ground the body, add props.
4. Choose a camera that shows the movement plane (side view for bridges / squats, front (slightly above) for clamshell,
   back-oblique for calves).
5. Check `t = 0`, every key time and `t = 0.5` with `?t=`; check contacts with `?debug=1`.

---

## 9. Verification loop

Dev server (your own port): `VITE_CACHE_DIR=node_modules/.vite-<PORT> npx vite --port <PORT> --strictPort`.

| URL params on `/dev/engine.html` | |
|---|---|
| `?muscle=<id>` | muscle demo (rest → 収縮 → rest → ストレッチ) |
| `?exercise=<id>` | exercise clip |
| `?hl=id:role,id:role` | highlights (condition-page mode), e.g. `?hl=achilles-tendon:injured,gastrocnemius:involved`. Without a condition the generic view is used (with `&focus=<region>`: that region's scene). The harness has no `?condition=` yet: check a condition's teaching scene on its app page (`/#/condition/<id>`, tap 「3Dで見る」) |
| `?pose=<BASE_POSE>` | static base pose |
| `?j=shoulder_R.flex:170,elbow_R.flex:90` | joint overrides on top of `?pose` (pose / highlights mode) — great for testing DOFs |
| `?t=0..1` | **freeze** at a normalised time (deterministic screenshots) |
| `?cam=front|back|left|right|top|iso|isoBack|isoLeft` | override the camera |
| `?focus=<region>` | framing region for highlights / pose views (an exercise clip or muscle rig frames itself) |
| `?card=1` (`&h=320`) | show inside a 320 px card like the app (use this for final checks) |
| `?labels=0` `?controls=0` `?autoplay=0` | contract props |
| `?skin=0.25` | skin opacity (0 = bones only) |
| `?all=1` | show all rigged muscles faintly |
| `?debug=1` (`&lm=<bone>`) | landmark dots + names, L/L0 & belly ratios, action/stretch check, contacts |
| `?theme=dark` | dark tokens |
| `?coverage=1` | table of rigged / missing ids and the owning file |

`window.__tribody = { ready, setTime(t), engine, engines, remounts, done }` is available for scripts
(`engine.renders` counts rendered frames — playback renders ~30 per second, a static view with an injured glow ~20,
a static view without glow none after the first frames; `engine.isPlaying`, `engine.t`). `setTime(t)` is exact — at a key's
`t` it shows that key's pose and label (only `t = 1` stays just before the wrap) — and labels snap to their new
spots; otherwise give labels ~0.4 s to glide before a screenshot.

Robustness pages (engine maintainers; run them after engine changes):

| URL | checks |
|---|---|
| `?multi=1` | four viewers on one page (muscle, exercise, highlights, and one far below the fold that must stay paused: its `renders` stays at ~0–2) |
| `?remount=16` | mounts / unmounts the viewer 16 times (no console warnings, one canvas and one live engine at the end) |
| `?nogl=1&muscle=soleus&card=1` | WebGL unavailable → 「この端末・ブラウザでは3D表示を利用できません。」 |
| `?lose=1&muscle=soleus&card=1` | context lost → 「3D表示が一時的に停止しました。」 + 「再表示する」 (tap it: the viewer comes back). When the browser restores the context (`WEBGL_lose_context.restoreContext()`), the viewer rebuilds itself without a tap and without WebGL warnings |
| screenshot with reduced motion (`reducedMotion: 'reduce'` in Playwright) | no autoplay, play button shown, no pulsing |

Screenshots (phone): `node scripts/shot.mjs "http://127.0.0.1:<PORT>/dev/engine.html?muscle=soleus&t=0.2&card=1" shots/<you>/soleus-action.png --w 390 --h 844 --wait 2500`
— then look at the PNG. Typecheck: `npx tsc --noEmit -p tsconfig.json` (your file must be clean).

---

## 10. Checklists

### Rigging agent (per muscle)

- [ ] Right side only; every point resolves (no console warnings); 2–7 points per strand.
- [ ] Origin & insertion on the correct landmarks (orange/blue markers in the right place in `?muscle=`).
- [ ] Via points keep the strand outside bones and follow wraps in **all three** poses (rest / 0.2 / 0.7).
- [ ] Fan muscles: enough strands to read as a sheet; radii from the guide; tendon fractions realistic.
- [ ] `?debug=1` shows `OK ✓` (action shortens, stretch lengthens; belly change ±10–35 %).
- [ ] Camera / focus show the muscle clearly in `?card=1` at 390 px width; label not hidden.
- [ ] Structures: correct type & colour; injured state looks right (`?hl=<id>:injured`).
- [ ] `npx tsc --noEmit` clean for your file.

### Clip agent (per exercise)

- [ ] Base pose + `clip.pose` give the correct start position; keys reproduce the exercise's `steps`.
- [ ] Japanese phase labels (short); tempo sensible (`duration`, `hold`).
- [ ] Nothing floats or sinks (ground / anchor; `contacts` in `?debug=1` at every key).
- [ ] Props placed & behaving (band stretches, step under the forefoot, ball between the knees…).
- [ ] Camera shows the movement; `?card=1` at t = 0, 0.5 and each key look good.
- [ ] Unilateral: `sides: 'R'`; symmetric: `sides: 'both'`; fallback `highlights` set.
- [ ] `npx tsc --noEmit` clean for your file.

---

## 11. Engine internals (for maintainers)

| file | role |
|---|---|
| `rig.ts` | DOFs, limits, rest origins, FK (`solveFK`, shoulder-girdle model in §3), skin shapes (`SKIN_SHAPES`: drawn shapes + the volumes behind the loft; all of them ground the figure), base poses |
| `landmarks.ts` | landmark table, ref compilation (`compileRef`, `evalPoint`) |
| `skeleton.ts`, `skeleton-parts.ts` | procedural bone geometry per highlightable piece (~47k triangles for both sides; tessellation follows size — `geometry.ts` defaults) |
| `skin-loft.ts` | smooth CPU-skinned trunk / arm / leg skin (rings: centre, half-width `a`, front half-depth `b`, optional back half-depth `bb` and exponent `n`); `figure.ts` assembles bones + skin |
| `strands.ts` | allocation-free animated tubes (muscle / cord), length ratios, halo; `pose()` (centre line, ratios — cheap) and `write()` (geometry; colours only when they changed) |
| `anatomy.ts` | scope → visuals, roles, colours, markers, labels anchors, fades, see-through copies; `update()` (geometry + colours), `pose()` (pre-passes), `updatePulse()` (glow only) |
| `scenes.ts` | teaching scenes for condition / region pages (§7) |
| `clip.ts` | clip compilation, easing, holds, labels, ground/anchor, muscle demo builder |
| `props.ts`, `labels.ts`, `camera.ts`, `materials.ts`, `geometry.ts` | as named |
| `engine.ts` | renderer, loop, playback, framing, interaction, debug, lifecycle |
| `data-access.ts` | lazy, guarded access to `src/data` (content can never crash the viewer) |
| `AnatomyViewer.tsx`, `viewer.css` | React wrapper + Japanese player UI |

Bones (`figure.ts`): one merged mesh per segment + material (~31 draw calls instead of 85 pieces). Each piece keeps its
index range; `Figure.tint(part, …)` splits a piece off on demand (its triangles leave the merged index — compacted,
`drawRange` — and a part mesh sharing the merged vertex buffers draws them with the tint material) and puts it back on
reset. `partMeshes(part, side)` returns the split-off meshes (only while tinted). Probes: bone triangles per part
`shots/qa3-fix-body/probe/tris.ts`; bone vertices outside the visible skin per pose `shots/qa3-fix-body/probe/skin.ts`
(run with `node shots/eng-verify-motion/probe/run.mjs /home/user/forclaude/shots/qa3-fix-body/probe/<file>`).

Per-frame code (FK, grounding, strands, skin loft, labels, colours) is allocation-free: reuse module-level
temporaries, use `colorOf(css)` (cached `Color`) instead of `Color.set(string)`, and never create closures or
arrays in `update()` paths. Zoom limits follow the home framing (wide poses on tall phones need a far camera).

Rendering: transparent canvas over the card, NeutralToneMapping, sRGB, DPR ≤ 2, camera-relative key light +
hemisphere. Skin = depth pre-pass + fresnel colour pass (one translucent layer, no overlap blotches), drawn
after opaque bones/muscles. The engine creates its own WebGL2 context: MSAA only on DPR < 2 screens and not on
software rasterisers (SwiftShader / llvmpipe: MSAA costs them 2–4× per frame); no context → the Japanese fallback
without three's console error. Shader error checks (synchronous program logs) run in development only; with
`KHR_parallel_shader_compile` the first view's shaders compile in parallel before the first frame.

Loop (`engine.loop`): work only when something changed, and stop when nothing does —
playback poses + renders at most every ~33 ms (30 fps) unless the camera is moving (drag, damping, reset tween:
display rate); a static view with an injured part only updates the glow (`anatomy.updatePulse`: emissive, halo,
bone tint — no geometry, no label layout) every ~48 ms; labels are re-solved only when the pose or the camera
changed, while they glide, or when the label set / UI changed; otherwise the loop idles (no rAF) until OrbitControls'
events, `play()`, `setTime()`, a resize, a theme change or the 「+N」 chip wake it (`kick()`). Pre-passes over
sampled poses (framing, label plan, debug ratios) use `anatomy.pose()` (no geometry writes). 「視点リセット」 first
clears OrbitControls' damping momentum, so the tween ends exactly at home.
Paused when off-screen (IntersectionObserver) or the tab is hidden. Unmount detaches the canvas at once and releases
the context in an idle callback (`forceContextLoss` waits for the GPU — not inside React's commit). WebGL unavailable /
context lost show a Japanese message (with 「再表示する」); when the browser restores a lost context the viewer
remounts itself, and a once-lost engine drops its GL objects without deleting them (they belong to the dead
context) but still releases its restored context (`forceContextLoss` in an idle callback — otherwise it would count
against the browser's live-context cap until garbage collection). `prefers-reduced-motion` → no autoplay, no pulse.
If building a view throws (e.g. a malformed rig or clip), the viewer logs `[tribody 3d] could not show this view`
and falls back to the standing figure with 「3Dモデルを表示できませんでした」 — check the console when a page shows that.
