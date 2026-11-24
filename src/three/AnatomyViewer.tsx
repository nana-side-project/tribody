// <AnatomyViewer> — React wrapper around the 3D engine + the compact Japanese player UI.
// Default export (lazy-loaded by ./index.tsx). Props: AnatomyViewerProps (./contract.ts).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnatomyViewerProps } from './contract';
import { Engine, type EngineUiState, type ViewSpec, WebGLUnavailableError } from './engine';
import type { BasePoseName, CameraPresetName, Pose } from './rig';
import './viewer.css';

/** Extra options used by the dev harness (dev/engine.tsx). Not part of the public contract. */
export interface DevOptions {
  pose?: BasePoseName;
  cam?: CameraPresetName;
  skin?: number;
  all?: boolean;
  debug?: boolean;
  t?: number;
  lm?: string;
  joints?: Pose['joints'];
  onEngine?: (e: Engine | null) => void;
}

const INITIAL_UI: EngineUiState = { playing: false, animated: false, note: null, legend: false, speed: 1, mode: 'pose' };

export default function AnatomyViewer(props: AnatomyViewerProps & { dev?: DevOptions }) {
  const { height = 320, controls = true, autoPlay = true, labels = true, className, onPhase, dev } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const scrubRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const onPhaseRef = useRef(onPhase);
  onPhaseRef.current = onPhase;
  const onEngineRef = useRef(dev?.onEngine);
  onEngineRef.current = dev?.onEngine;
  const [ui, setUi] = useState<EngineUiState>(INITIAL_UI);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<null | 'nogl' | 'lost'>(null);
  const [gen, setGen] = useState(0);

  const spec: ViewSpec = useMemo(
    () => ({
      muscle: props.muscle,
      exercise: props.exercise,
      highlights: props.highlights,
      focus: props.focus,
      labels,
      autoPlay,
      pose: dev?.pose,
      cam: dev?.cam,
      skin: dev?.skin,
      all: dev?.all,
      debug: dev?.debug,
      t: dev?.t,
      lm: dev?.lm,
      joints: dev?.joints,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      props.muscle,
      props.exercise,
      JSON.stringify(props.highlights ?? null),
      props.focus,
      labels,
      autoPlay,
      dev?.pose,
      dev?.cam,
      dev?.skin,
      dev?.all,
      dev?.debug,
      dev?.t,
      dev?.lm,
      JSON.stringify(dev?.joints ?? null),
    ],
  );

  useEffect(() => {
    const host = hostRef.current;
    const overlay = overlayRef.current;
    if (!host || !overlay) return;
    let engine: Engine;
    try {
      engine = new Engine(host, overlay, {
        onPhase: (l) => {
          setPhase(l);
          onPhaseRef.current?.(l);
        },
        onTime: (t) => {
          const el = scrubRef.current;
          if (el && !dragging.current) {
            el.value = String(Math.round(t * 1000));
            el.style.setProperty('--p', `${(t * 100).toFixed(1)}%`);
          }
        },
        onUi: setUi,
        onError: () => setError('lost'),
      });
    } catch (e) {
      setError(e instanceof WebGLUnavailableError ? 'nogl' : 'nogl');
      return;
    }
    engineRef.current = engine;
    setError(null);
    onEngineRef.current?.(engine);
    return () => {
      engine.dispose();
      engineRef.current = null;
      onEngineRef.current?.(null);
    };
  }, [gen]);

  useEffect(() => {
    const en = engineRef.current;
    if (!en) return;
    en.uiControls = controls !== false;
    en.configure(spec);
  }, [spec, gen, controls]);

  // sync the scrubber when the bar (re)appears
  useEffect(() => {
    const el = scrubRef.current;
    const en = engineRef.current;
    if (el && en) {
      el.value = String(Math.round(en.t * 1000));
      el.style.setProperty('--p', `${(en.t * 100).toFixed(1)}%`);
    }
  }, [ui.animated, ui.playing]);

  const e = () => engineRef.current;
  const showBar = controls !== false;
  const animated = ui.animated;

  return (
    <div className={'tb3d' + (className ? ' ' + className : '')} style={{ height }}>
      <div ref={hostRef} className="tb3d-host" />
      <div ref={overlayRef} className="tb3d-overlay">
        {showBar && animated && phase ? (
          <div className="tb3d-phase" aria-live="polite">
            <span className="tb3d-phase-dot" />
            {phase}
          </div>
        ) : null}
        {ui.legend ? (
          <div className="tb3d-legend" aria-label="起始は橙、停止は青">
            <span>
              <i className="o" />
              起始
            </span>
            <span>
              <i className="n" />
              停止
            </span>
          </div>
        ) : null}
        {ui.note ? <div className={'tb3d-note' + (showBar ? '' : ' low')}>{ui.note}</div> : null}
        {showBar && !error ? (
          animated ? (
            <div className="tb3d-bar" role="group" aria-label="アニメーション操作">
              <button
                type="button"
                className="tb3d-btn tb3d-play"
                aria-label={ui.playing ? '一時停止' : '再生'}
                onClick={() => e()?.toggle()}
              >
                {ui.playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <input
                ref={scrubRef}
                className="tb3d-scrub"
                type="range"
                min={0}
                max={1000}
                defaultValue={0}
                aria-label="タイムライン"
                onPointerDown={() => (dragging.current = true)}
                onPointerUp={() => (dragging.current = false)}
                onPointerCancel={() => (dragging.current = false)}
                onInput={(ev) => {
                  const v = Number((ev.target as HTMLInputElement).value) / 1000;
                  (ev.target as HTMLInputElement).style.setProperty('--p', `${(v * 100).toFixed(1)}%`);
                  e()?.setTime(v);
                }}
              />
              <button
                type="button"
                className="tb3d-btn tb3d-speed"
                aria-label={`再生速度 ${ui.speed === 1 ? '1倍' : '0.5倍'}（タップで切替）`}
                onClick={() => e()?.setSpeed(ui.speed === 1 ? 0.5 : 1)}
              >
                {ui.speed === 1 ? '1×' : '0.5×'}
              </button>
              <button type="button" className="tb3d-btn" aria-label="視点リセット" title="視点リセット" onClick={() => e()?.resetView()}>
                <ResetIcon />
              </button>
            </div>
          ) : (
            <button type="button" className="tb3d-btn tb3d-float" aria-label="視点リセット" title="視点リセット" onClick={() => e()?.resetView()}>
              <ResetIcon />
            </button>
          )
        ) : null}
      </div>
      {error ? (
        <div className="tb3d-error" role="alert">
          {error === 'nogl' ? (
            <p>
              この端末・ブラウザでは3D表示を利用できません。
              <br />
              <small>（WebGL が無効になっている可能性があります）</small>
            </p>
          ) : (
            <p>
              3D表示が一時的に停止しました。
              <br />
              <button
                type="button"
                className="tb3d-retry"
                onClick={() => {
                  setError(null);
                  setGen((g) => g + 1);
                }}
              >
                再表示する
              </button>
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.87l10.4-6.5a1 1 0 0 0 0-1.74L9.5 4.63A1 1 0 0 0 8 5.5z" fill="currentColor" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
    </svg>
  );
}
function ResetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.5 4.5v3.6h3.6" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
