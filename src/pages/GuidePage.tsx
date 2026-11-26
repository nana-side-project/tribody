import { useEffect, useLayoutEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { GUIDES, getGuide, type Discipline, type Guide, type GuideBlock, type GuideId } from '../data';
import { GuideCard } from '../components/cards';
import { DISCIPLINE_ICON, IconAlert, IconLayers } from '../components/icons';
import { Page } from '../components/Layout';
import { Bullets, EmptyState, Section } from '../components/ui';
import { DISCIPLINE_JA, DISCIPLINE_ORDER, guideTitle, isKnownGuide, isLearnGuide } from '../lib/labels';
import { scrollBehavior } from '../lib/useMedia';
import NotFoundPage from './NotFoundPage';

/**
 * The visual blocks of a learning guide (figures, 3D, exercise cards) live in their own chunk with the region diagrams
 * (shared with the condition page), so a text-only guide never waits for them. Once loaded, they render at once.
 */
type BlocksProps = { guide: GuideId; blocks: GuideBlock[]; notes?: Partial<Record<string, string>>; eager?: boolean };
let blocksModule: { default: ComponentType<BlocksProps> } | null = null;
let blocksPending: Promise<unknown> | null = null;
function preloadGuideBlocks(): Promise<unknown> {
  return (blocksPending ??= import('../components/GuideBlocks').then(
    (m) => (blocksModule = m),
    (e: unknown) => {
      blocksPending = null; // offline / flaky network: try again next time
      throw e;
    },
  ));
}

/** The blocks module, loading it if this guide has blocks: [module | null, failed to load]. */
function useGuideBlocks(need: boolean): [ComponentType<BlocksProps> | null, boolean] {
  const [mod, setMod] = useState(blocksModule);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!need || mod) return;
    let live = true;
    preloadGuideBlocks().then(
      () => live && setMod(blocksModule),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [need, mod]);
  return [mod?.default ?? null, failed];
}

/**
 * A heading's short form for the table of contents and guide links: without its 「（…）」 notes —
 * 「股関節と骨盤のしくみ（前・後ろ・横から支える）」 → 「股関節と骨盤のしくみ」, 「お尻（殿筋）は後ろと横から骨盤を支える」 →
 * 「お尻は後ろと横から骨盤を支える」 (cutting at the first 「（」 would leave only 「お尻」).
 */
const shortHeading = (h: string) => h.replace(/[（(][^（()）]*[）)]/g, '').trim() || h;
const isRedFlagHeading = (h: string) => /受診の目安/.test(h);

/** Other guides to suggest: the same kind first (learning guides / articles), at most 3, always one learning guide. */
function otherGuides(id: GuideId): GuideId[] {
  const rest = GUIDES.map((g) => g.id).filter((g) => g !== id);
  const learn = rest.filter(isLearnGuide);
  const plain = rest.filter((g) => !isLearnGuide(g));
  if (isLearnGuide(id)) return [...plain, ...learn].slice(0, 3);
  return [...plain.slice(0, learn.length ? 2 : 3), ...learn.slice(0, 1)];
}

export default function GuidePage() {
  const { id = '' } = useParams();
  if (!isKnownGuide(id)) return <NotFoundPage />;
  return <GuideView key={id} id={id as GuideId} />;
}

function GuideView({ id }: { id: GuideId }) {
  const g = getGuide(id);
  const others = otherGuides(id);
  const hasBlocks = !!g?.sections.some((s) => s.blocks?.length);
  const [Blocks, blocksFailed] = useGuideBlocks(hasBlocks);
  // a jump to a section further down (table of contents, ?section= from My Menu): every figure is mounted first, so
  // nothing above the target changes height while the page scrolls there
  const [eager, setEager] = useState(false);
  const [jump, setJump] = useState<number | null>(null);
  const [params] = useSearchParams();
  const sectionParam = Number(params.get('section'));
  const redIndex = g?.sections.findIndex((s) => isRedFlagHeading(s.heading)) ?? -1;
  const learn = hasBlocks;

  useEffect(() => {
    if (g && Number.isInteger(sectionParam) && sectionParam >= 1 && sectionParam <= g.sections.length) {
      setEager(true);
      setJump(sectionParam);
    }
    // only on opening the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    if (jump === null || (hasBlocks && !Blocks && !blocksFailed)) return;
    const raf = requestAnimationFrame(() => {
      document.getElementById(`guide-s${jump}`)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      setJump(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [jump, Blocks, blocksFailed, hasBlocks]);
  const goTo = (n: number) => {
    setEager(true);
    setJump(n);
  };

  return (
    <Page title={guideTitle(id)} back="/guides">
      <header className="page-head">
        <span aria-hidden="true" lang="en" className="kicker">{learn ? 'Learn' : 'Guide'}</span>
        <h1>{guideTitle(id)}</h1>
        {g && (
          <p className="lead" style={{ color: 'var(--text)' }}>
            {g.summary}
          </p>
        )}
        {learn && redIndex >= 0 && (
          <div className="callout callout--disclaimer" style={{ marginTop: 14 }}>
            <IconAlert />
            <p>
              一般的な情報で、診断ではありません。痛みが強い・続く・しびれがあるときは、運動より先に{' '}
              <button type="button" className="link guide-jump" onClick={() => goTo(redIndex + 1)}>
                「受診の目安」
              </button>
              を確認してください。
            </p>
          </div>
        )}
      </header>

      {g && learn && g.sections.length >= 4 && (
        <nav className="toc chips chips--scroll" aria-label="このガイドの目次">
          {g.sections.map((s, i) => (
            <button
              key={i}
              type="button"
              className="chip"
              style={isRedFlagHeading(s.heading) ? { color: 'var(--danger)' } : undefined}
              onClick={() => goTo(i + 1)}
            >
              {shortHeading(s.heading)}
            </button>
          ))}
        </nav>
      )}

      {!g ? (
        <div style={{ marginTop: 20 }}>
          <EmptyState title="記事を準備中です" text="このガイドは現在作成中です。">
            <Link to="/guides" className="btn btn--secondary">
              ガイド一覧へ
            </Link>
          </EmptyState>
        </div>
      ) : (
        <article>
          {g.sections.map((s, i) => {
            const notes = blockNotes(s);
            const body = notes ? s.body.filter((p) => !notes.used.has(p)) : s.body;
            return (
              <section key={i} id={`guide-s${i + 1}`} className="section anchor" style={{ marginTop: i === 0 ? 24 : 32 }}>
                <h2 className="guide-h">
                  <span aria-hidden="true" className="kicker guide-h__num">{String(i + 1).padStart(2, '0')}</span>
                  <span>{s.heading}</span>
                </h2>
                <SectionBody guide={g} heading={s.heading} body={body} />
                {!!s.blocks?.length &&
                  (Blocks ? (
                    <Blocks guide={g.id} blocks={s.blocks} notes={notes?.byTitle} eager={eager} />
                  ) : blocksFailed ? (
                    <div className="placeholder guide-blocks__fail" role="status" style={{ marginTop: 14 }}>
                      <div>
                        <IconLayers />
                        <strong>図・3D・種目のカードを読み込めませんでした</strong>
                        <span className="small">通信状態を確認して、ページを再読み込みしてください。</span>
                      </div>
                    </div>
                  ) : (
                    <div className="guide-blocks guide-blocks--loading" aria-hidden="true" />
                  ))}
              </section>
            );
          })}
        </article>
      )}

      {others.length > 0 && (
        <Section kicker="More" title="ほかのガイド">
          <div className="stack stack--sm">
            {others.map((o) => (
              <GuideCard key={o} id={o} features={isLearnGuide(o)} />
            ))}
          </div>
        </Section>
      )}
    </Page>
  );
}

/**
 * The lines of a section's text that describe one of its exercise lists (「動かす：毎日でも行えます…」 next to the list
 * titled 「動かす」): shown with that list instead of in the text.
 */
function blockNotes(s: Guide['sections'][number]): { byTitle: Record<string, string>; used: Set<string> } | null {
  const titles = (s.blocks ?? []).flatMap((b) => (b.kind === 'exercises' && b.title ? [b.title] : []));
  if (!titles.length) return null;
  const byTitle: Record<string, string> = {};
  const used = new Set<string>();
  for (const p of s.body) {
    const m = p.match(/^([^：:]{1,12})[：:]\s*(.+)$/);
    if (m && titles.includes(m[1]) && !byTitle[m[1]]) {
      byTitle[m[1]] = m[2];
      used.add(p);
    }
  }
  return used.size ? { byTitle, used } : null;
}

/** 「…（ガイド「バイクポジションと痛み」）」: a guide named in the text becomes a link to it. */
function withGuideLinks(text: string, self: GuideId): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/ガイド「([^」]+)」/g)) {
    // the full title, or the title without its 「（…）」 note (ガイド「股関節まわりを整えて鍛える」)
    const target = GUIDES.find((x) => x.id !== self && [guideTitle(x.id), shortHeading(guideTitle(x.id))].includes(m[1]));
    if (!target || m.index === undefined) continue;
    parts.push(text.slice(last, m.index), 'ガイド', <Link key={m.index} to={`/guide/${target.id}`} className="link">「{m[1]}」</Link>);
    last = m.index + m[0].length;
  }
  if (!parts.length) return text;
  parts.push(text.slice(last));
  return parts;
}

const STAGE_RE = /^段階\s*(\d+)\s*[：:]\s*(.*)$/;
const DISC_RE = /^(スイム|バイク|ラン)[：:]\s*(.+)$/;
const DISC_OF: Record<string, Discipline> = { スイム: 'swim', バイク: 'bike', ラン: 'run' };
const MYTH_RE = /^(「[^」]+」)[：:]\s*(.+)$/;

/**
 * Guide sections are string lists; show the ones that are really lists as lists:
 * checklists (「…チェック」) as check bullets, 「段階N：…」 lines as a numbered stage table, the red-flag guide's signs
 * and a 「受診の目安」 section as a red-flag box, 「バイク：…」「ラン：…」 lines as discipline cards, 「「誤解」：説明」
 * lines as myth / fact rows, everything else as paragraphs. A guide named in the text links to it.
 */
function SectionBody({ guide, heading, body }: { guide: Guide; heading: string; body: string[] }) {
  const guideId = guide.id;
  if (!body.length) return null;
  const stages = body.map((b) => b.match(STAGE_RE)).filter((m): m is RegExpMatchArray => !!m);
  if (stages.length >= 3) {
    const rest = body.filter((b) => !STAGE_RE.test(b));
    return (
      <div style={{ marginTop: 12 }}>
        <ol className="stages">
          {stages.map((m) => (
            <li key={m[1]}>
              <span className="stages__n">段階{m[1]}</span>
              <span>{m[2]}</span>
            </li>
          ))}
        </ol>
        {rest.length > 0 && (
          <div className="prose" style={{ marginTop: 12 }}>
            {rest.map((p, j) => (
              <p key={j}>{withGuideLinks(p, guideId)}</p>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (isRedFlagHeading(heading) && guideId !== 'red-flags') {
    // the last line pointing to the red-flag guide becomes the box's link line
    const linkLine = body.find((p) => /ガイド「/.test(p) && p === body[body.length - 1]);
    const signs = body.filter((p) => p !== linkLine);
    return (
      <div className="redflags" role="note" aria-label="受診の目安" style={{ marginTop: 12 }}>
        <p className="redflags__head">
          <IconAlert />
          こんなときは運動より先に医療機関へ
        </p>
        <ul className="bullets">
          {signs.map((p, j) => {
            // 「サイン：どうするか」: the sign in bold
            const m = p.match(/^([^：]{4,80})：(.+)$/);
            return (
              <li key={j}>
                {m ? (
                  <>
                    <strong>{m[1]}</strong>：{withGuideLinks(m[2], guideId)}
                  </>
                ) : (
                  withGuideLinks(p, guideId)
                )}
              </li>
            );
          })}
        </ul>
        {linkLine && <p className="redflags__note">{withGuideLinks(linkLine, guideId)}</p>}
      </div>
    );
  }
  if (/チェック/.test(heading) || guideId === 'red-flags') {
    return (
      <div className="card" style={{ marginTop: 12 }}>
        <Bullets items={body} check={/チェック/.test(heading)} color={guideId === 'red-flags' ? 'var(--danger)' : undefined} />
      </div>
    );
  }
  const disc = body.map((b) => b.match(DISC_RE));
  if (body.length >= 2 && disc.every(Boolean)) {
    const by = new Map<Discipline, string[]>();
    for (const m of disc as RegExpMatchArray[]) {
      const d = DISC_OF[m[1]];
      by.set(d, [...(by.get(d) ?? []), m[2]]);
    }
    return (
      <div className="stack" style={{ marginTop: 12 }}>
        {DISCIPLINE_ORDER.filter((d) => by.has(d)).map((d) => {
          const Icon = DISCIPLINE_ICON[d];
          return (
            <div key={d} className={`disc-card disc-card--${d}`}>
              <p className="disc-card__head">
                <Icon />
                {DISCIPLINE_JA[d]}
              </p>
              <ul className="bullets">
                {by.get(d)!.map((t, j) => (
                  <li key={j}>{withGuideLinks(t, guideId)}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    );
  }
  const myths = body.map((b) => b.match(MYTH_RE));
  if (/誤解/.test(heading) && myths.every(Boolean)) {
    return (
      <div className="card card--flush guide-myths" style={{ marginTop: 12 }}>
        {(myths as RegExpMatchArray[]).map((m, j) => (
          <div key={j} className="guide-myth">
            <p className="guide-myth__q">
              <span className="guide-myth__tag">誤解</span>
              {m[1]}
            </p>
            <p className="guide-myth__a">{withGuideLinks(m[2], guideId)}</p>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="prose" style={{ marginTop: 10 }}>
      {body.map((p, j) => (
        <p key={j}>{withGuideLinks(p, guideId)}</p>
      ))}
    </div>
  );
}
