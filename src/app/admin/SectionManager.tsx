import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Edit, Save, X, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { collection, doc, deleteField, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    SECTION_DEFS,
    resolveSection,
    hasStoredOverride,
    type SectionDef,
    type SectionDoc,
    type SectionField,
    type SectionItem,
} from '../content';
import UploadField from './UploadField';

/* ------------------------------------------------------------------ *
 * 섹션 관리자 — 홈페이지의 모든 문구를 ../content 레지스트리 기준으로 편집.
 * DB(sections/{id})에 값이 없으면 레지스트리 기본값이 노출되고, 폼은 항상
 * "실제로 보이는 값"으로 미리 채워진다.
 * ------------------------------------------------------------------ */

const HAIRLINE = '1px solid rgba(255,255,255,.14)';
const HAIRLINE_STRONG = '1px solid rgba(255,255,255,.28)';
const FONT = 'var(--font-sans)';

const FIELD_LABEL: Record<SectionField, string> = {
    title: '제목',
    content: '본문',
    imageUrl: '이미지 주소',
    videoUrl: '영상 1 주소',
    videoUrl2: '영상 2 주소',
};

const FIELD_HELP: Record<SectionField, string> = {
    title: '비워두면 기본 문구가 그대로 노출됩니다.',
    content: '빈 줄로 문단을, 줄바꿈으로 줄을 나눕니다.',
    imageUrl: '선택 사항입니다. 비워두면 프로젝트 이미지가 사용됩니다.',
    videoUrl: '히어로 배경 영상. mp4 주소를 넣으세요. 비워두면 프로젝트 영상이 자동으로 쓰입니다.',
    videoUrl2: '두 번째 영상. 두 개를 모두 넣으면 번갈아 반복 재생됩니다.',
};

/** Fields rendered as a plain single-line URL input. */
const URL_FIELDS: SectionField[] = ['imageUrl', 'videoUrl', 'videoUrl2'];

interface DraftState {
    title: string;
    content: string;
    imageUrl: string;
    videoUrl: string;
    videoUrl2: string;
    items: SectionItem[];
}

const inputStyle: React.CSSProperties = {
    fontFamily: FONT,
    width: '100%',
    background: 'rgba(255,255,255,.04)',
    border: HAIRLINE,
    borderRadius: 0,
    padding: '10px 12px',
    color: '#fff',
    outline: 'none',
    fontSize: 14,
    lineHeight: 1.5,
};

const primaryBtn: React.CSSProperties = {
    fontFamily: FONT,
    background: '#fff',
    color: '#000',
    border: 'none',
    borderRadius: 0,
    padding: '11px 18px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
};

const ghostBtn: React.CSSProperties = {
    fontFamily: FONT,
    background: 'transparent',
    color: '#fff',
    border: HAIRLINE_STRONG,
    borderRadius: 0,
    padding: '10px 16px',
    fontSize: 13,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
};

const iconBtn: React.CSSProperties = {
    fontFamily: FONT,
    background: 'transparent',
    color: 'rgba(255,255,255,.7)',
    border: HAIRLINE,
    borderRadius: 0,
    width: 30,
    height: 30,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flex: '0 0 auto',
};

export default function SectionManager() {
    const [docs, setDocs] = useState<SectionDoc[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<DraftState | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [notice, setNotice] = useState('');
    /** Raw Firestore failure, shown verbatim so the cause is diagnosable. */
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'sections'), (snapshot) => {
            setDocs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as SectionDoc));
        });
        return () => unsubscribe();
    }, []);

    const editingDef = useMemo(
        () => SECTION_DEFS.find((d) => d.id === editingId) ?? null,
        [editingId],
    );

    const openEditor = (def: SectionDef) => {
        const resolved = resolveSection(docs, def.id);
        setEditingId(def.id);
        setDraft({
            title: resolved.title,
            content: resolved.content,
            imageUrl: resolved.imageUrl ?? '',
            videoUrl: resolved.videoUrl ?? '',
            videoUrl2: resolved.videoUrl2 ?? '',
            items: resolved.items.map((i) => ({ ...i })),
        });
    };

    const closeEditor = () => {
        setEditingId(null);
        setDraft(null);
        setSaveError('');
    };

    const patch = (next: Partial<DraftState>) => {
        setDraft((prev) => (prev ? { ...prev, ...next } : prev));
    };

    const patchItem = (index: number, next: Partial<SectionItem>) => {
        setDraft((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((it, i) => (i === index ? { ...it, ...next } : it));
            return { ...prev, items };
        });
    };

    const addItem = () => {
        setDraft((prev) =>
            prev ? { ...prev, items: [...prev.items, { title: '', body: '', label: '', image: '' }] } : prev,
        );
    };

    const removeItem = (index: number) => {
        setDraft((prev) => (prev ? { ...prev, items: prev.items.filter((_, i) => i !== index) } : prev));
    };

    const moveItem = (index: number, delta: number) => {
        setDraft((prev) => {
            if (!prev) return prev;
            const target = index + delta;
            if (target < 0 || target >= prev.items.length) return prev;
            const items = [...prev.items];
            const [moved] = items.splice(index, 1);
            items.splice(target, 0, moved);
            return { ...prev, items };
        });
    };

    const handleSave = async () => {
        if (!editingDef || !draft) return;
        setIsSaving(true);
        setSaveError('');
        try {
            const payload: Record<string, unknown> = { name: editingDef.name };
            for (const field of editingDef.fields) {
                payload[field] = draft[field].trim();
            }
            if (editingDef.itemsLabel) {
                payload.items = draft.items
                    .map((i) => ({
                        title: i.title.trim(),
                        body: i.body.trim(),
                        label: (i.label ?? '').trim(),
                        image: (i.image ?? '').trim(),
                    }))
                    .filter((i) => i.title !== '' || i.body !== '' || i.label !== '' || i.image !== '');
            }
            await setDoc(doc(db, 'sections', editingDef.id), payload, { merge: true });
            setNotice(`'${editingDef.name}' 섹션을 저장했습니다.`);
            closeEditor();
        } catch (error) {
            console.error('섹션 저장 실패:', error);
            const err = error as { code?: string; message?: string };
            const code = err?.code ?? '';
            const detail = [code, err?.message].filter(Boolean).join(' — ');
            setSaveError(
                code === 'permission-denied'
                    ? `${detail}\n\nFirestore 보안 규칙이 이 문서의 생성/수정을 막고 있습니다. sections 컬렉션에 create 권한이 있는지 확인해 주세요.`
                    : detail || String(error),
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async (def: SectionDef) => {
        const ok = window.confirm(
            `'${def.name}' 섹션을 기본값으로 되돌립니다.\n저장된 내용은 삭제되며 되돌릴 수 없습니다. 계속할까요?`,
        );
        if (!ok) return;
        try {
            const payload: Record<string, unknown> = {};
            for (const field of def.fields) payload[field] = deleteField();
            if (def.itemsLabel) payload.items = deleteField();
            await setDoc(doc(db, 'sections', def.id), payload, { merge: true });
            setNotice(`'${def.name}' 섹션을 기본값으로 되돌렸습니다.`);
            if (editingId === def.id) closeEditor();
        } catch (error) {
            console.error('기본값 복원 실패:', error);
            alert('기본값으로 되돌리지 못했습니다.');
        }
    };

    const atMax = (def: SectionDef, count: number) =>
        typeof def.maxItems === 'number' && count >= def.maxItems;

    return (
        <div style={{ fontFamily: FONT }}>
            {/* 헤더 */}
            <div className="mb-8">
                <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-3xl font-bold mb-2 flex items-center gap-3"
                    style={{ fontFamily: FONT, letterSpacing: '-0.01em' }}
                >
                    <FileText size={28} className="text-white" />
                    섹션 관리
                </motion.h1>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,.6)' }}>
                    홈페이지에 노출되는 모든 문구를 여기에서 수정합니다. 저장하지 않은 섹션은 기본값이 그대로 보입니다.
                </p>
            </div>

            {notice && (
                <div
                    style={{
                        border: HAIRLINE,
                        borderLeft: '2px solid rgba(255,255,255,.6)',
                        padding: '10px 14px',
                        marginBottom: 20,
                        fontSize: 13,
                        color: 'rgba(255,255,255,.8)',
                    }}
                >
                    {notice}
                </div>
            )}

            {/* 섹션 목록 */}
            <div className="space-y-3">
                {SECTION_DEFS.map((def, index) => {
                    const resolved = resolveSection(docs, def.id);
                    const stored = hasStoredOverride(docs, def);
                    return (
                        <motion.div
                            key={def.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.04, 0.3) }}
                            style={{ border: HAIRLINE, background: 'rgba(255,255,255,.03)', borderRadius: 0 }}
                        >
                            <div style={{ padding: 20 }}>
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div style={{ minWidth: 0 }}>
                                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                                            <h3 style={{ fontSize: 17, fontWeight: 600, color: '#fff', margin: 0 }}>
                                                {def.name}
                                            </h3>
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    padding: '3px 8px',
                                                    border: HAIRLINE,
                                                    color: stored ? '#fff' : 'rgba(255,255,255,.55)',
                                                    background: stored ? 'rgba(255,255,255,.12)' : 'transparent',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {stored ? 'DB 저장됨' : '기본값 사용 중'}
                                            </span>
                                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
                                                {def.id}
                                            </span>
                                        </div>
                                        {def.hint && (
                                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', margin: 0 }}>
                                                {def.hint}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2" style={{ flex: '0 0 auto' }}>
                                        {stored && (
                                            <button type="button" onClick={() => handleReset(def)} style={ghostBtn}>
                                                <RotateCcw size={13} />
                                                기본값으로 되돌리기
                                            </button>
                                        )}
                                        <button type="button" onClick={() => openEditor(def)} style={primaryBtn}>
                                            <Edit size={13} />
                                            편집
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3" style={{ fontSize: 13 }}>
                                    {def.fields.includes('title') && (
                                        <Preview label="제목" value={resolved.title} />
                                    )}
                                    {def.fields.includes('content') && (
                                        <Preview label="본문" value={resolved.content} />
                                    )}
                                    {def.fields.includes('imageUrl') && resolved.imageUrl && (
                                        <Preview label="이미지 주소" value={resolved.imageUrl} truncate />
                                    )}
                                    {def.fields.includes('videoUrl') && resolved.videoUrl && (
                                        <Preview label="영상 1 주소" value={resolved.videoUrl} truncate />
                                    )}
                                    {def.fields.includes('videoUrl2') && resolved.videoUrl2 && (
                                        <Preview label="영상 2 주소" value={resolved.videoUrl2} truncate />
                                    )}
                                    {def.itemsLabel && (
                                        <Preview
                                            label={def.itemsLabel}
                                            value={
                                                resolved.items.length
                                                    ? resolved.items.map((i) => i.title || '(제목 없음)').join(' · ')
                                                    : '(항목 없음)'
                                            }
                                        />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* 편집 모달 */}
            <AnimatePresence>
                {editingDef && draft && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(4px)' }}
                        onClick={closeEditor}
                    >
                        <motion.div
                            initial={{ scale: 0.97, y: 16 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.97, y: 16 }}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                            style={{ background: '#000', border: HAIRLINE_STRONG, borderRadius: 0, fontFamily: FONT }}
                        >
                            <div
                                className="sticky top-0 z-10 flex items-center justify-between"
                                style={{ borderBottom: HAIRLINE, padding: '16px 20px', background: '#000' }}
                            >
                                <div>
                                    <h2 style={{ fontSize: 17, fontWeight: 600, color: '#fff', margin: 0 }}>
                                        {editingDef.name} 편집
                                    </h2>
                                    {editingDef.hint && (
                                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', margin: '4px 0 0' }}>
                                            {editingDef.hint}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={closeEditor}
                                    aria-label="닫기"
                                    style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
                                >
                                    <X size={22} />
                                </button>
                            </div>

                            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>
                                {editingDef.fields.map((field) => (
                                    <div key={field}>
                                        <label
                                            style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,.7)', marginBottom: 8 }}
                                        >
                                            {FIELD_LABEL[field]}
                                        </label>
                                        {field === 'content' ? (
                                            <textarea
                                                value={draft.content}
                                                onChange={(e) => patch({ content: e.target.value })}
                                                rows={6}
                                                style={{ ...inputStyle, resize: 'vertical' }}
                                                placeholder="본문을 입력하세요"
                                            />
                                        ) : field === 'title' ? (
                                            <textarea
                                                value={draft.title}
                                                onChange={(e) => patch({ title: e.target.value })}
                                                rows={2}
                                                style={{ ...inputStyle, resize: 'vertical', fontWeight: 600 }}
                                                placeholder="제목을 입력하세요"
                                            />
                                        ) : URL_FIELDS.includes(field) ? (
                                            <UploadField
                                                kind={field === 'imageUrl' ? 'image' : 'video'}
                                                folder="sections"
                                                value={draft[field as 'imageUrl' | 'videoUrl' | 'videoUrl2']}
                                                onChange={(url) => patch({ [field]: url } as Partial<DraftState>)}
                                                help={FIELD_HELP[field]}
                                            />
                                        ) : null}
                                        {!URL_FIELDS.includes(field) && (
                                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', margin: '6px 0 0' }}>
                                                {FIELD_HELP[field]}
                                            </p>
                                        )}
                                    </div>
                                ))}

                                {editingDef.itemsLabel && (
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <label style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>
                                                {editingDef.itemsLabel}
                                                {typeof editingDef.maxItems === 'number' && (
                                                    <span style={{ color: 'rgba(255,255,255,.4)' }}>
                                                        {` (${draft.items.length} / ${editingDef.maxItems})`}
                                                    </span>
                                                )}
                                            </label>
                                            <button
                                                type="button"
                                                onClick={addItem}
                                                disabled={atMax(editingDef, draft.items.length)}
                                                style={{
                                                    ...ghostBtn,
                                                    padding: '7px 12px',
                                                    fontSize: 12,
                                                    opacity: atMax(editingDef, draft.items.length) ? 0.4 : 1,
                                                    cursor: atMax(editingDef, draft.items.length) ? 'default' : 'pointer',
                                                }}
                                            >
                                                <Plus size={13} />
                                                항목 추가
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {draft.items.length === 0 && (
                                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', margin: 0 }}>
                                                    항목이 없습니다. 저장하면 기본 항목이 그대로 노출됩니다.
                                                </p>
                                            )}
                                            {draft.items.map((item, i) => (
                                                <div key={i} style={{ border: HAIRLINE, padding: 14 }}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>
                                                            {String(i + 1).padStart(2, '0')}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                aria-label="위로"
                                                                onClick={() => moveItem(i, -1)}
                                                                disabled={i === 0}
                                                                style={{ ...iconBtn, opacity: i === 0 ? 0.3 : 1 }}
                                                            >
                                                                <ArrowUp size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                aria-label="아래로"
                                                                onClick={() => moveItem(i, 1)}
                                                                disabled={i === draft.items.length - 1}
                                                                style={{ ...iconBtn, opacity: i === draft.items.length - 1 ? 0.3 : 1 }}
                                                            >
                                                                <ArrowDown size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                aria-label="삭제"
                                                                onClick={() => removeItem(i)}
                                                                style={iconBtn}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={item.title}
                                                        onChange={(e) => patchItem(i, { title: e.target.value })}
                                                        style={{ ...inputStyle, fontWeight: 600, marginBottom: 8 }}
                                                        placeholder="항목 제목"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={item.label ?? ''}
                                                        onChange={(e) => patchItem(i, { label: e.target.value })}
                                                        style={{ ...inputStyle, marginBottom: 8 }}
                                                        placeholder="보조 라벨 (선택) — 예: 기획 · 브랜딩"
                                                    />
                                                    <textarea
                                                        value={item.body}
                                                        onChange={(e) => patchItem(i, { body: e.target.value })}
                                                        rows={3}
                                                        style={{ ...inputStyle, resize: 'vertical' }}
                                                        placeholder="항목 설명"
                                                    />
                                                    <div style={{ marginTop: 10 }}>
                                                        <label
                                                            style={{
                                                                display: 'block', fontSize: 12,
                                                                color: 'rgba(255,255,255,.7)', marginBottom: 8,
                                                            }}
                                                        >
                                                            이미지
                                                        </label>
                                                        <UploadField
                                                            kind="image"
                                                            folder="sections"
                                                            value={item.image ?? ''}
                                                            onChange={(url) => patchItem(i, { image: url })}
                                                            help="비워두면 프로젝트 이미지가 순서대로 사용됩니다."
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {saveError && (
                                    <div
                                        style={{
                                            border: '1px solid rgba(255,255,255,.5)',
                                            padding: 12,
                                            fontSize: 12,
                                            color: '#fff',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        <strong style={{ display: 'block', marginBottom: 6 }}>저장 실패</strong>
                                        {saveError}
                                    </div>
                                )}

                                <div
                                    className="flex flex-wrap gap-3"
                                    style={{ paddingTop: 16, borderTop: HAIRLINE }}
                                >
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        style={{ ...primaryBtn, flex: 1, opacity: isSaving ? 0.5 : 1 }}
                                    >
                                        <Save size={15} />
                                        {isSaving ? '저장 중...' : '저장하기'}
                                    </button>
                                    <button type="button" onClick={closeEditor} style={ghostBtn}>
                                        취소
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleReset(editingDef)}
                                        style={ghostBtn}
                                    >
                                        <RotateCcw size={13} />
                                        기본값으로 되돌리기
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div
                style={{
                    marginTop: 32,
                    paddingTop: 16,
                    borderTop: HAIRLINE,
                    fontSize: 12,
                    color: 'rgba(255,255,255,.45)',
                }}
            >
                수정 내용은 Firestore와 실시간으로 동기화되며, 저장 즉시 홈페이지에 반영됩니다.
            </div>
        </div>
    );
}

function Preview({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
    return (
        <div style={{ borderLeft: HAIRLINE_STRONG, paddingLeft: 14 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', margin: '0 0 3px' }}>{label}</p>
            <p
                style={{
                    color: 'rgba(255,255,255,.85)',
                    margin: 0,
                    whiteSpace: truncate ? 'nowrap' : 'pre-wrap',
                    overflow: truncate ? 'hidden' : undefined,
                    textOverflow: truncate ? 'ellipsis' : undefined,
                }}
            >
                {value || '(비어 있음)'}
            </p>
        </div>
    );
}
