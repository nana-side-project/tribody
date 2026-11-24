import { Link } from 'react-router-dom';
import { Page } from '../components/Layout';

export default function NotFoundPage() {
  return (
    <Page title="ページが見つかりません" back="/">
      <div className="notfound">
        <p className="notfound__code">404</p>
        <h1 style={{ marginTop: 12, fontSize: 22 }}>ページが見つかりません</h1>
        <p className="lead">URLが間違っているか、ページが移動した可能性があります。</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn--primary">
            ホームへ
          </Link>
          <Link to="/guides" className="btn btn--secondary">
            ガイドを見る
          </Link>
        </div>
      </div>
    </Page>
  );
}
