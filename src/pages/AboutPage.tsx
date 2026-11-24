import { Link } from 'react-router-dom';
import pkg from '../../package.json';
import { conditions, exercises, muscles } from '../data';
import { AppMark } from '../components/Logo';
import { IconAlert, IconAuto, IconMoon, IconSun } from '../components/icons';
import { Page } from '../components/Layout';
import { Bullets, Section, Segmented } from '../components/ui';
import { isPersistent } from '../lib/storage';
import { useTheme, type ThemePref } from '../lib/useTheme';

export default function AboutPage() {
  const [theme, setTheme] = useTheme();
  const persistent = isPersistent();

  return (
    <Page title="使い方・免責事項" back="/guides">
      <header className="page-head" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <AppMark className="app-icon-large" />
        <div>
          <span className="kicker">About</span>
          <h1 style={{ fontSize: 22 }}>TriBody トライボディ</h1>
          <p className="small muted">トライアスリートのための痛みと解剖ガイド</p>
        </div>
      </header>

      <Section kicker="How to use" title="使い方">
        <div className="card card--lg">
          <ol className="steps">
            <li>
              <strong>痛む場所をタップ</strong>
              <br />
              <span className="muted">「からだ」タブの人体図で、痛む場所をタップします。考えられる原因が「よくある順」に表示されます。</span>
            </li>
            <li>
              <strong>どこが傷んでいるかを見る</strong>
              <br />
              <span className="muted">障害のページで、実際に痛んでいる筋肉・腱・滑液包・骨を図と3Dで確認できます。</span>
            </li>
            <li>
              <strong>3ステップで取り組む</strong>
              <br />
              <span className="muted">① 落ち着ける → ② 強くする → ③ 競技へ戻る。各ステップのエクササイズをマイメニューに追加できます。</span>
            </li>
            <li>
              <strong>記録して変化を見る</strong>
              <br />
              <span className="muted">痛みを0〜10で記録すると、場所ごとの推移がグラフで見られます。</span>
            </li>
          </ol>
        </div>
      </Section>

      <Section kicker="Disclaimer" title="免責事項（必ずお読みください）">
        <div className="redflags" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <Bullets
            items={[
              'TriBodyは一般的な教育目的の情報を提供するアプリです。医療行為・診断・治療の代わりにはなりません。',
              '表示される障害名は「痛む場所から考えられる可能性」です。実際の原因は医師の診察や検査でしか確定できません。',
              '痛みが続く・悪化する・練習に支障がある場合は、整形外科（スポーツ整形外科）や理学療法士に相談してください。',
              'エクササイズは痛みのルール（運動中の痛みが10段階で3以下、翌朝に悪化しない）を守り、無理のない範囲で行ってください。',
              '持病のある方、手術後の方、妊娠中の方は、運動を始める前に主治医に相談してください。',
            ]}
          />
        </div>
        <div className="redflags" style={{ marginTop: 12 }}>
          <p className="redflags__head">
            <IconAlert />
            緊急のとき
          </p>
          <p className="redflags__lead" style={{ fontSize: 13.5, color: 'var(--text)' }}>
            胸の痛み・息苦しさ、突然の強い頭痛、意識がおかしい、激しいけが、急なしびれや麻痺、排尿・排便の異常、お尻まわりの感覚の低下などがある場合は、
            ためらわずに救急（119）または医療機関に連絡してください。
          </p>
          <p className="redflags__note" style={{ borderTop: 0, paddingTop: 0, marginTop: 8 }}>
            <Link to="/guide/red-flags" className="link">
              すぐに受診すべきサイン
            </Link>
          </p>
        </div>
      </Section>

      <Section kicker="Your data" title="データの保存について">
        <div className="card">
          <p style={{ fontSize: 14.5, lineHeight: 1.8 }}>
            マイメニュー・チェック・痛みログ・表示設定は、<strong>この端末のブラウザ内にのみ</strong>保存されます。サーバーには送信されません。
          </p>
          <p className="small muted" style={{ marginTop: 8 }}>
            ブラウザのデータを消去すると記録も消えます。痛みログは「マイメニュー → 痛みログ」からJSONで書き出せます。
          </p>
          {!persistent && (
            <p className="small" style={{ marginTop: 8, color: 'var(--danger)', fontWeight: 700 }}>
              現在の環境ではブラウザに保存できません（プライベートモードなど）。ページを閉じると記録は消えます。
            </p>
          )}
        </div>
      </Section>

      <Section kicker="Appearance" title="表示テーマ">
        <div className="card">
          <Segmented<ThemePref>
            label="表示テーマ"
            value={theme}
            onChange={setTheme}
            options={[
              {
                id: 'auto',
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconAuto style={{ width: 16, height: 16 }} />
                    自動
                  </span>
                ),
              },
              {
                id: 'light',
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconSun style={{ width: 16, height: 16 }} />
                    ライト
                  </span>
                ),
              },
              {
                id: 'dark',
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconMoon style={{ width: 16, height: 16 }} />
                    ダーク
                  </span>
                ),
              },
            ]}
          />
          <p className="tiny" style={{ marginTop: 10 }}>
            「自動」は端末の設定（ライト／ダーク）に合わせます。
          </p>
        </div>
      </Section>

      <Section kicker="References" title="参考文献の方針">
        <div className="card">
          <Bullets
            items={[
              '各障害の解説は、最新の診療ガイドライン（JOSPT CPGなど）や国際的なコンセンサス声明、主要な臨床研究にもとづいて作成しています。',
              '「根拠の強さ」は、研究でどの程度支持されているかの目安（強い／中程度／限定的／専門家の意見）です。',
              '参考文献のリンクは、存在を確認できたものだけを掲載しています。',
              '解剖図・3Dモデルはすべて本アプリのオリジナルで、学習用に簡略化しています。',
            ]}
          />
        </div>
      </Section>

      <Section kicker="Version" title="バージョン">
        <div className="card card--flush">
          <ul className="rows">
            <li className="row">
              <span className="row__main">バージョン</span>
              <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {pkg.version}
              </span>
            </li>
            <li className="row">
              <span className="row__main">収録</span>
              <span className="muted small">
                障害 {conditions.length} · 筋肉 {muscles.length} · エクササイズ {exercises.length}
              </span>
            </li>
          </ul>
        </div>
      </Section>
    </Page>
  );
}
