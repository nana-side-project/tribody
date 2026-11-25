# TriBody — Content Writing Guide (医学コンテンツ執筆ガイド)

Read together with `docs/ARCHITECTURE.md`, `src/data/types.ts`, `src/data/registry.ts`.

## Who reads this

日本のエイジグループ・トライアスリート。医療者ではないが、熱心で、仕組みを理解したい人。
スマホで読む。専門用語は使ってよいが、**必ずやさしい説明を添える**。

## Voice & format

- です・ます調。短い文。一文 60 字程度まで。箇条書きの各項目は 1 文（長くても 2 文）。
- 解剖用語は日本解剖学用語に従う: **殿**（大殿筋・中殿筋。「臀」は使わない）、**靱帯**（「靭」ではなく「靱」）、
  腓骨筋（長腓骨筋・短腓骨筋）、母趾・足趾（「趾」）、頸（頸椎）。
- 難しい漢字には初出で読みを添える: 「棘上筋（きょくじょうきん）」。Muscle には `kana` フィールドがある。
- tendinopathy は「腱障害」を基本にし、一般に知られた呼び名（〜腱炎、ジャンパー膝 など）を `aka` に入れる。
- 数値は具体的に（「10〜15回×3セット」「30秒×3回」「週3回」）。
- 絵文字は使わない（UIが付ける）。
- Length targets (mobile!):
  - `summary`: 80–140 字
  - `whatHappens`: 2–4 段落、各 80–180 字。組織で何が起きているか（腱の負荷耐性低下、圧迫、滑液包の刺激 …）を具体的に。
  - `symptoms` 3–6 / `patterns` 2–4 / `selfChecks` 1–3 / `differentials` 2–4 / `redFlags` 3–6 /
    `prevention` 3–6 / `trainingTips` 各種目 2–4
  - Exercise `steps` 3–6 (各 ≤ 60 字), `cues` 2–4, `mistakes` 2–4.

## Accuracy — evidence-based, current practice

Write what current clinical practice guidelines / consensus statements support. Anchors (use as references where relevant;
label format: `著者 et al. タイトル要約. 雑誌 年`):

- Patellofemoral pain: Willy RW et al. JOSPT CPG 2019; Crossley KM et al. Consensus (Manchester) BJSM 2016 — hip + knee strengthening, education, load management, (short-term) taping/foot orthoses.
- Patellar tendinopathy: Malliaras P / Cook JL & Purdam continuum model (BJSM 2009); Kongsgaard 2009 HSR; isometrics for short-term pain (Rio 2015; later evidence mixed — say so).
- Achilles tendinopathy: Martin RL et al. JOSPT CPG 2018; revision Chimenti RL et al. JOSPT 2024; Alfredson 1998 eccentric; Silbernagel 2007 pain-monitoring model; insertional: **do not drop the heel below floor level** (Jonsson 2008), avoid stretching into dorsiflexion compression early.
- Plantar heel pain: Koc TA et al. JOSPT CPG 2023; Rathleff 2015 high-load strength (towel under toes); plantar fascia–specific stretching; taping; footwear.
- Gluteal tendinopathy: Mellor R et al. LEAP trial BMJ 2018 (education + exercise > injection); Grimaldi A 2015 — **avoid compression positions** (crossing legs, hip adduction, side-lying on painful side, cross-body knee-to-opposite-shoulder / cross-leg ITB stretches; figure-4 (FABER-like) is often provocative too).
- Proximal hamstring tendinopathy: Goom T et al. JOSPT 2016 — avoid compressive stretches early (deep hip flexion stretches), isometrics → progressive loading; cycling saddle pressure.
- Groin pain: Weir A et al. Doha agreement BJSM 2015 (adductor-, iliopsoas-, inguinal-, pubic-related); Harøy J 2019 Copenhagen adduction programme.
- ITB syndrome: friction theory is outdated — compression of a richly innervated fat/connective layer at the lateral femoral epicondyle (Fairclough 2006). ITB itself **cannot be meaningfully stretched or lengthened by foam rolling**; say so honestly. Hip abductor strengthening, load/downhill management, cadence.
- MTSS & tibial stress fracture: Winters M 2013/2018; bone stress injury continuum (Warden 2014, Hoenig 2022 consensus); REDs / low energy availability (Mountjoy IOC consensus 2018/2023) — mention as risk factor sensitively. **Stress fracture suspicion → stop running and see a doctor; no "work through it"**.
- Running load & cadence: increasing step rate 5–10% reduces knee/hip load (Heiderscheit 2011). The "10% rule" has limited evidence — present as a cautious guide, emphasise avoiding sudden spikes (Nielsen 2014 weekly progression; Frandsen 2025 single-session spikes vs. the longest run in the previous 30 days).
- Exercise-associated muscle cramps: altered neuromuscular control from fatigue is the leading theory; dehydration/electrolyte theory has weak evidence (Schwellnus 2008/2011). Stretching relieves an acute cramp. Recommend pacing, conditioning, and seeing a doctor for frequent cramps without exertion.
- Shoulder (swimmers): subacromial pain is multifactorial (rotator cuff tendinopathy ± bursa); **"impingement" as a purely mechanical cause is outdated** — explain overload + reduced tolerance; scapular control & cuff strength; stroke technique (crossover entry, thumb-first entry, dropped elbow, unilateral breathing, sudden paddle use); Kibler scapular dyskinesis consensus (BJSM 2013, 2015); Lewis J 2016.
- Ankle sprain: Vuurberg G et al. BJSM 2018 guideline — functional rehab, balance training, early weight bearing; Ottawa ankle rules (can't bear weight 4 steps / bony tenderness → X-ray).
- Acute soft-tissue injury: PEACE & LOVE (Dubois B & Esculier JF, BJSM 2020) — avoid anti-inflammatories / icing as default early on; relative rest, not total rest.
- Low back pain: non-specific LBP — stay active, reassurance, exercise; red flags (cauda equina: saddle numbness, bladder/bowel; fever; trauma; unexplained weight loss; night pain). Cyclist: saddle height/reach, core endurance, hip flexor/hamstring mobility.
- Neck (cyclist): aero position → prolonged cervical extension; deep neck flexor endurance, thoracic extension mobility, bike fit (stack/reach, helmet).

**Myths to avoid / correct gently**: 「膝はつま先より前に出してはいけない」(absolute rule), 「ストレッチで怪我が防げる」(limited evidence; mobility for performance is fine),
「フォームローラーで癒着を剥がす」, 「腸脛靱帯を伸ばす」, 「痛みがあれば完全休養」(→ relative rest & load management), 「アイシングで早く治る」(no good evidence; fine for short-term pain relief).

Use `evidence` notes to tell the user how strong the support is (`strong` / `moderate` / `limited` / `expert` opinion).

References: give 2–5 per condition. **Only include a `url` if you have verified that exact URL resolves to that paper
(e.g. you fetched it)**. Otherwise omit `url`. Never invent DOIs.

## Safety rules (non-negotiable)

1. Never diagnose. Use 「〜の可能性があります」「〜が疑われます」. The app suggests *possibilities* from location/pattern.
2. Every condition has specific **red flags** (e.g. 夜間痛・安静時痛, 体重をかけられない, 腫れ・熱感, しびれ・脱力, 骨の一点の強い圧痛,
   ジャンプ（片脚ホップ）で痛む → 疲労骨折の疑い, 外傷後, 発熱). Write them as concrete observable signs.
3. Self-checks must be **gentle and safe** (palpation, a pain-free functional movement, single-leg squat quality, Thomas-test-like
   posture checks…). Never ask the user to hop on a suspected stress fracture, or force a painful range. Add `caution` where needed.
4. Stress fractures (tibia, metatarsal): calm phase = medical evaluation + offloading; exercises in calm phase must be
   non-impact (e.g. upper body / core / pain-free swimming/cycling as allowed by the doctor). Make this explicit.
5. Pain rule: use the pain-monitoring model — during exercise pain ≤ 3/10 (tendons: up to ~5/10 can be acceptable), settles
   within ~24 h, no worsening next morning. Nerve pain (しびれ・電気が走る痛み) is not "acceptable pain" → back off.
6. Nerve glides, plyometrics and heavy loading include clear cautions and progression criteria.

## Triathlon specificity (this is the app's value!)

Explain **why it happens in triathlon** per discipline, concretely:

- **Swim**: roughly 1,000–2,000 shoulder rotations per hour of swimming; catch & pull with internal rotation + adduction (広背筋・大胸筋・肩甲下筋), recovery with
  elevation; crossover / thumb-first entry, dropped elbow, breathing only one side, sudden paddle/pull-buoy volume, wetsuit
  shoulder restriction, open-water sighting (neck extension), strong plantarflexed kick → calf/foot cramps.
- **Bike**: hours of sustained hip flexion (腸腰筋・大腿直筋が短い位置), aero position (neck & thoracic extension, lumbar flexion),
  saddle height/setback (too low → patellofemoral load; too high → hamstring/ITB/Achilles), cleat rotation/float & stance width
  (knee tracking, ITB, pes anserine), big gear low cadence (patellar tendon), saddle pressure (sit bones, proximal hamstring,
  pudendal area), crank length.
- **Run**: highest injury rate of the three; impact loading (bone stress), sudden volume spikes, hills (uphill → Achilles/calf; downhill
  → PFP/ITB), **brick runs off the bike on fatigued legs and tight hip flexors**, cadence, shoes (sudden switch to minimal / carbon
  plate super-shoes → Achilles, calf, metatarsal/navicular load), race-day intensity.
- **Cross-training**: injured runners can often keep swimming/cycling — say what is usually OK (pain-free) and what isn't.

`trainingTips` should be practical adjustments (e.g. 「サドル高を5mm単位で調整」「ピッチを5〜10%上げる」「パドル使用は週の総距離の…」
「ブリックランは最初の5分をゆっくり」「左右呼吸」).

## Exercises

- Dose realistic for busy age-groupers: strength 2–3×/week; mobility/stretch daily OK; tendon loading programmes per protocol.
- `level`: 1 = OK in painful phase (isometrics, gentle ROM), 2 = standard, 3 = advanced/plyometric.
- `primary`/`secondary` = muscles that **work** (strength/isometric/activation/plyo/balance) or that are **lengthened** (stretch/mobility).
  These drive the 3D highlighting — be anatomically right.
- `cues`: what to feel and where (「お尻の横が熱くなればOK」). `mistakes`: the usual compensation (腰を反る、骨盤が回る、膝が内に入る…).
- Nerve glides (`type: 'nerve-glide'`, e.g. `ex-sciatic-nerve-glide`) are nerve mobility, not muscle stretches: do **not** list them in
  a muscle's `stretch` list, even if the muscle appears in the exercise's `primary`/`secondary` for 3D highlighting.
- Cross-reference across regions: knee pain needs hip work (`ex-clamshell`, `ex-side-plank`…), Achilles needs soleus work, etc.
  You may reference any exercise id in the registry even if another agent writes it — trust its name in the registry.
- **One exercise, many plans: keep `dose`, `cues` and `caution` condition-neutral.** The same exercise object is shown (and copied
  into マイメニュー) from every plan that uses it, e.g. the heel drop from Achilles tendinopathy *and* calf strain, the clamshell from
  a stress-fracture plan where running is not allowed. So no protocol-specific frequency (「原法は1日2回」), no 「ランの前に」,
  no 「痛みが強い時期」, no 「（腱のリハビリ時）」 in `dose`. When a rule differs by condition, name the condition
  (「アキレス腱障害では5/10まで（肉離れでは3まで）」) in `caution`.
- **Plan-specific doses go into `RehabPhase.doses`** (`{ 'ex-…': { frequency: '週2回（再発予防）' } }`): only the fields that differ
  from the exercise's `dose` (never a copy of the default), keys only from that phase's `exercises`. The exercise page opened from the
  plan (`?from=&phase=`) and マイメニュー added from that step show the merged dose. Typical cases: a tendon isometric done 毎日 in
  ①; 「週3回（1日おき）」 heavy loading in ②; 「週2回（再発予防）」 maintenance in ③; a gentler start (calf strain heel drop
  10〜15回×2セット, 週3回); HSR tempo 「3秒で上げ、3秒で下ろす」.
- **Guidance and dose say the same thing.** Every number the step's `guidance` (and `progressWhen`, and `prevention` for the
  maintenance frequency) gives for an exercise must match the dose shown for that step — no 「週1〜2回」 in the text with
  「週2〜3回」 in the dose box. A generic line (「筋トレは週2回…」) applies to every strength exercise of the phase, so override
  them all, or name the exercises it means (「腱板と肩甲骨の補強（チューブ外旋、うつ伏せY・T・W、プッシュアッププラス）は週2回…」).
  A progression is fine when it starts at the dose (「30秒から始め、楽なら45秒まで」, 「2セットから始め、楽なら3セットに」).
  Lines that talk about one exercise contain its name (the part after the last 「・」 before any 「（」 is enough, e.g.
  「ヒールドロップは週3回…」, 「ルーマニアンデッドリフト」): the plan banner on the exercise page shows those lines first.
- `frequency` is also read by マイメニュー's weekly counter: start it with 「毎日」 or 「1日N回」 (daily), or write 「週N回」 / 「週N〜M回」 /
  「1日おき」 (weekly). Put any remark in （）, which the counter ignores. A text without those words counts as daily.
- Do not prescribe a tendon protocol (daily, pain up to 5/10) in a muscle-injury, bone or cramp plan. Bone (stress fracture) plans:
  bone pain 0–2/10 and stop at the first bony pain.

## Cross-links you are responsible for

- `Condition.painSpots` ↔ `PainSpot.conditions` (owner E writes spots; others write conditions — both sides must agree; follow `PAIN_SPOTS` in the registry).
- `Muscle.relatedConditions`, `Muscle.strengthen/stretch` ↔ `Exercise.primary/secondary`.
- `Condition.involved` uses muscle **or** structure ids with `kind` set correctly.
- `Condition.anatomyNote` (optional): a short reassurance shown under the anatomy legend when the red highlight could be
  misread as damage (non-specific low back / neck pain, cramps, scapular dyskinesis — a movement finding, not an injury).
  Keep it to 1–2 sentences. It switches the page to 「どこが痛む？」 wording and the 3D to a steady (non-pulsing) red. Never add
  one to a real tissue injury (calf strain, tendinopathy, fracture).
- Involvement roles: `injured` / `irritated` / `compressed` are drawn **red** in 2D, 3D and the list (「どこが傷んでいる？」).
  Use them only for the tissue that hurts. Everything else is **amber** context: `overloaded` / `tight` / `weak` (a contributor)
  or `nearby` (近くを通る).
  - `irritated`: a secondary structure that really is sensitised and adds to the pain (subacromial / retrocalcaneal / pes anserine /
    trochanteric bursa, the ischial tuberosity under a hamstring enthesopathy).
  - `overloaded`: the tissue takes too much load and is part of the mechanism (a muscle working too hard, the tibia under bone
    stress in MTSS, the facet joints in neck/back pain, the ITB tension that presses on the epicondyle).
  - `nearby`: context tissue that lies right next to the lesion and is **not damaged and not really overloaded** — shown so the
    reader knows what is there, what could be irritated secondarily, or what must not be confused with the lesion. Examples in use:
    the sciatic nerve beside the proximal hamstring tendon, the periosteum strip (脛骨内側縁) around a tibial stress fracture
    (the pain centre is the crack), the glenoid labrum at the biceps anchor (SLAP is a separate diagnosis), the pubic symphysis
    beside the adductor origin (pubic-related groin pain is a separate entity), the metatarsal heads beside a Morton's neuroma
    (not a bone injury). The note starts with what the tissue is, then says plainly that it is not damaged, then what can happen
    (「傷んでいるわけではありませんが、まれに…」). If it can cause symptoms (nerve), say how to treat them (しびれは我慢しない).
  - Decide by asking 「Would a clinician call this tissue part of the lesion or of the mechanism?」 Part of the lesion → red role;
    part of the mechanism → `overloaded`/`tight`/`weak`; neither, just next door → `nearby`.
  A muscle marked `tight` needs a stretch in the plan, or a note saying why not (insertional Achilles: strengthen, don't stretch).
- `Muscle.actions` is read by laypeople: every movement term gets a plain gloss in the same string —
  外転（腕を横に上げる／脚を横に開く）, 内転（体に引き寄せる／脚を閉じる）, 外旋・内旋（外／内にひねる）, 屈曲・伸展
  (joint-specific: 腕を前に上げる／後ろへ引く, 膝を曲げる／伸ばす), 挙上（肩をすくめる）, 下制（引き下げる）,
  上方回旋・下方回旋（肩先を上へ／下へ向けて回す）, 前傾・後傾, 底屈（つま先を下げる）, 背屈（つま先を上げる）, 側屈（横に倒す）.
  Part-specific actions start with the part: 「前部: …」「長頭: …」.
- Consistency across pages: walk–run restarts use the guide 「ラン復帰プログラム」 stage 1 (1分ラン＋4分ウォーク×6回) and name the
  guide; energy deficiency is 「REDs（スポーツにおける相対的エネルギー不足）」. A differential that links to another condition must be
  covered by that page (e.g. lumbar *referred* pain → `low-back-pain`; nerve-root pain / sciatica is a separate, unlinked row → 受診).
- Run `OWNER=<you> npm run validate` and `npx tsc --noEmit -p tsconfig.json` until your part is clean
  (warnings about objects other owners haven't written yet are expected).
