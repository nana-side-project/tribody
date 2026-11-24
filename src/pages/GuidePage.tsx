import { Link, useParams } from 'react-router-dom';
import { GUIDES, getGuide } from '../data';
import { GuideCard } from '../components/cards';
import { Page } from '../components/Layout';
import { EmptyState, Section } from '../components/ui';
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
              <div className="prose" style={{ marginTop: 10 }}>
                {s.body.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
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
