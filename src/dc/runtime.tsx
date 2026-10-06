// Small helpers the converted screens use. They reproduce how the prototype's
// template runtime rendered things, so the DOM (and therefore the look) matches.
import { Fragment, isValidElement, type CSSProperties, type ReactNode } from 'react';

/** The flat values object returned by CatPalLogic.renderVals(). */
export type Vals = Record<string, any>;

const kebabToCamel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/** Inline style string -> React style object (same naive split as the runtime). */
export function css(src: string): CSSProperties {
  const o: Record<string, string> = {};
  for (const decl of String(src).split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    o[prop.startsWith('--') ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim();
  }
  return o as CSSProperties;
}

/** Value used inside a mixed string attribute: undefined/null become "". */
export const R = (x: unknown) => (x ?? '') as string | number;

/** {{ value }} in text: rendered in a span, booleans/null/undefined render nothing. */
export function I(x: unknown): ReactNode {
  if (x === undefined || x === null || typeof x === 'boolean') return null;
  if (isValidElement(x) || Array.isArray(x)) return x as ReactNode;
  return <span className="sc-interp">{String(x)}</span>;
}

/** <sc-for list="…" as="…">: render each item; non-arrays render nothing. */
export function each<T = any>(list: T[] | undefined | null, render: (item: T, index: number) => ReactNode): ReactNode {
  if (!Array.isArray(list)) return null;
  return list.map((item, i) => <Fragment key={i}>{render(item, i)}</Fragment>);
}
