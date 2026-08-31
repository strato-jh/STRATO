/* ------------------------------------------------------------------ *
 * STRATO — editable homepage content registry.
 *
 * Every text block on the public site is declared here with its
 * production copy as the DEFAULT. Firestore (`sections/{id}`) merges
 * OVER these defaults field by field, so:
 *
 *   - no docs in Firestore at all  -> the site renders the defaults
 *   - a doc with a blank field     -> that field falls back to default
 *   - a doc with items: []         -> the default item list is used
 *
 * Both the public page (HomePage.tsx) and the admin editor
 * (admin/SectionManager.tsx) read from this single source of truth.
 * ------------------------------------------------------------------ */

import type { Section } from './pages/useStratoData';

/** One entry of a repeatable block (capability card, process panel, …). */
export interface SectionItem {
    title: string;
    body: string;
    /** Optional secondary line under the title — used for the Korean step name. */
    label?: string;
    /** Optional image for this entry. Falls back to a project still when unset. */
    image?: string;
}

/** Firestore shape, widened with the extra keys the registry adds. */
export interface SectionDoc extends Section {
    items?: SectionItem[];
    /** Hero background clips. Two are played in alternation. */
    videoUrl?: string;
    videoUrl2?: string;
}

export type SectionField = 'title' | 'content' | 'imageUrl' | 'videoUrl' | 'videoUrl2';

/** Admin input hints per field. */
export const FIELD_LABELS: Record<SectionField, string> = {
    title: '제목',
    content: '본문',
    imageUrl: '이미지 URL',
    videoUrl: '영상 1 URL',
    videoUrl2: '영상 2 URL',
};

export interface SectionDef {
    /** Firestore doc id inside the `sections` collection. */
    id: string;
    /** Human label shown in the admin list. */
    name: string;
    /** Where this copy appears on the public site. */
    hint?: string;
    /** Scalar fields this section exposes. */
    fields: SectionField[];
    /** Present when the section owns a repeatable items[] array. */
    itemsLabel?: string;
    maxItems?: number;
    defaults: {
        title?: string;
        content?: string;
        items?: SectionItem[];
    };
}

/** Fully resolved section, ready to render. */
export interface ResolvedSection {
    title: string;
    content: string;
    imageUrl?: string;
    videoUrl?: string;
    videoUrl2?: string;
    items: SectionItem[];
}

/* ---------------------------------- registry ---------------------------------- */

export const SECTION_DEFS: SectionDef[] = [
    {
        id: 'hero',
        name: '히어로',
        hint: '첫 화면 풀스크린 영역. 영상 2개를 넣으면 번갈아 반복 재생됩니다. 비워두면 프로젝트 영상에서 자동으로 가져옵니다',
        fields: ['title', 'content', 'videoUrl', 'videoUrl2', 'imageUrl'],
        defaults: {
            title: 'Technology Focused & Creatively Driven',
            content: 'Scale creative production without losing your brand.',
        },
    },
    {
        id: 'capabilities',
        name: '강점 항목',
        hint: '두 번째 검은 배경 섹션. 왼쪽 큰 이미지와, 오른쪽에 세로로 놓이는 01/02/03 항목',
        fields: ['imageUrl'],
        itemsLabel: '항목',
        maxItems: 4,
        defaults: {
            items: [
                {
                    title: 'It understands the brand.',
                    body: 'Grounded in your brand guidelines, visual language and the craft behind past work.',
                },
                {
                    title: 'It produces real work.',
                    body: 'Images, film and campaigns finished to a standard that survives real workflows.',
                },
                {
                    title: 'It gets sharper every cycle.',
                    body: 'Feedback and results from each delivery improve the next piece we make.',
                },
            ],
        },
    },
    {
        id: 'process',
        name: '프로세스',
        hint: '회색 배경 섹션. 패널이 왼쪽부터 순서대로 작업 흐름을 이룹니다 (데스크톱은 가로 배열, 모바일은 슬라이드)',
        fields: ['title', 'content'],
        itemsLabel: '작업 단계',
        maxItems: 6,
        defaults: {
            title: 'How the work gets made.',
            content:
                '기획부터 완성까지 한 팀이 이어서 끌고 갑니다. 단계가 넘어가도 맥락이 끊기지 않습니다.',
            items: [
                {
                    title: 'Direction',
                    label: '기획 · 브랜딩',
                    body: '레퍼런스와 브랜드 기준을 정리해 방향을 잡습니다. 무엇을 만들지가 여기서 결정됩니다.',
                },
                {
                    title: 'Generation',
                    label: '이미지 · 비디오 생성',
                    body: '정해진 방향 위에서 이미지와 영상을 만들어냅니다. 필요한 포맷과 채널을 함께 고려합니다.',
                },
                {
                    title: 'Post & VFX',
                    label: '후반 편집 · VFX',
                    body: '편집, 색보정, 합성으로 완성도를 끌어올립니다. 디테일이 결과를 가릅니다.',
                },
                {
                    title: 'Delivery',
                    label: '완성',
                    body: '채널별 규격에 맞춰 정리해 전달합니다. 바로 쓸 수 있는 상태로 넘어갑니다.',
                },
            ],
        },
    },
    {
        id: 'work',
        name: '작업 목록 제목',
        hint: '프로젝트 그리드 위에 붙는 짧은 제목',
        fields: ['title'],
        defaults: {
            title: 'And here’s what came out.',
        },
    },
    {
        id: 'cta',
        name: 'CTA 배너',
        hint: '프로젝트 목록 아래 이미지 배너의 문구',
        fields: ['title', 'content', 'imageUrl'],
        defaults: {
            title: 'Let’s build the next one.',
            content: 'Tell us what you’re making.',
        },
    },
    {
        id: 'contact',
        name: '문의 섹션',
        hint: '문의 폼 왼쪽 상단 제목',
        fields: ['title'],
        defaults: {
            title: 'Start a conversation.',
        },
    },
    {
        id: 'footer',
        name: '푸터 주소',
        hint: '푸터 주소 블록의 제목과 줄바꿈으로 구분된 주소 줄',
        fields: ['title', 'content'],
        defaults: {
            title: 'Address.',
            content: 'SEOUL, KR\n37.5665° N, 126.9780° E',
        },
    },
];

const DEF_BY_ID: Record<string, SectionDef> = SECTION_DEFS.reduce<Record<string, SectionDef>>((acc, def) => {
    acc[def.id] = def;
    return acc;
}, {});

export function sectionDef(id: string): SectionDef | undefined {
    return DEF_BY_ID[id];
}

/* ---------------------------------- resolution ---------------------------------- */

/** `''`, whitespace and non-strings all count as "unset". */
function firstFilled(...candidates: (string | undefined | null)[]): string | undefined {
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim() !== '') return c;
    }
    return undefined;
}

/** Drop malformed / entirely blank entries so a half-saved array cannot blank the UI. */
export function cleanItems(raw: unknown): SectionItem[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((entry): SectionItem => {
            const rec = (entry ?? {}) as Partial<SectionItem>;
            return {
                title: typeof rec.title === 'string' ? rec.title : '',
                body: typeof rec.body === 'string' ? rec.body : '',
                label: typeof rec.label === 'string' ? rec.label : '',
                image: typeof rec.image === 'string' ? rec.image : '',
            };
        })
        .filter(
            (i) =>
                i.title.trim() !== '' ||
                i.body.trim() !== '' ||
                (i.label ?? '').trim() !== '' ||
                (i.image ?? '').trim() !== '',
        );
}

/**
 * Merge the Firestore doc over the registry default, field by field.
 * A missing doc, a missing field or a blank field all fall back to the default,
 * so the site never renders empty copy.
 */
export function resolveSection(sections: Section[] | undefined, id: string): ResolvedSection {
    const def = DEF_BY_ID[id];
    const doc = sections?.find((s) => s.id === id) as SectionDoc | undefined;

    const docItems = cleanItems(doc?.items);
    const defaultItems = def?.defaults.items ?? [];

    return {
        title: firstFilled(doc?.title, def?.defaults.title) ?? '',
        content: firstFilled(doc?.content, def?.defaults.content) ?? '',
        imageUrl: firstFilled(doc?.imageUrl),
        videoUrl: firstFilled(doc?.videoUrl),
        videoUrl2: firstFilled(doc?.videoUrl2),
        items: docItems.length ? docItems : defaultItems,
    };
}

/** True when the stored doc actually overrides something the registry declares. */
export function hasStoredOverride(sections: Section[] | undefined, def: SectionDef): boolean {
    const doc = sections?.find((s) => s.id === def.id) as SectionDoc | undefined;
    if (!doc) return false;
    const scalarSet = def.fields.some((f) => firstFilled(doc[f]) !== undefined);
    const itemsSet = def.itemsLabel ? cleanItems(doc.items).length > 0 : false;
    return scalarSet || itemsSet;
}

/** Split a body field into paragraphs on blank lines. */
export function paragraphsOf(content: string): string[] {
    return content
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
}

/** Split a body field into single lines. */
export function linesOf(content: string): string[] {
    return content
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
}

