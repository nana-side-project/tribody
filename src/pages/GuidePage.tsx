import { Link, useParams } from 'react-router-dom';
import { GUIDES, getGuide } from '../data';
import { GuideCard } from '../components/cards';
import { Page } from '../components/Layout';
import { Bullets, EmptyState, Section } from '../components/ui';
import { guideTitle, isKnownGuide } from '../lib/labels';
import NotFoundPage from './NotFoundPage';

export default function GuidePage() {
  const { id = '' } = useParams();
  if (!isKnownGuide(id)) return <NotFoundPage />;
  const g = getGuide(id);
  const others = GUIDES.filter((x) => x.id !== id).slice(0, 3);

  return (
    <Page title={guideTitle(id)} back="/guides">
      <header className="page-head">
        <span className="kicker">Guide</span>
        <h1>{guideTitle(id)}</h1>
        {g && (
          <p className="lead" style={{ color: 'var(--text)' }}>
            {g.summary}
          </p>
        )}
      </header>

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
          {g.sections.map((s, i) => (
            <section key={i} className="section" style={{ marginTop: i === 0 ? 24 : 32 }}>
              <h2 className="guide-h">
                <span className="kicker guide-h__num">{String(i + 1).padStart(2, '0')}</span>
                <span>{s.heading}</span>
              </h2>
              <SectionBody guideId={g.id} heading={s.heading} body={s.body} />
            </section>
          ))}
        </article>
      )}

      {others.length > 0 && (
        <Section kicker="More" title="ほかのガイド">
          <div className="stack stack--sm">
            {others.map((o) => (
              <GuideCard key={o.id} id={o.id} />
            ))}
          </div>
        </Section>
      )}
    </Page>
  );
}

const STAGE_RE = /^段階\s*(\d+)\s*[：:]\s*(.*)$/;

/**
 * Guide sections are plain string lists; show the ones that are really lists as lists:
 * checklists (「…チェック」) as check bullets, 「段階N：…」 lines as a numbered stage table,
 * the red-flag guide's signs as bullets, everything else as paragraphs.
 */
function SectionBody({ guideId, heading, body }: { guideId: string; heading: string; body: string[] }) {
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
              <p key={j}>{p}</p>
            ))}
          </div>
        )}
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
  return (
    <div className="prose" style={{ marginTop: 10 }}>
      {body.map((p, j) => (
        <p key={j}>{p}</p>
      ))}
    </div>
  );
}
