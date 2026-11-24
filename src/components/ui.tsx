// Small presentational primitives shared by pages.
import { useId, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GENERIC_PAIN_RULE } from '../lib/labels';
import { IconChevron, IconClose, IconInfo, IconSearch, IconShield } from './icons';

export function Section({
  id,
  kicker,
  title,
  desc,
  more,
  children,
  tight,
}: {
  id?: string;
  kicker?: string;
  title: ReactNode;
  desc?: ReactNode;
  more?: { to: string; label: string };
  children: ReactNode;
  tight?: boolean;
}) {
  const hid = useId();
  return (
    <section id={id} className={`section${tight ? ' section--tight' : ''}${id ? ' anchor' : ''}`} aria-labelledby={hid}>
      <div className="section__head">
        <div className="section__head-row">
          <div>
            {kicker && <span className="kicker">{kicker}</span>}
            <h2 id={hid}>{title}</h2>
          </div>
          {more && (
            <Link to={more.to} className="section__more">
              {more.label}
              <IconChevron />
            </Link>
          )}
        </div>
        {desc && <p className="section__desc">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  small,
}: {
  value: T;
  options: { id: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  small?: boolean;
}) {
  return (
    <div className={`seg${small ? ' seg--sm' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          className={`seg__btn${o.id === value ? ' is-active' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  options,
  onChange,
  label,
  idBase,
}: {
  value: T;
  options: { id: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  idBase: string;
}) {
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
    onChange(options[n].id);
    document.getElementById(`${idBase}-tab-${options[n].id}`)?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={o.id}
          id={`${idBase}-tab-${o.id}`}
          type="button"
          role="tab"
          aria-selected={o.id === value}
          aria-controls={`${idBase}-panel`}
          tabIndex={o.id === value ? 0 : -1}
          className={`tabs__btn${o.id === value ? ' is-active' : ''}`}
          onClick={() => onChange(o.id)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  children,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  text?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`empty${compact ? ' empty--compact' : ''}`}>
      {icon && <div className="empty__icon">{icon}</div>}
      <p className="empty__title">{title}</p>
      {text && <p className="empty__text">{text}</p>}
      {children && <div className="empty__actions">{children}</div>}
    </div>
  );
}

export function Disclaimer() {
  return (
    <div className="callout callout--disclaimer">
      <IconInfo />
      <p>
        この情報は一般的な教育目的です。診断ではありません。{' '}
        <Link to="/about" className="link">
          詳しく
        </Link>
      </p>
    </div>
  );
}

export function PainRuleCallout({ text, guideLink = true }: { text?: string; guideLink?: boolean }) {
  return (
    <div className="callout callout--rule">
      <IconShield />
      <div>
        <p className="callout__title">痛みのルール</p>
        <p>{text || GENERIC_PAIN_RULE}</p>
        {guideLink && (
          <p className="small" style={{ marginTop: 6 }}>
            <Link to="/guide/pain-monitoring" className="link">
              痛みのモニタリングについて読む
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="search" role="search">
      <IconSearch />
      <input
        className="input"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {value && (
        <button type="button" className="icon-btn icon-btn--muted search__clear" aria-label="検索をクリア" onClick={() => onChange('')}>
          <IconClose />
        </button>
      )}
    </div>
  );
}

export function Bullets({ items, check, color }: { items: string[]; check?: boolean; color?: string }) {
  if (!items?.length) return null;
  return (
    <ul className={`bullets${check ? ' bullets--check' : ''}`} style={color ? ({ '--c': color } as CSSProperties) : undefined}>
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}
