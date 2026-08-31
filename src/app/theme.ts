/* ------------------------------------------------------------------ *
 * STRATO design tokens — JS side.
 *
 * Colours, families and easings are NOT duplicated here: each constant
 * resolves to the matching custom property declared in
 * src/styles/theme.css, so there is exactly one source of truth.
 *
 * Breakpoint-dependent sizes DO live here, because the public site
 * resolves them in JS (useViewport -> bpv) rather than via media
 * queries. Values are hard px per breakpoint — no clamp, no vw.
 * ------------------------------------------------------------------ */

import type { CSSProperties } from 'react';

/* ---------------------------------- palette ---------------------------------- */

export const PAGE = 'var(--page)';
export const SURFACE = 'var(--surface)';
export const SURFACE_ALT = 'var(--surface-alt)';
export const SURFACE_DARK = 'var(--surface-dark)';

export const INK = 'var(--ink)';
export const INK_70 = 'var(--ink-70)';
export const INK_60 = 'var(--ink-60)';
export const INK_50 = 'var(--ink-50)';
export const INK_20 = 'var(--ink-20)';

export const ON_DARK = 'var(--on-dark)';
export const ON_DARK_92 = 'var(--on-dark-92)';
export const ON_DARK_70 = 'var(--on-dark-70)';
export const HEADING_ON_DARK = 'var(--heading-on-dark)';

/** Deep oxblood. Accent only — active states and the dark-section wash. */
export const ACCENT = 'var(--accent)';
export const ACCENT_DEEP = 'var(--accent-deep)';
/** Faint red wash layered over black so the dark sections aren't flat. */
export const DARK_WASH = 'var(--dark-wash)';
/** Same wash entering from the opposite corner, for the footer. */
export const DARK_WASH_ALT = 'var(--dark-wash-alt)';

export const HAIRLINE = 'var(--hairline)';
export const HAIRLINE_STRONG = 'var(--hairline-strong)';
export const PLACEHOLDER = 'var(--placeholder)';
export const CARD_FILL = 'var(--card-fill)';
export const PANEL_SCRIM = 'var(--panel-scrim)';

/* ---------------------------------- families ---------------------------------- */

export const SANS = 'var(--font-sans)';
export const SERIF = 'var(--font-serif)';

/* ---------------------------------- motion ---------------------------------- */

export const EASE_BTN = 'cubic-bezier(.44,0,.56,1)';
export const EASE_ZOOM = 'cubic-bezier(.25,.1,.25,1)';
export const EASE_SLIDE = 'cubic-bezier(.22,1,.36,1)';

export const DUR_BTN = 200;
export const DUR_ZOOM = 550;
export const DUR_SLIDE = 700;

/* ---------------------------------- breakpoints ---------------------------------- */

export type BP = 'd' | 't' | 'p';

/** desktop >= 1440, tablet 810–1439.98, phone <= 809.98 */
export function bpOf(w: number): BP {
    if (w >= 1440) return 'd';
    if (w >= 810) return 't';
    return 'p';
}

/** Pick the value for the current breakpoint. */
export function bpv<T>(bp: BP, d: T, t: T, p: T): T {
    return bp === 'd' ? d : bp === 't' ? t : p;
}

/* ---------------------------------- rhythm ---------------------------------- */

/** Horizontal page gutter. */
export const side = (bp: BP) => bpv(bp, 80, 50, 25);

/** Vertical section padding. */
export const sectionY = (bp: BP) => bpv(bp, 170, 100, 80);

export const NAV_H = 74;

/* ---------------------------------- type roles ---------------------------------- */

export const tHeroH1 = (bp: BP): CSSProperties => ({
    fontFamily: SANS, fontWeight: 500, fontSize: bpv(bp, 40, 35, 23), lineHeight: '1.1em', letterSpacing: 0,
});
export const tHeroSub = (bp: BP): CSSProperties => ({
    fontFamily: SANS, fontWeight: 400, fontSize: bpv(bp, 22, 20, 12), lineHeight: '1.1em', letterSpacing: 0,
});
export const tHeading = (bp: BP): CSSProperties => ({
    fontFamily: SERIF, fontWeight: 400, fontSize: bpv(bp, 35, 30, 22), lineHeight: '1.3em', letterSpacing: '-0.01em',
});
export const tDeck = (bp: BP, onBlack = false): CSSProperties => ({
    fontFamily: SANS, fontWeight: 400, fontSize: bpv(bp, 16, 14, 12),
    lineHeight: onBlack ? '1.5em' : '1.4em', letterSpacing: '-0.01em',
});
export const tCardTitle = (bp: BP, big = false): CSSProperties => ({
    fontFamily: SANS, fontWeight: 500,
    fontSize: big ? bpv(bp, 25, 23, 15) : bpv(bp, 20, 17, 15),
    lineHeight: '1.2em', letterSpacing: 0,
});
export const tCardBody = (bp: BP): CSSProperties => ({
    fontFamily: SANS, fontWeight: 400, fontSize: bpv(bp, 15, 12, 12), lineHeight: '1.3em', letterSpacing: 0,
});
export const tCatLabel: CSSProperties = {
    fontFamily: SANS, fontWeight: 500, fontSize: 18, lineHeight: '1.3em', letterSpacing: '-0.01em',
};
export const tCatSub: CSSProperties = {
    fontFamily: SANS, fontWeight: 400, fontSize: 12, lineHeight: '1.4em', letterSpacing: '-0.01em',
};
export const tBtn = (bp: BP): CSSProperties => ({
    fontFamily: SANS, fontWeight: 400, fontSize: bpv(bp, 15, 16, 15), lineHeight: '1.3em', letterSpacing: 0,
});
/**
 * The STRATO wordmark. Matches the logo: heavy grotesque, tight tracking,
 * no letterspacing. Tracking loosens slightly at small sizes so the heavy
 * weight doesn't close up.
 */
export const tWordmark = (size: number): CSSProperties => ({
    fontFamily: SANS,
    fontWeight: 800,
    fontSize: size,
    lineHeight: '1em',
    letterSpacing: size >= 32 ? '-0.02em' : '-0.01em',
});

export const tNavLink: CSSProperties = {
    fontFamily: SANS, fontWeight: 500, fontSize: 15, lineHeight: '1.2em', letterSpacing: 0,
};
export const tFootHead = (bp: BP): CSSProperties => ({
    fontFamily: SANS, fontWeight: 700, fontSize: bpv(bp, 18, 13, 18), lineHeight: '1.3em', letterSpacing: 0,
});
export const tFootBody = (bp: BP): CSSProperties => ({
    fontFamily: SANS, fontWeight: 400, fontSize: bpv(bp, 16, 10, 16), lineHeight: '1.3em', letterSpacing: 0,
});
