import {
    Fragment,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type FormEvent,
    type ReactNode,
    type TouchEvent as ReactTouchEvent,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Instagram, Lock, Mail, Play } from 'lucide-react';
import {
    useStratoData,
    visibleProjects,
    categoriesOf,
    getYouTubeId,
    posterOf,
    submitContact,
    verifyAccessCode,
    type Project,
    type SocialLink,
} from './useStratoData';
import {
    SANS,
    SERIF,
    EASE_BTN,
    EASE_ZOOM,
    EASE_SLIDE,
    INK_70,
    INK_60,
    INK_50,
    INK_20,
    ON_DARK_70,
    HEADING_ON_DARK,
    PLACEHOLDER,
    PANEL_SCRIM,
    ACCENT,
    DARK_WASH,
    DARK_WASH_ALT,
    side,
    bpOf,
    bpv,
    tHeroH1,
    tHeroSub,
    tHeading,
    tDeck,
    tCardTitle,
    tCardBody,
    tBtn,
    tFootHead,
    tFootBody,
    tWordmark,
    type BP,
} from '../theme';
import {
    resolveSection,
    linesOf,
    type SectionItem,
} from '../content';

/* ------------------------------------------------------------------ *
 * STRATO public site — nxn.ai-derived layout, STRATO content.
 * Fonts: ABC Diatype -> Inter, PP Editorial New -> Instrument Serif.
 * Palette is strictly black / white / grey. Radius 0 everywhere.
 *
 * Colour, family, motion and rhythm tokens live in ../theme
 * (backed by custom properties in src/styles/theme.css).
 * ------------------------------------------------------------------ */

/** Serif heading colour when sitting on a black section. */
const HEADING_ON_BLACK = HEADING_ON_DARK;

/* ---------------------------------- viewport ---------------------------------- */

function useViewport() {
    const [w, setW] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));
    useEffect(() => {
        const onResize = () => setW(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return { w, bp: bpOf(w) };
}

function useMeasure<T extends HTMLElement>() {
    const ref = useRef<T | null>(null);
    const [width, setWidth] = useState(0);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        setWidth(el.getBoundingClientRect().width);
        const ro = new ResizeObserver((entries) => {
            for (const e of entries) setWidth(e.contentRect.width);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, width] as const;
}

/* ---------------------------------- content ---------------------------------- *
 * All copy now lives in ../content (SECTION_DEFS) and is merged with the
 * `sections` Firestore collection by resolveSection(). Nothing below is
 * hardcoded; the registry defaults are what ships when the DB is empty.
 * ------------------------------------------------------------------------- */

function posterFor(p?: Project): string | undefined {
    if (!p) return undefined;
    const direct = posterOf(p);
    if (direct) return direct;
    if (p.thumbnailUrl) return p.thumbnailUrl;
    const yt = getYouTubeId(p.youtubeUrl);
    return yt ? `https://img.youtube.com/vi/${yt}/maxresdefault.jpg` : undefined;
}

/**
 * Media-fragment seek so the browser paints the first frame even when a project
 * has no thumbnail uploaded. Without it a poster-less <video> renders black.
 */
function videoSrc(url?: string) {
    if (!url) return undefined;
    return url.includes('#') ? url : `${url}#t=0.1`;
}

function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------------------------------- shared bits ---------------------------------- */

interface OutlineButtonProps {
    label: string;
    onClick?: () => void;
    tone?: 'onDark' | 'onLight';
    bp: BP;
    type?: 'button' | 'submit';
    disabled?: boolean;
}

/** padding 13 / 15 / 14-15, border 1.5 / 1 / 2, square. Hover: border -> 0, fill #000. */
function OutlineButton({ label, onClick, tone = 'onLight', bp, type = 'button', disabled }: OutlineButtonProps) {
    const [hover, setHover] = useState(false);
    const bw = bpv(bp, 1.5, 1, 2);
    const pad = bpv(bp, '13px', '15px', '14px 15px');
    const rest = tone === 'onDark' ? '#fff' : '#000';
    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                ...tBtn(bp),
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'min-content',
                whiteSpace: 'nowrap',
                padding: pad,
                borderStyle: 'solid',
                borderWidth: hover ? 0 : bw,
                borderColor: rest,
                borderRadius: 0,
                background: hover ? '#000' : 'transparent',
                color: hover ? '#fff' : rest,
                cursor: disabled ? 'default' : 'pointer',
                transition: `background 200ms ${EASE_BTN}, border-width 200ms ${EASE_BTN}, color 200ms ${EASE_BTN}`,
            }}
        >
            {label}
        </button>
    );
}

interface SectionTitleProps {
    bp: BP;
    heading: string;
    deck: ReactNode;
    children?: ReactNode;
}

/** Centred B1 / C1 / D1 title stack. */
function CenteredTitle({ bp, heading, deck, children }: SectionTitleProps) {
    return (
        <div
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: children ? bpv(bp, 22, 13, 12) : 0,
                padding: `0 ${side(bp)}px`,
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: bpv(bp, 10, 10, 8) }}>
                <h2 style={{ ...tHeading(bp), color: '#000', margin: 0, textAlign: 'center' }}>{heading}</h2>
                <p style={{ ...tDeck(bp), color: INK_70, margin: 0, textAlign: 'center', maxWidth: bpv(bp, 620, 520, 420) }}>
                    {deck}
                </p>
            </div>
            {children}
        </div>
    );
}

/* ---------------------------------- 0. nav ---------------------------------- */

interface NavBarProps {
    bp: BP;
    solid: boolean;
    onRequestAccess: () => void;
    menuOpen: boolean;
    setMenuOpen: (v: boolean) => void;
}

const NAV_LINKS: { label: string; target: string }[] = [
    { label: 'WORK', target: 'work' },
    { label: 'STUDIO', target: 'studio' },
];

function NavLink({ label, onClick, size = 15 }: { label: string; onClick: () => void; size?: number }) {
    const [hover, setHover] = useState(false);
    return (
        <motion.button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            animate={{ fontWeight: hover ? 700 : 500 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26, duration: 0.4 }}
            style={{
                fontFamily: SANS, fontSize: size, lineHeight: '1.2em', letterSpacing: 0,
                color: '#000', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            }}
        >
            {label}
        </motion.button>
    );
}

function NavBar({ bp, solid, onRequestAccess, menuOpen, setMenuOpen }: NavBarProps) {
    const phone = bp === 'p';
    const open = phone && menuOpen;

    const go = (target: string) => {
        setMenuOpen(false);
        scrollToId(target);
    };

    return (
        <nav
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
                height: open ? '100vh' : 74,
                display: 'flex',
                flexDirection: open ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: open ? 'flex-start' : 'center',
                gap: open ? 67 : 0,
                padding: open ? '17px 20px' : phone ? '10px 20px' : '16px 24px',
                background: open || solid ? '#fff' : 'rgba(255,255,255,0)',
                transition: 'none',
            }}
        >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                    type="button"
                    onClick={() => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    style={{
                        ...tWordmark(phone ? 18 : 20),
                        color: '#000', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    }}
                >
                    STRATO
                </button>

                {phone ? (
                    <button
                        type="button"
                        aria-label={open ? 'Close menu' : 'Open menu'}
                        onClick={() => setMenuOpen(!menuOpen)}
                        style={{
                            display: 'flex', flexDirection: 'column', gap: 2, background: 'transparent',
                            border: 'none', padding: 4, cursor: 'pointer',
                        }}
                    >
                        {open ? (
                            <span style={{ fontFamily: SANS, fontSize: 19, fontWeight: 500, color: '#000', lineHeight: '1em' }}>✕</span>
                        ) : (
                            <>
                                <span style={{ width: 17, height: 3, background: '#000', display: 'block' }} />
                                <span style={{ width: 17, height: 3, background: '#000', display: 'block' }} />
                                <span style={{ width: 17, height: 3, background: '#000', display: 'block' }} />
                            </>
                        )}
                    </button>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: bpv(bp, 54, 34, 20) }}>
                        {NAV_LINKS.map((l) => (
                            <NavLink key={l.label} label={l.label} onClick={() => go(l.target)} />
                        ))}
                        {/* Access is a quiet lock, not a filled CTA — same
                          * treatment as the lock in the work section. */}
                        <button
                            type="button"
                            onClick={onRequestAccess}
                            title="비공개 작업물 보기"
                            aria-label="비공개 작업물 접근 코드 입력"
                            style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 30, height: 30, flex: '0 0 auto',
                                background: 'transparent', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 0,
                                color: '#000', cursor: 'pointer',
                                transition: `border-color 200ms ${EASE_BTN}`,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#000'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'; }}
                        >
                            <Lock size={14} strokeWidth={1.5} />
                        </button>
                    </div>
                )}
            </div>

            {open && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32, width: '100%' }}>
                    {NAV_LINKS.map((l) => (
                        <div key={l.label} style={{ width: '100%', paddingTop: 7, borderTop: '1px solid rgba(0,0,0,.6)' }}>
                            <NavLink label={l.label} onClick={() => go(l.target)} size={19} />
                        </div>
                    ))}
                    <div style={{ width: '100%', paddingTop: 7, borderTop: '1px solid rgba(0,0,0,.6)' }}>
                        <NavLink label="REQUEST ACCESS" onClick={() => { setMenuOpen(false); onRequestAccess(); }} size={19} />
                    </div>
                </div>
            )}
        </nav>
    );
}

/* ---------------------------------- 1. hero ---------------------------------- */

interface HeroProps {
    bp: BP;
    title: string;
    sub: string;
    poster?: string;
    /** One or two clips. Two are played in alternation, looping forever. */
    videoSrcs: string[];
    onCta: () => void;
    heroRef: (el: HTMLElement | null) => void;
}

/** How long each hero clip is shown before handing over to the next one. */
const HERO_CLIP_SECONDS = 10;
/** How far ahead of the handover the next clip starts buffering. */
const HERO_WARM_LEAD_SECONDS = 3;

function Hero({ bp, title, sub, poster, videoSrcs, onCta, heroRef }: HeroProps) {
    const videoEls = useRef<(HTMLVideoElement | null)[]>([]);
    const [clip, setClip] = useState(0);
    /** Indices allowed to buffer — the first clip immediately, others on cue. */
    const [warmed, setWarmed] = useState<number[]>([0]);
    /** The clip being faded out from, held opaque underneath during handover. */
    const [prev, setPrev] = useState<number | null>(null);
    const lastActive = useRef(0);

    const count = Math.max(1, videoSrcs.length);
    const single = videoSrcs.length <= 1;
    const active = clip % count;

    /* Reset to the first clip if the source list changes underneath us. */
    useEffect(() => { setClip(0); setWarmed([0]); }, [videoSrcs.join('|')]);

    /* Hold the previous clip opaque for the length of the fade, then release
     * it back to 0 so it is ready to fade in again on its next turn. */
    useEffect(() => {
        if (lastActive.current === active) return;
        setPrev(lastActive.current);
        lastActive.current = active;
        const id = window.setTimeout(() => setPrev(null), 700);
        return () => window.clearTimeout(id);
    }, [active]);

    /* Only the visible clip plays, and it always restarts from the top —
     * otherwise the hidden one keeps running and comes back mid-shot. */
    useEffect(() => {
        videoEls.current.forEach((el, i) => {
            if (!el) return;
            if (i === active) {
                el.currentTime = 0;
                el.play().catch(() => undefined);
            } else {
                el.pause();
            }
        });
    }, [active, videoSrcs.length]);

    /* Hand over after a fixed spell rather than waiting for the whole file —
     * a two-minute clip would otherwise sit there for two minutes. */
    useEffect(() => {
        if (single) return;
        const id = window.setTimeout(() => setClip((i) => (i + 1) % count), HERO_CLIP_SECONDS * 1000);
        return () => window.clearTimeout(id);
    }, [active, single, count]);

    /* Only the visible clip downloads. The next one starts buffering a few
     * seconds before its turn, so the first screen isn't competing with a
     * second full-size file it will not show for another ten seconds. */
    useEffect(() => {
        if (single) return;
        const id = window.setTimeout(
            () => setWarmed((w) => (w.includes((active + 1) % count) ? w : [...w, (active + 1) % count])),
            Math.max(0, HERO_CLIP_SECONDS - HERO_WARM_LEAD_SECONDS) * 1000,
        );
        return () => window.clearTimeout(id);
    }, [active, single, count]);

    /* A clip shorter than the interval hands over as soon as it finishes. */
    const onEnded = () => {
        if (!single) setClip((i) => (i + 1) % count);
    };

    useEffect(() => {
        const onVis = () => {
            if (!document.hidden) videoEls.current[active]?.play().catch(() => undefined);
        };
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, [active]);

    return (
        <section
            ref={heroRef}
            style={{
                position: 'relative', height: '100vh', width: '100%', overflow: 'hidden', background: '#000',
            }}
        >
            {poster && (
                <img
                    src={poster}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover object-center"
                    style={{ background: '#000' }}
                />
            )}
            {/* The incoming clip fades in ON TOP of the outgoing one, which
              * stays fully opaque underneath until the fade finishes. Fading
              * both at once would dip their combined opacity mid-way and let
              * the still behind them show through.
              *
              * No `poster` here either: a clip that has not buffered yet would
              * paint that same still and reintroduce the flash. */}
            {videoSrcs.map((src, i) => {
                const isActive = i === active;
                const isOutgoing = i === prev;
                return (
                    <video
                        key={src}
                        ref={(el) => { videoEls.current[i] = el; }}
                        src={src}
                        autoPlay={isActive}
                        loop={single}
                        muted
                        playsInline
                        preload={warmed.includes(i) ? 'auto' : 'none'}
                        onEnded={isActive ? onEnded : undefined}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{
                            transform: 'translateZ(0)',
                            willChange: 'transform, opacity',
                            zIndex: isActive ? 2 : isOutgoing ? 1 : 0,
                            opacity: isActive || isOutgoing ? 1 : 0,
                            transition: 'opacity 600ms linear',
                            pointerEvents: 'none',
                        }}
                    />
                );
            })}

            <div
                style={{
                    position: 'absolute', inset: 0, zIndex: 3,
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center',
                    gap: 150,
                    padding: bpv(bp, '0 80px 80px', '0 50px 50px', '0 25px 40px'),
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: bpv(bp, 35, 35, 18), width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: bpv(bp, 8, 5, 9) }}>
                        <h1 style={{ ...tHeroH1(bp), color: '#fff', margin: 0, textAlign: 'center' }}>{title}</h1>
                        <p style={{ ...tHeroSub(bp), color: '#fff', margin: 0, textAlign: 'center' }}>{sub}</p>
                    </div>
                    <OutlineButton bp={bp} tone="onDark" label="작업 보기" onClick={onCta} />
                </div>
            </div>
        </section>
    );
}

/* ---------------------------------- 2. section A ---------------------------------- */

interface SectionAProps {
    bp: BP;
    image?: string;
    cards: SectionItem[];
}

/**
 * Split section: image holds the left, the numbered points stack down the
 * right. No heading — the numbers carry the structure.
 *
 * Desktop/tablet are pinned to exactly `100vh` (not min-height) with both
 * columns allowed to shrink, so the section can never grow past one screen.
 * Phone stacks and flows naturally.
 */
function SectionA({ bp, image, cards }: SectionAProps) {
    const fitViewport = bp !== 'p';
    const phone = bp === 'p';

    return (
        <section
            id="studio"
            style={{
                background: DARK_WASH,
                display: 'flex',
                flexDirection: phone ? 'column' : 'row',
                alignItems: 'stretch',
                boxSizing: 'border-box',
                height: fitViewport ? '100vh' : undefined,
                overflow: fitViewport ? 'hidden' : undefined,
                gap: bpv(bp, 56, 40, 40),
                /* Top padding clears the 74px fixed nav on top of the gap you
                 * actually want to see, hence the asymmetry. */
                padding: bpv(bp, '116px 80px 76px', '104px 50px 68px', '110px 25px 70px'),
            }}
        >
            {/* left — media */}
            <div
                style={{
                    flex: bpv<string>(bp, '1 1 62%', '1 1 58%', '0 0 auto'),
                    minWidth: 0,
                    minHeight: 0,
                    aspectRatio: phone ? '1.4' : undefined,
                    overflow: 'hidden',
                    background: PLACEHOLDER,
                }}
            >
                {image && <img src={image} alt="" className="w-full h-full object-cover object-center" />}
            </div>

            {/* right — wordmark over the numbered points, the group centred
              * against the image. Items keep their own tight rhythm rather
              * than being stretched to fill the column. */}
            <div
                style={{
                    flex: bpv<string>(bp, '1 1 38%', '1 1 42%', '0 0 auto'),
                    minWidth: 0,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: bpv(bp, 26, 20, 22),
                }}
            >
                {/* Wordmark sits above the list, same treatment as the nav and footer. */}
                <span
                    style={{
                        ...tWordmark(bpv(bp, 44, 32, 28)),
                        flex: '0 0 auto',
                        color: '#fff',
                        paddingBottom: bpv(bp, 26, 20, 4),
                    }}
                >
                    STRATO
                </span>

                {cards.map((c, i) => (
                    <div
                        key={`${i}-${c.title}`}
                        style={{
                            flex: '0 0 auto',
                            display: 'flex',
                            gap: bpv(bp, 18, 15, 14),
                            paddingTop: bpv(bp, 16, 14, 14),
                            borderTop: '1px solid rgba(255,255,255,0.22)',
                        }}
                    >
                        <span
                            style={{
                                fontFamily: SANS, fontWeight: 400, fontSize: 11, lineHeight: '1.6em',
                                letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)',
                                flex: '0 0 auto', minWidth: 24,
                            }}
                        >
                            {String(i + 1).padStart(2, '0')}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: bpv(bp, 8, 7, 6), minWidth: 0 }}>
                            <h3 style={{ ...tCardTitle(bp), color: '#fff', margin: 0 }}>{c.title}</h3>
                            <p style={{ ...tCardBody(bp), color: ON_DARK_70, margin: 0 }}>{c.body}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

/* ---------------------------------- 3. section B ---------------------------------- */

interface PanelProps {
    title: string;
    body: string;
    label?: string;
    step: number;
    image?: string;
    active: boolean;
    titleSize: number;
    bodySize: number;
    onEnter?: () => void;
}

function ProcessPanel({ title, body, label, step, image, active, titleSize, bodySize, onEnter }: PanelProps) {
    return (
        <div
            onMouseEnter={onEnter}
            style={{
                position: 'relative', overflow: 'hidden', height: '100%', width: '100%',
                cursor: 'pointer', background: PLACEHOLDER,
            }}
        >
            {/* step marker — makes the strip read left-to-right as one sequence */}
            <span
                style={{
                    position: 'absolute', top: 18, left: 20, zIndex: 2,
                    fontFamily: SANS, fontWeight: 500, fontSize: 11, lineHeight: 1,
                    letterSpacing: '0.16em', color: 'rgba(255,255,255,0.85)',
                }}
            >
                {String(step).padStart(2, '0')}
            </span>
            {image && (
                <img
                    src={image}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover object-center"
                    style={{
                        transform: active ? 'scale(1.08)' : 'scale(1)',
                        transformOrigin: 'center',
                        transition: `transform 550ms ${EASE_ZOOM}`,
                    }}
                />
            )}
            <div style={{ position: 'absolute', inset: 0, background: PANEL_SCRIM }} />
            <div
                style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20,
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                }}
            >
                <h3
                    style={{
                        fontFamily: SANS, fontWeight: 500, fontSize: titleSize, lineHeight: '1.2em',
                        letterSpacing: '-0.01em', color: '#fff', margin: 0,
                    }}
                >
                    {title}
                </h3>
                {label && (
                    <span
                        style={{
                            fontFamily: SANS, fontWeight: 400, fontSize: Math.max(11, bodySize - 1),
                            lineHeight: '1.3em', color: 'rgba(255,255,255,0.7)', marginTop: 4,
                        }}
                    >
                        {label}
                    </span>
                )}
                <AnimatePresence initial={false}>
                    {active && (
                        <motion.p
                            initial={{ opacity: 0, y: -2 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -2 }}
                            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.18 }}
                            style={{
                                fontFamily: SANS, fontWeight: 400, fontSize: bodySize, lineHeight: 1.45,
                                color: 'rgba(255,255,255,.92)', maxWidth: 420, marginTop: 12, marginBottom: 0,
                            }}
                        >
                            {body}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

interface ArrowProps {
    dir: 'prev' | 'next';
    size: number;
    onClick: () => void;
    disabled?: boolean;
}

function CarouselArrow({ dir, size, onClick, disabled }: ArrowProps) {
    const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
    return (
        <button
            type="button"
            aria-label={dir}
            onClick={onClick}
            disabled={disabled}
            style={{
                width: size, height: size, borderRadius: size / 2, background: '#ebebeb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
                flex: '0 0 auto',
            }}
        >
            <Icon size={12} color="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </button>
    );
}

interface SectionBProps {
    bp: BP;
    w: number;
    images: (string | undefined)[];
    heading: string;
    deck: string;
    panels: SectionItem[];
}

function SectionB({ bp, w, images, heading, deck, panels }: SectionBProps) {
    const mode: 'static' | 'carousel3' | 'carousel1' = w >= 1024 ? 'static' : w >= 600 ? 'carousel3' : 'carousel1';
    const [active, setActive] = useState(0);
    const [index, setIndex] = useState(0);
    const [drag, setDrag] = useState(0);
    const [fastSnap, setFastSnap] = useState(false);
    const [stripRef, stripW] = useMeasure<HTMLDivElement>();
    const touch = useRef<{ x: number; t: number } | null>(null);

    const visible = mode === 'carousel3' ? 3 : 1;
    const gap = mode === 'carousel3' ? 12 : 10;
    const peek = mode === 'carousel3' ? 40 : 0;
    const maxIndex = Math.max(0, panels.length - visible);
    const slideW = stripW > 0 ? (stripW - peek - gap * (visible - 1)) / visible : 0;
    const offset = -index * (slideW + gap) + drag;

    const step = useCallback((d: number) => {
        setFastSnap(false);
        setIndex((i) => Math.min(maxIndex, Math.max(0, i + d)));
    }, [maxIndex]);

    useEffect(() => { setIndex((i) => Math.min(i, maxIndex)); }, [maxIndex]);

    const onTouchStart = (e: ReactTouchEvent) => {
        if (mode !== 'carousel1') return;
        touch.current = { x: e.touches[0].clientX, t: Date.now() };
    };
    const onTouchMove = (e: ReactTouchEvent) => {
        if (!touch.current) return;
        setDrag(e.touches[0].clientX - touch.current.x);
    };
    const onTouchEnd = () => {
        if (!touch.current) return;
        const dx = drag;
        const dt = Math.max(1, Date.now() - touch.current.t);
        const velocity = Math.abs(dx) / dt;
        setFastSnap(true);
        setDrag(0);
        touch.current = null;
        if (Math.abs(dx) > 40 || velocity > 0.5) {
            setIndex((i) => Math.min(maxIndex, Math.max(0, i + (dx < 0 ? 1 : -1))));
        }
    };

    const titleSize = mode === 'static' ? 20 : mode === 'carousel3' ? 18 : 21;
    const bodySize = mode === 'static' ? 14 : mode === 'carousel3' ? 12 : 14;
    const stripH = mode === 'static' ? 420 : mode === 'carousel3' ? 747 : 571;
    const arrowSize = mode === 'carousel1' ? 26 : 30;

    return (
        <section
            style={{
                /* White here so the grey Work section below separates by tone
                 * alone — the sections alternate rather than needing a rule. */
                background: '#fff',
                display: 'flex', flexDirection: 'column',
                gap: bpv(bp, 75, 47, 30),
                padding: bpv(bp, '170px 0', '100px 0', '80px 0'),
            }}
        >
            <CenteredTitle bp={bp} heading={heading} deck={deck} />

            {panels.length > 0 && (
            <div style={{ padding: mode === 'static' ? `0 ${bpv(bp, 80, 50, 25)}px` : 0 }}>
                {mode === 'static' ? (
                    /* Panels are separated by arrows so the row reads as a
                     * single left-to-right pipeline, not four loose tiles. */
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', height: stripH, gap: 0 }}>
                        {panels.map((p, i) => (
                            <Fragment key={`${i}-${p.title}`}>
                                {i > 0 && (
                                    <div
                                        aria-hidden
                                        style={{
                                            flex: '0 0 auto', width: 44,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: INK_50,
                                        }}
                                    >
                                        <ChevronRight size={18} strokeWidth={1.25} />
                                    </div>
                                )}
                                <div style={{ flex: 1, height: '100%', minWidth: 0 }}>
                                    <ProcessPanel
                                        title={p.title}
                                        body={p.body}
                                        label={p.label}
                                        step={i + 1}
                                        image={p.image || images[i % Math.max(1, images.length)]}
                                        active={active === i}
                                        titleSize={titleSize}
                                        bodySize={bodySize}
                                        onEnter={() => setActive(i)}
                                    />
                                </div>
                            </Fragment>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: mode === 'carousel1' ? 'center' : 'flex-end',
                                gap: 8,
                                marginBottom: mode === 'carousel1' ? 12 : 20,
                                padding: `0 ${mode === 'carousel1' ? 25 : 50}px`,
                            }}
                        >
                            <CarouselArrow dir="prev" size={arrowSize} onClick={() => step(-1)} disabled={index === 0} />
                            <CarouselArrow dir="next" size={arrowSize} onClick={() => step(1)} disabled={index >= maxIndex} />
                        </div>

                        <div
                            ref={stripRef}
                            style={{ overflow: 'hidden', width: '100%', height: stripH }}
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                        >
                            <div
                                style={{
                                    display: 'flex', gap, height: '100%',
                                    transform: `translate3d(${offset}px,0,0)`,
                                    transition: touch.current
                                        ? 'none'
                                        : `transform ${fastSnap ? 350 : 700}ms ${EASE_SLIDE}`,
                                }}
                            >
                                {panels.map((p, i) => (
                                    <div key={`${i}-${p.title}`} style={{ flex: `0 0 ${slideW}px`, width: slideW, height: '100%' }}>
                                        <ProcessPanel
                                            title={p.title}
                                            body={p.body}
                                            label={p.label}
                                            step={i + 1}
                                            image={p.image || images[i % Math.max(1, images.length)]}
                                            active
                                            titleSize={titleSize}
                                            bodySize={bodySize}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            )}
        </section>
    );
}

/* ---------------------------------- 5. section D — work ---------------------------------- */

interface WorkCardProps {
    project: Project;
    bp: BP;
    onOpen: () => void;
}

/* Restricted projects are filtered out upstream and never reach this card —
 * locked work is hidden entirely rather than shown blurred. */
function WorkCard({ project, bp, onOpen }: WorkCardProps) {
    const videoEl = useRef<HTMLVideoElement | null>(null);
    const poster = posterFor(project);
    const isVideo = project.mediaType === 'video' && !!project.imageUrl;
    const isYouTube = project.mediaType === 'youtube';

    /* A card with a thumbnail shows the still and mounts nothing else. The
     * <video> is only created on hover — otherwise every video card issues a
     * range request against a full-size source just to paint one frame, which
     * is tens of megabytes per card before the visitor has done anything.
     *
     * A video with no thumbnail has nothing else to show, so it does mount a
     * clip — but only once the card is near the viewport, so a long grid
     * doesn't fire every request at once and get rate-limited. */
    const [hovered, setHovered] = useState(false);
    const [inView, setInView] = useState(false);
    const cardEl = useRef<HTMLElement | null>(null);

    const hasStill = !!project.thumbnailUrl;
    const showVideo = isVideo && (hovered || (!hasStill && inView));

    useEffect(() => {
        const el = cardEl.current;
        if (!el || hasStill) return;
        const io = new IntersectionObserver(
            (entries) => entries.forEach((e) => { if (e.isIntersecting) setInView(true); }),
            { rootMargin: '200px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [hasStill]);

    const onEnter = () => {
        if (!isVideo) return;
        setHovered(true);
        videoEl.current?.play().catch(() => undefined);
    };
    const onLeave = () => {
        if (!isVideo) return;
        setHovered(false);
        if (videoEl.current) {
            videoEl.current.pause();
            videoEl.current.currentTime = 0;
        }
    };

    return (
        <article
            ref={cardEl}
            className="group"
            onClick={onOpen}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            style={{
                background: '#fff',
                border: `${bp === 'p' ? 0.5 : 1}px solid #e0e0e0`,
                borderRadius: 0,
                padding: bp === 'p' ? 13 : 25,
                gap: 20,
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                cursor: 'pointer',
            }}
        >
            <div style={{ width: '100%', aspectRatio: '16 / 10', overflow: 'hidden', background: PLACEHOLDER, position: 'relative' }}>
                {showVideo ? (
                    <video
                        ref={videoEl}
                        src={videoSrc(project.imageUrl)}
                        poster={project.thumbnailUrl}
                        muted
                        loop
                        playsInline
                        autoPlay={hovered}
                        preload={hasStill ? 'none' : 'metadata'}
                        className="w-full h-full object-cover object-center transition-transform group-hover:scale-[1.06]"
                        style={{ transitionDuration: '550ms', transitionTimingFunction: EASE_ZOOM }}
                    />
                ) : poster ? (
                    <img
                        src={poster}
                        alt={project.title ?? ''}
                        className="w-full h-full object-cover object-center transition-transform group-hover:scale-[1.06]"
                        style={{ transitionDuration: '550ms', transitionTimingFunction: EASE_ZOOM }}
                    />
                ) : null}

                {isYouTube && (
                    <span
                        style={{
                            position: 'absolute', left: 12, bottom: 12,
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'rgba(0,0,0,.75)', color: '#fff', padding: '6px 9px',
                            fontFamily: SANS, fontWeight: 500, fontSize: 11, letterSpacing: '0.04em',
                        }}
                    >
                        <Play size={11} color="#fff" fill="#fff" strokeWidth={0} />
                        PLAY
                    </span>
                )}
            </div>

            <h3 style={{ ...tCardTitle(bp, true), color: '#000', margin: 0 }}>{project.title ?? 'Untitled'}</h3>
            {project.description && (
                <p style={{ ...tCardBody(bp), color: INK_60, margin: 0, width: bp === 'd' ? '80%' : '90%' }}>
                    {project.description}
                </p>
            )}
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, lineHeight: '1.4em', color: INK_50 }}>
                {[project.category, project.date].filter(Boolean).join(' · ')}
            </span>
        </article>
    );
}

interface SectionDProps {
    bp: BP;
    /** Already filtered — restricted work is excluded unless unlocked. */
    projects: Project[];
    categories: string[];
    activeCategory: string;
    setActiveCategory: (c: string) => void;
    /** How many restricted projects are still hidden behind the access code. */
    hiddenCount: number;
    onOpenProject: (p: Project) => void;
    onRequestAccess: () => void;
    heading: string;
}

/** Projects shown before the visitor asks for more. */
const WORK_PAGE_SIZE = 6;

type MediaFilter = 'ALL' | 'IMAGE' | 'VIDEO';

function FilterButton({ bp, label, active, onClick }: { bp: BP; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                fontFamily: SANS, fontWeight: 500, fontSize: bpv(bp, 15, 14, 13), lineHeight: '1.2em',
                color: active ? '#000' : INK_50,
                background: 'transparent', border: 'none', borderRadius: 0,
                /* the accent shows only in the active rule, not the label */
                borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                padding: '0 0 2px', cursor: 'pointer',
            }}
        >
            {label}
        </button>
    );
}

/** YouTube entries count as video. Anything without a type is treated as an image. */
function matchesMedia(p: Project, f: MediaFilter) {
    if (f === 'ALL') return true;
    const isVideo = p.mediaType === 'video' || p.mediaType === 'youtube';
    return f === 'VIDEO' ? isVideo : !isVideo;
}

function SectionD({
    bp, projects, categories, activeCategory, setActiveCategory, hiddenCount, onOpenProject, onRequestAccess,
    heading,
}: SectionDProps) {
    const [media, setMedia] = useState<MediaFilter>('ALL');

    const filtered = useMemo(
        () => projects
            .filter((p) => activeCategory === 'ALL' || p.category === activeCategory)
            .filter((p) => matchesMedia(p, media)),
        [projects, activeCategory, media],
    );

    const [shown, setShown] = useState(WORK_PAGE_SIZE);

    /* Collapse back to the first page whenever a filter changes, so switching
     * doesn't leave a long list expanded. */
    useEffect(() => { setShown(WORK_PAGE_SIZE); }, [activeCategory, media]);

    const visible = filtered.slice(0, shown);
    const remaining = filtered.length - visible.length;

    return (
        <section
            id="work"
            style={{
                background: '#f5f5f5',
                display: 'flex', flexDirection: 'column',
                gap: bpv(bp, 50, 40, 40),
                padding: bpv(bp, '110px 80px', '80px 50px', '70px 25px'),
            }}
        >
            {/* The tone change from the white section above is the divider;
              * this row is just the title and its filters. */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: bp === 'p' ? 'column' : 'row',
                        /* bottom-aligned so the category row lines up with the
                         * heading and the chips float in the space above it */
                        alignItems: bp === 'p' ? 'flex-start' : 'flex-end',
                        justifyContent: 'space-between',
                        gap: bpv(bp, 24, 20, 16),
                        width: '100%',
                    }}
                >
                    <h2 style={{ ...tHeading(bp), color: '#000', margin: 0 }}>{heading}</h2>

                    {/* Both filters live on the right: media type as boxed chips
                      * stacked above the underlined category list. */}
                    <div
                        style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: bp === 'p' ? 'flex-start' : 'flex-end',
                            gap: bpv(bp, 14, 12, 12),
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {(['IMAGE', 'VIDEO'] as const).map((m) => {
                                const on = media === m;
                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        /* clicking the active chip clears back to everything */
                                        onClick={() => setMedia(on ? 'ALL' : m)}
                                        style={{
                                            fontFamily: SANS, fontWeight: 500, fontSize: bpv(bp, 12, 11, 11),
                                            lineHeight: 1, letterSpacing: '0.08em',
                                            padding: '7px 10px', borderRadius: 0, cursor: 'pointer',
                                            background: on ? ACCENT : 'transparent',
                                            color: on ? '#fff' : INK_50,
                                            border: `1px solid ${on ? ACCENT : INK_20}`,
                                            transition: `background 200ms ${EASE_BTN}, color 200ms ${EASE_BTN}, border-color 200ms ${EASE_BTN}`,
                                        }}
                                    >
                                        {m}
                                    </button>
                                );
                            })}

                            {/* Private work is unlocked from here rather than from a
                              * line of explanatory text under the grid. */}
                            {hiddenCount > 0 && (
                                <button
                                    type="button"
                                    onClick={onRequestAccess}
                                    title={`비공개 작업물 ${hiddenCount}개 — 접근 코드 입력`}
                                    aria-label="비공개 작업물 접근 코드 입력"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: 28, height: 28, flex: '0 0 auto', marginLeft: 4,
                                        background: 'transparent', border: `1px solid ${INK_20}`, borderRadius: 0,
                                        color: INK_50, cursor: 'pointer',
                                        transition: `color 200ms ${EASE_BTN}, border-color 200ms ${EASE_BTN}`,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#000';
                                        e.currentTarget.style.borderColor = '#000';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = INK_50;
                                        e.currentTarget.style.borderColor = INK_20;
                                    }}
                                >
                                    <Lock size={13} strokeWidth={1.5} />
                                </button>
                            )}
                        </div>

                        <div
                            style={{
                                display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                                justifyContent: bp === 'p' ? 'flex-start' : 'flex-end',
                                gap: bpv(bp, 20, 16, 14),
                            }}
                        >
                            {['ALL', ...categories].map((c) => (
                                <FilterButton
                                    key={c}
                                    bp={bp}
                                    label={c}
                                    active={c === activeCategory}
                                    onClick={() => setActiveCategory(c)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: bp === 'd' ? 'repeat(2, minmax(0,1fr))' : '1fr',
                    gap: bpv(bp, 20, 25, 15),
                }}
            >
                {visible.map((p) => (
                    <WorkCard key={p.id} project={p} bp={bp} onOpen={() => onOpenProject(p)} />
                ))}
            </div>

            {remaining > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <OutlineButton
                        bp={bp}
                        label={`더 보기 (${remaining})`}
                        onClick={() => setShown((n) => n + WORK_PAGE_SIZE)}
                    />
                </div>
            )}
        </section>
    );
}

/* ---------------------------------- 6. section E — CTA banner ---------------------------------- */

interface SectionEProps {
    bp: BP;
    image?: string;
    onStart: () => void;
    heading: string;
    sub: string;
}

function SectionE({ bp, image, onStart, heading, sub }: SectionEProps) {
    const phone = bp === 'p';
    return (
        <section
            style={{
                background: '#fff',
                /* No bottom padding: the white gap under the banner is owned
                 * entirely by the contact section, so it can be matched to the
                 * gap above (this section's top padding). */
                padding: bpv(bp, '150px 80px 0', '100px 50px 0', '70px 25px 0'),
                display: 'flex', justifyContent: 'center',
            }}
        >
            <div
                style={{
                    /* Full width inside the section gutters so the banner lines
                     * up with the work grid above and the contact block below. */
                    width: '100%',
                    /* Height is driven by the copy band, not a tall crop — the
                     * image reads as a strip behind the line of text. */
                    padding: bpv(bp, '46px 0', '36px 0', '30px 0'),
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: phone ? 30 : 0,
                    position: 'relative', overflow: 'hidden', background: PLACEHOLDER,
                }}
            >
                {image && <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />}

                {/* Copy and its CTA share the top band: text left, button hard right. */}
                <div
                    style={{
                        position: 'relative', zIndex: 1, width: '100%',
                        display: 'flex',
                        flexDirection: phone ? 'column' : 'row',
                        alignItems: phone ? 'flex-start' : 'center',
                        justifyContent: 'space-between',
                        gap: bpv(bp, 40, 30, 18),
                        padding: bpv(bp, '0 40px', '0 40px', '0 20px'),
                    }}
                >
                    <div
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                            gap: bpv(bp, 15, 15, 12),
                            minWidth: 0,
                            maxWidth: bpv(bp, '52%', '58%', '100%'),
                        }}
                    >
                        <h2
                            style={{
                                fontFamily: SANS, fontWeight: 500, fontSize: bpv(bp, 40, 30, 22),
                                lineHeight: '1.1em', letterSpacing: '-0.01em', color: '#fff', margin: 0,
                            }}
                        >
                            {heading}
                        </h2>
                        <p
                            style={{
                                fontFamily: SANS, fontWeight: 400, fontSize: bpv(bp, 16, 14, 14),
                                lineHeight: '1.4em', color: '#fff', margin: 0,
                            }}
                        >
                            {sub}
                        </p>
                    </div>

                    <div style={{ flex: '0 0 auto' }}>
                        <OutlineButton bp={bp} tone="onDark" label="Start a Project" onClick={onStart} />
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ---------------------------------- 7. contact ---------------------------------- */

interface ContactProps {
    bp: BP;
    contactEmail: string;
    socialLinks: SocialLink[];
    heading: string;
    onOpenForm: () => void;
}

const fieldLabel: CSSProperties = { fontFamily: SANS, fontWeight: 500, fontSize: 15, lineHeight: '1.3em', color: '#000' };

interface IconLinkProps {
    href: string;
    label: string;
    icon: ReactNode;
    external?: boolean;
}

/** Square hairline icon link — same shape language as the Work lock button. */
function IconLink({ href, label, icon, external }: IconLinkProps) {
    return (
        <a
            href={href}
            title={label}
            aria-label={label}
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, flex: '0 0 auto',
                border: `1px solid ${INK_20}`, borderRadius: 0,
                color: INK_50, textDecoration: 'none',
                transition: `color 200ms ${EASE_BTN}, border-color 200ms ${EASE_BTN}`,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.color = '#000';
                e.currentTarget.style.borderColor = '#000';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.color = INK_50;
                e.currentTarget.style.borderColor = INK_20;
            }}
        >
            {icon}
        </a>
    );
}

/**
 * Contact is deliberately bare: the address, Instagram, and a way in.
 * The form itself lives in ContactModal so this section stays a full stop
 * rather than a wall of inputs.
 */
function ContactSection({ bp, contactEmail, socialLinks, heading, onOpenForm }: ContactProps) {
    const instagram = socialLinks.find(
        (s) => s.enabled !== false && (s.id === 'instagram' || (s.name ?? '').toLowerCase().includes('instagram')),
    );

    return (
        <section
            id="contact"
            style={{
                background: '#fff',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: bpv(bp, 44, 36, 30),
                /* Top padding equals the CTA section's top padding, so the white
                 * gap below the banner matches the one above it. */
                padding: bpv(bp, '150px 80px 150px', '100px 50px 100px', '70px 25px 80px'),
            }}
        >
            {/* One line: heading, the form button, then the icon links. */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: bp === 'p' ? 'column' : 'row',
                    alignItems: bp === 'p' ? 'flex-start' : 'center',
                    gap: bpv(bp, 40, 28, 20),
                }}
            >
                <h2 style={{ ...tHeading(bp), color: '#000', margin: 0 }}>{heading}</h2>

                <OutlineButton bp={bp} label="Send a message" onClick={onOpenForm} />

                {/* Address and social reduced to two icon links. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <IconLink
                        href={`mailto:${contactEmail}`}
                        label={contactEmail}
                        icon={<Mail size={16} strokeWidth={1.5} />}
                    />
                    {instagram?.url && (
                        <IconLink
                            href={instagram.url}
                            label={instagram.name ?? 'Instagram'}
                            external
                            icon={<Instagram size={16} strokeWidth={1.5} />}
                        />
                    )}
                </div>
            </div>
        </section>
    );
}

/* ---------------------------------- 7b. contact modal ---------------------------------- */

interface ContactModalProps {
    bp: BP;
    onClose: () => void;
}

function ContactModal({ bp, onClose }: ContactModalProps) {
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (busy || sent) return;
        setBusy(true);
        try {
            await submitContact(form);
            setSent(true);
            setForm({ name: '', email: '', message: '' });
            setTimeout(onClose, 1400);
        } catch {
            /* keep the form in place on failure */
        } finally {
            setBusy(false);
        }
    };

    const inputStyle: CSSProperties = {
        fontFamily: SANS, fontWeight: 400, fontSize: bpv(bp, 16, 15, 15), lineHeight: '1.4em', color: '#000',
        background: 'transparent', border: 'none', borderBottom: `1px solid ${INK_20}`,
        borderRadius: 0, padding: '8px 0', outline: 'none', width: '100%',
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 600,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: bpv(bp, 40, 30, 16),
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                style={{
                    background: '#fff', borderRadius: 0, width: '100%', maxWidth: 560,
                    maxHeight: '90vh', overflowY: 'auto',
                    padding: bpv(bp, '40px 40px 36px', '34px', '26px 22px'),
                    display: 'flex', flexDirection: 'column', gap: bpv(bp, 28, 24, 22),
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
                    <h2 style={{ ...tHeading(bp), color: '#000', margin: 0 }}>Start a conversation.</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            fontFamily: SANS, fontSize: 20, lineHeight: 1, color: INK_50,
                            background: 'transparent', border: 'none', cursor: 'pointer', padding: 4,
                        }}
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                        <span style={fieldLabel}>Name</span>
                        <input
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            style={inputStyle}
                        />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                        <span style={fieldLabel}>Email</span>
                        <input
                            required
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            style={inputStyle}
                        />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                        <span style={fieldLabel}>Message</span>
                        <textarea
                            required
                            rows={4}
                            value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                    </label>
                    <OutlineButton
                        bp={bp}
                        type="submit"
                        disabled={busy || sent}
                        label={sent ? 'MESSAGE SENT' : busy ? 'SENDING' : 'Send Message'}
                    />
                </form>
            </div>
        </motion.div>
    );
}

/* ---------------------------------- 8. footer ---------------------------------- */

interface FooterProps {
    bp: BP;
    contactEmail: string;
    socialLinks: SocialLink[];
    addressHeading: string;
    addressLines: string[];
}

/** Heading on one line, each body line on one line — never wrapped mid-phrase. */
function FooterStack({ bp, heading, children }: { bp: BP; heading: string; children?: ReactNode }) {
    return (
        <div
            style={{
                width: 'auto',
                whiteSpace: 'nowrap',
                display: 'flex', flexDirection: 'column', gap: 4,
            }}
        >
            <span style={{ ...tFootHead(bp), color: '#fff' }}>{heading}</span>
            {children}
        </div>
    );
}

function Footer({ bp, contactEmail, socialLinks, addressHeading, addressLines }: FooterProps) {
    const year = new Date().getFullYear();
    return (
        <footer
            style={{
                /* wash enters from the opposite corner to section A */
                background: DARK_WASH_ALT,
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: bpv(bp, 29, 17, 21),
                padding: bpv(bp, '200px 80px', '150px 50px', '70px 25px'),
            }}
        >
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: bpv(bp, 29, 17, 21) }}>
                <span style={{ ...tWordmark(bpv(bp, 72, 48, 34)), color: '#fff' }}>
                    STRATO
                </span>
                <div style={{ width: '100%', height: 1, background: '#fff' }} />
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: bp === 'p' ? 'column' : 'row',
                    justifyContent: bp === 't' ? 'flex-end' : 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    /* columns are nowrap now, so they need a real gap to fall
                     * back on when the row runs out of width */
                    gap: bp === 'p' ? 25 : bp === 't' ? '46px 63px' : '32px 48px',
                    width: '100%',
                }}
            >
                <FooterStack bp={bp} heading="Contact.">
                    <a href={`mailto:${contactEmail}`} style={{ ...tFootBody(bp), color: '#fff', textDecoration: 'none' }}>
                        {contactEmail}
                    </a>
                </FooterStack>

                <FooterStack bp={bp} heading={addressHeading}>
                    {addressLines.map((line, i) => (
                        <span key={i} style={{ ...tFootBody(bp), color: '#fff' }}>{line}</span>
                    ))}
                </FooterStack>

                <FooterStack bp={bp} heading="Social Media">
                    {socialLinks.filter((s) => s.enabled !== false).map((s) => (
                        <a
                            key={s.id}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ ...tFootBody(bp), color: '#fff', textDecoration: 'none' }}
                        >
                            {s.name ?? s.id}
                        </a>
                    ))}
                </FooterStack>

                <FooterStack bp={bp} heading={`ⓒ${year} STRATO. All rights reserved.`}>
                    <a href="/admin" style={{ ...tFootBody(bp), color: '#fff', textDecoration: 'none', opacity: 0.6 }}>
                        /admin
                    </a>
                </FooterStack>
            </div>
        </footer>
    );
}

/* ---------------------------------- project detail overlay ---------------------------------- */

interface MediaBlockProps {
    type?: 'image' | 'video' | 'youtube';
    url?: string;
    thumbnail?: string;
    youtubeUrl?: string;
    title?: string;
    /** CSS length capping the media height so a tall asset still fits one screen. */
    maxH: string;
}

function MediaBlock({ type, url, thumbnail, youtubeUrl, title, maxH }: MediaBlockProps) {
    const ytId = getYouTubeId(youtubeUrl ?? url);

    /* Scale down to fit, never up: width follows the aspect ratio once the
     * height cap bites, so nothing is cropped or letterboxed. */
    const fit: CSSProperties = {
        display: 'block', margin: '0 auto',
        maxWidth: '100%', maxHeight: maxH,
        width: 'auto', height: 'auto',
    };

    if (type === 'youtube' && ytId) {
        return (
            <div
                style={{
                    width: '100%',
                    /* 16:9 box, but never taller than the cap */
                    maxWidth: `calc(${maxH} * 16 / 9)`,
                    aspectRatio: '16 / 9',
                    maxHeight: maxH,
                    margin: '0 auto',
                    background: '#000',
                }}
            >
                <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title={title ?? 'video'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                />
            </div>
        );
    }
    if (type === 'video' && url) {
        return (
            <video
                src={videoSrc(url)}
                poster={thumbnail}
                controls
                playsInline
                preload="metadata"
                style={{ ...fit, background: '#000' }}
            />
        );
    }
    if (url) return <img src={url} alt={title ?? ''} style={{ ...fit, background: PLACEHOLDER }} />;
    return null;
}

interface OverlayProps {
    bp: BP;
    project: Project;
    index: number;
    total: number;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
}

function ProjectOverlay({ bp, project, index, total, onClose, onPrev, onNext }: OverlayProps) {
    const scroller = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        scroller.current?.scrollTo({ top: 0 });
    }, [project.id]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const pad = side(bp);
    const meta: [string, string | undefined][] = [
        ['CATEGORY', project.category],
        ['DATE', project.date],
        ['LOCATION', project.location],
        ['TYPE', (project.mediaType ?? 'image').toUpperCase()],
    ];

    const barBtn: CSSProperties = {
        fontFamily: SANS, fontWeight: 500, fontSize: 15, lineHeight: '1.2em', letterSpacing: '0.02em',
        color: '#000', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
    };

    /* Viewport minus the sticky bar, the top padding, the title and its gap —
     * what's actually left for the first media block on one screen. */
    const mediaMaxH = `calc(100vh - ${bpv(bp, 264, 226, 196)}px)`;

    return (
        <div ref={scroller} className="fixed inset-0 z-[500] overflow-y-auto" style={{ background: '#fff' }}>
            <div
                style={{
                    position: 'sticky', top: 0, zIndex: 10, height: 74, background: '#fff',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
                    padding: `0 ${pad}px`,
                }}
            >
                <span aria-hidden />
                <span style={{ ...barBtn, justifySelf: 'center', color: INK_50, cursor: 'default' }}>
                    {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                </span>
                <button type="button" style={{ ...barBtn, justifySelf: 'end' }} onClick={onClose}>CLOSE ✕</button>
            </div>

            <div
                style={{
                    padding: `${bpv(bp, 60, 45, 35)}px ${pad}px ${bpv(bp, 140, 100, 80)}px`,
                    display: 'flex', flexDirection: 'column', gap: bpv(bp, 40, 32, 26),
                }}
            >
                {/* Title left, project stepper right — the bar keeps only the
                  * counter and CLOSE. */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: bp === 'p' ? 'column' : 'row',
                        alignItems: bp === 'p' ? 'flex-start' : 'baseline',
                        justifyContent: 'space-between',
                        gap: bpv(bp, 24, 20, 14),
                        width: '100%',
                    }}
                >
                    <h2 style={{ ...tHeading(bp), color: '#000', margin: 0 }}>{project.title ?? 'Untitled'}</h2>

                    <div style={{ display: 'flex', gap: 20, flex: '0 0 auto' }}>
                        <button type="button" style={barBtn} onClick={onPrev} disabled={total < 2}>PREV</button>
                        <button type="button" style={barBtn} onClick={onNext} disabled={total < 2}>NEXT</button>
                    </div>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: bp === 'd' ? 'minmax(0,1fr) 320px' : '1fr',
                        gap: bpv(bp, 40, 32, 26),
                        alignItems: 'start',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
                        <MediaBlock
                            type={project.mediaType}
                            url={project.mediaType === 'youtube' ? project.youtubeUrl : project.imageUrl}
                            thumbnail={project.thumbnailUrl}
                            youtubeUrl={project.youtubeUrl}
                            title={project.title}
                            maxH={mediaMaxH}
                        />
                        {(project.additionalMedia ?? []).map((m, i) => (
                            <MediaBlock
                                key={`${m.url}-${i}`}
                                type={m.type}
                                url={m.url}
                                thumbnail={m.thumbnail}
                                title={project.title}
                                maxH={mediaMaxH}
                            />
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: bpv(bp, 26, 22, 20) }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {meta.filter(([, v]) => !!v).map(([k, v]) => (
                                <div
                                    key={k}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', gap: 16,
                                        padding: '12px 0', borderTop: '1px solid #e0e0e0',
                                    }}
                                >
                                    <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 12, letterSpacing: '0.08em', color: INK_50 }}>
                                        {k}
                                    </span>
                                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: '#000', textAlign: 'right' }}>
                                        {v}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {project.description && (
                            <p style={{ ...tDeck(bp), color: INK_60, margin: 0 }}>{project.description}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ---------------------------------- access modal ---------------------------------- */

interface AccessModalProps {
    bp: BP;
    onClose: () => void;
    onUnlock: () => void;
}

function AccessModal({ bp, onClose, onUnlock }: AccessModalProps) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [shake, setShake] = useState(0);
    const [busy, setBusy] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        const ok = await verifyAccessCode(code.trim());
        setBusy(false);
        if (ok) {
            onUnlock();
            onClose();
        } else {
            setError('유효하지 않거나 만료된 코드입니다.');
            setShake((s) => s + 1);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[600] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,.55)', padding: 24 }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff', border: '1px solid #e0e0e0', borderRadius: 0,
                    width: '100%', maxWidth: 420, padding: bpv(bp, 40, 34, 28),
                    display: 'flex', flexDirection: 'column', gap: 24, position: 'relative',
                }}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    style={{
                        position: 'absolute', top: 14, right: 16, background: 'transparent', border: 'none',
                        fontFamily: SANS, fontSize: 16, color: '#000', cursor: 'pointer', padding: 0,
                    }}
                >
                    ✕
                </button>

                <h3 style={{ ...tHeading(bp), color: '#000', margin: 0 }}>비공개 작업물</h3>
                <p style={{ ...tDeck(bp), color: INK_60, margin: 0 }}>
                    전달받은 접근 코드를 입력하면 비공개 작업물이 함께 표시됩니다.
                </p>

                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>
                    <motion.input
                        key={shake}
                        animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : undefined}
                        transition={{ duration: 0.35 }}
                        value={code}
                        onChange={(e) => { setCode(e.target.value); setError(''); }}
                        placeholder="접근 코드"
                        autoFocus
                        style={{
                            fontFamily: SANS, fontWeight: 400, fontSize: 16, letterSpacing: '0.08em', color: '#000',
                            background: 'transparent', border: 'none', borderBottom: '1px solid rgba(0,0,0,.2)',
                            borderRadius: 0, padding: '8px 0', outline: 'none', width: '100%',
                        }}
                    />
                    {error && <span style={{ ...tCardBody(bp), color: INK_60 }}>{error}</span>}
                    <OutlineButton bp={bp} type="submit" disabled={busy} label={busy ? '확인 중' : '확인'} />
                </form>
            </div>
        </div>
    );
}

/* ---------------------------------- page ---------------------------------- */

export default function HomePage() {
    const { projects, sections, socialLinks, contactEmail } = useStratoData();
    const { w, bp } = useViewport();

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [accessOpen, setAccessOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [pastHero, setPastHero] = useState(false);

    const heroNode = useRef<HTMLElement | null>(null);
    const setHeroRef = useCallback((el: HTMLElement | null) => { heroNode.current = el; }, []);

    /* nav background: instant snap once the hero has left the viewport */
    useEffect(() => {
        const el = heroNode.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([entry]) => setPastHero(!entry.isIntersecting),
            { threshold: 0 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [projects.length]);

    /* editable copy — Firestore merged over the ../content registry defaults */
    const cHero = useMemo(() => resolveSection(sections, 'hero'), [sections]);
    const cCapabilities = useMemo(() => resolveSection(sections, 'capabilities'), [sections]);
    const cProcess = useMemo(() => resolveSection(sections, 'process'), [sections]);
    const cWork = useMemo(() => resolveSection(sections, 'work'), [sections]);
    const cCta = useMemo(() => resolveSection(sections, 'cta'), [sections]);
    const cContact = useMemo(() => resolveSection(sections, 'contact'), [sections]);
    const cFooter = useMemo(() => resolveSection(sections, 'footer'), [sections]);

    const footerAddress = useMemo(() => linesOf(cFooter.content), [cFooter.content]);

    const vis = useMemo(() => visibleProjects(projects, isUnlocked), [projects, isUnlocked]);
    const categories = useMemo(() => categoriesOf(projects), [projects]);

    /* The still behind the hero while the clip buffers — only ever the image
     * set in the admin. There is deliberately no fallback: borrowing some
     * unrelated project photo just flashes a picture nobody chose. Set it to a
     * frame from the clip and the hand-over becomes invisible; leave it empty
     * and the hero simply starts black. */
    const heroPoster = cHero.imageUrl;

    /** Fallback still for the studio section, which does need a picture. */
    const firstProjectStill = useMemo(() => vis.map(posterFor).find(Boolean), [vis]);
    /* Hero clips: the two URLs set in admin win; otherwise fall back to the
     * first two project videos so the hero is never empty. */
    const heroVideos = useMemo(() => {
        const picked = [cHero.videoUrl, cHero.videoUrl2].filter(Boolean) as string[];
        if (picked.length) return picked;
        return vis
            .filter((p) => p.mediaType === 'video' && p.imageUrl)
            .map((p) => p.imageUrl as string)
            .slice(0, 2);
    }, [cHero.videoUrl, cHero.videoUrl2, vis]);

    const stripImages = useMemo(() => {
        const list = vis.map(posterFor).filter(Boolean) as string[];
        return list.length ? list.slice(0, 4) : [undefined];
    }, [vis]);

    const bannerImage = cCta.imageUrl ?? posterFor(vis[1] ?? vis[0]);

    /* Restricted work is hidden outright until the access code is entered. */
    const gridProjects = useMemo(
        () => (activeCategory === 'ALL' ? vis : vis.filter((p) => p.category === activeCategory)),
        [vis, activeCategory],
    );

    /** Restricted projects still hidden, for the "enter access code" prompt. */
    const hiddenCount = useMemo(
        () => (isUnlocked ? 0 : projects.filter((p) => p.isRestricted).length),
        [projects, isUnlocked],
    );

    const openable = gridProjects;
    const selectedIndex = openable.findIndex((p) => p.id === selectedId);
    const selected = selectedIndex >= 0 ? openable[selectedIndex] : null;

    /* body scroll lock */
    useEffect(() => {
        const lock = !!selected || accessOpen || menuOpen || contactOpen;
        document.body.style.overflow = lock ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [selected, accessOpen, menuOpen, contactOpen]);

    const stepProject = (d: number) => {
        if (!openable.length) return;
        const next = (selectedIndex + d + openable.length) % openable.length;
        setSelectedId(openable[next].id);
    };

    return (
        <div style={{ background: '#000', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
            <NavBar
                bp={bp}
                solid={pastHero}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
                onRequestAccess={() => setAccessOpen(true)}
            />

            <Hero
                bp={bp}
                heroRef={setHeroRef}
                title={cHero.title}
                sub={cHero.content}
                poster={heroPoster}
                videoSrcs={heroVideos}
                onCta={() => scrollToId('work')}
            />

            <SectionA
                bp={bp}
                image={cCapabilities.imageUrl ?? firstProjectStill}
                cards={cCapabilities.items}
            />

            <SectionB
                bp={bp}
                w={w}
                images={stripImages}
                heading={cProcess.title}
                deck={cProcess.content}
                panels={cProcess.items}
            />

            <SectionD
                bp={bp}
                projects={gridProjects}
                categories={categories}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                hiddenCount={hiddenCount}
                onOpenProject={(p) => setSelectedId(p.id)}
                onRequestAccess={() => setAccessOpen(true)}
                heading={cWork.title}
            />

            <SectionE
                bp={bp}
                image={bannerImage}
                onStart={() => setContactOpen(true)}
                heading={cCta.title}
                sub={cCta.content}
            />

            <ContactSection
                bp={bp}
                contactEmail={contactEmail}
                socialLinks={socialLinks}
                heading={cContact.title}
                onOpenForm={() => setContactOpen(true)}
            />

            <Footer
                bp={bp}
                contactEmail={contactEmail}
                socialLinks={socialLinks}
                addressHeading={cFooter.title}
                addressLines={footerAddress}
            />

            {selected && (
                <ProjectOverlay
                    bp={bp}
                    project={selected}
                    index={selectedIndex}
                    total={openable.length}
                    onClose={() => setSelectedId(null)}
                    onPrev={() => stepProject(-1)}
                    onNext={() => stepProject(1)}
                />
            )}

            {accessOpen && (
                <AccessModal
                    bp={bp}
                    onClose={() => setAccessOpen(false)}
                    onUnlock={() => setIsUnlocked(true)}
                />
            )}

            <AnimatePresence>
                {contactOpen && <ContactModal bp={bp} onClose={() => setContactOpen(false)} />}
            </AnimatePresence>
        </div>
    );
}
