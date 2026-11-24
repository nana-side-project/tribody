# TriBody（トライボディ）— トライアスリートのための痛みと解剖ガイド

痛む場所をタップすると、**実際に傷んでいる可能性のある組織（筋・腱・滑液包・骨・神経）** を 2D 図解と動く 3D モデルで確認でき、
**どこをどう補強・ストレッチすれば予防・改善できるか** を、段階的なリハビリメニューとして学べるスマホ向け Web アプリ（PWA）です。

> この情報は一般的な教育目的です。診断ではありません。強い痛み・しびれ・腫れ・体重をかけられない等の
> 「受診の目安」に当てはまる場合は、医療機関を受診してください。

## できること

| 画面 | 内容 |
|---|---|
| からだ（ホーム） | 前・後ろ・足裏の人体図。痛む場所をタップ → 考えられる障害の候補 |
| 部位 | 肩 / 首・肩上部 / 腰・体幹 / 股関節・お尻 / 膝 / ふくらはぎ・すね / 足首・アキレス腱 / 足裏・足部 の詳細図、主な筋肉、スイム・バイク・ランでの負担 |
| 障害（26種） | 何が起きているか（2D の強調表示 + 3D で傷んでいる組織が赤く光る）、トライアスロンで起きる理由、症状、セルフチェック、受診の目安、3段階のリハビリ（落ち着かせる → 積み上げる → 復帰）、種目別の練習の工夫、参考文献 |
| 筋肉図鑑（46筋） | 起始・停止・作用・神経支配。3D で筋肉が**縮む（収縮）／伸びる（伸張）**様子をアニメーション表示 |
| エクササイズ（56種） | 3D アニメーション、やり方・意識するポイント・よくある間違い・回数の目安。マイメニューに追加可能 |
| マイメニュー | 選んだエクササイズと痛みログ（端末内に保存。サーバーには送信しません） |
| ガイド（6本） | 痛みのモニタリング、練習量の増やし方、すぐに受診すべきサイン、ラン復帰、補強の基本、バイクポジション |

扱っている障害: 水泳肩（肩峰下の痛み・腱板腱障害）、上腕二頭筋長頭腱障害、肩甲骨ジスキネジア、首・肩上部の痛み（バイク姿勢）、
殿筋腱障害、股関節前面の痛み、深殿部症候群、近位ハムストリング腱障害、内転筋関連の鼠径部痛、膝蓋大腿疼痛症候群、
腸脛靱帯症候群、膝蓋腱障害、鵞足炎、ふくらはぎの肉離れ、シンスプリント、脛骨疲労骨折、運動中の足のつり、
アキレス腱障害（中央部／付着部）、足首の捻挫・慢性足関節不安定症、後脛骨筋腱障害、腓骨筋腱障害、足底腱膜炎、
中足骨疲労骨折、モートン病、腰痛。

内容は各種診療ガイドライン・コンセンサス（JOSPT CPG、BJSM consensus など）をもとに書いています。
エビデンスの強さ（strong / moderate / limited / expert opinion）も各障害ページに表示します。

## 使い方（開発）

Node.js 20 以上。

```bash
npm install
npm run dev            # http://localhost:5173/
npm run typecheck      # TypeScript の型チェック
npm run validate       # コンテンツの整合性チェック（STRICT=1 で警告もエラー扱い）
npm run build          # dist/ に静的サイトを出力
npm run build:single   # dist-single/index.html に 1 ファイル版を出力（プレビュー用）
```

3D エンジンの確認用ページ: `npm run dev` のあと `http://localhost:5173/dev/engine.html`
（`?exercise=ex-squat`、`?muscle=gluteus-medius`、`?coverage=1` など。詳しくは [docs/ENGINE.md](docs/ENGINE.md)）。

## 公開（GitHub Pages など）

`base: './'` と HashRouter を使っているので、`dist/` をそのまま任意の静的ホスティングに置けば動きます（サブパスでも可）。

GitHub Pages の例（リポジトリの Settings → Pages → Source を「GitHub Actions」にして、次のファイルを追加）:

```yaml
# .github/workflows/pages.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

https で公開すると、オフラインでも使えるようにキャッシュされ、スマホの「ホーム画面に追加」でアプリのように使えます。

## 構成

| パス | 内容 |
|---|---|
| `src/data/` | 部位・痛む場所・障害・筋肉・エクササイズ・ガイドのデータ（`registry.ts` に全 ID、`content/*.ts` に本文） |
| `src/svg/` | 手描き SVG の人体図（ボディマップ）と部位ごとの解剖図 |
| `src/three/` | 3D 解剖ビューア（three.js）。骨格・皮膚・筋肉の「ひも」モデル、エクササイズのモーション、ラベル配置 |
| `src/pages/`, `src/components/` | 画面と UI 部品 |
| `docs/ARCHITECTURE.md` | 全体設計・デザイントークン・安全方針 |
| `docs/CONTENT_GUIDE.md` | 医学コンテンツの執筆ガイド（根拠とする文献、表記ルール、安全ルール） |
| `docs/ENGINE.md` | 3D エンジンの仕様（ランドマーク、筋肉の定義、クリップの書き方、確認用ページ） |

図版・3D モデルはすべてこのプロジェクトのために作成したもので、他の製品の画像やデータは使用していません。
