import { Link } from 'react-router-dom';
import { GUIDES } from '../data';
import { GuideCard } from '../components/cards';
import { IconChevron, IconInfo } from '../components/icons';
import { Page } from '../components/Layout';
import { Section } from '../components/ui';

export default function GuidesPage() {
  return (
    <Page title="ガイド">
      <header className="page-head">
        <span className="kicker">Guides</span>
        <h1>ガイド</h1>
        <p className="lead">痛みとの付き合い方、練習量の増やし方、受診の目安など。回復と予防の土台になる考え方をまとめました。</p>
      </header>

      <div className="stack" style={{ marginTop: 20 }}>
        {GUIDES.map((g) => (
          <GuideCard key={g.id} id={g.id} />
        ))}
      </div>

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
