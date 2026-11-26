import { Link } from 'react-router-dom';
import { GUIDES } from '../data';
import { GuideCard } from '../components/cards';
import { IconChevron, IconInfo } from '../components/icons';
import { Page } from '../components/Layout';
import { Section } from '../components/ui';
import { isLearnGuide } from '../lib/labels';

export default function GuidesPage() {
  // learning guides (figures, 3D, exercise cards) first, then the articles on pain, load and when to see a doctor
  const learn = GUIDES.filter((g) => isLearnGuide(g.id));
  const basics = GUIDES.filter((g) => !isLearnGuide(g.id));
  return (
    <Page title="ガイド">
      <header className="page-head">
        <span aria-hidden="true" lang="en" className="kicker">Guides</span>
        <h1>ガイド</h1>
        <p className="lead">からだの仕組みを図と3Dで学べるガイドと、痛みとの付き合い方・練習量の増やし方・受診の目安など、回復と予防の土台になる考え方をまとめました。</p>
      </header>

      {learn.length > 0 && (
        <Section kicker="Learn" title="からだの仕組みを学ぶ" desc="図と3Dでしくみを確かめ、整える・鍛える種目をまとめてマイメニューに追加できます。">
          <div className="stack">
            {learn.map((g) => (
              <GuideCard key={g.id} id={g.id} features />
            ))}
          </div>
        </Section>
      )}

      {learn.length > 0 ? (
        <Section kicker="Basics" title="回復と予防の基本">
          <div className="stack">
            {basics.map((g) => (
              <GuideCard key={g.id} id={g.id} />
            ))}
          </div>
        </Section>
      ) : (
        <div className="stack" style={{ marginTop: 20 }}>
          {basics.map((g) => (
            <GuideCard key={g.id} id={g.id} />
          ))}
        </div>
      )}

      <Section kicker="About" title="このアプリについて">
        <Link to="/about" className="card">
          <div className="card__row">
            <span className="ex-card__icon" aria-hidden="true">
              <IconInfo />
            </span>
            <div className="grow">
              <p className="card__title">使い方・免責事項・設定</p>
              <p className="card__sub">表示テーマの切り替え、データの保存について</p>
            </div>
            <IconChevron className="chev" />
          </div>
        </Link>
      </Section>
    </Page>
  );
}
