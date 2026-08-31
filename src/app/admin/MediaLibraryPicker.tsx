import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { X } from 'lucide-react';
import { db } from '../../firebase';
import { storage } from '../../firebaseStorage';

/**
 * Picks a media URL from what has already been uploaded.
 *
 * Two sources are merged and de-duplicated by URL:
 *   1. the `projects` collection — recognisable, carries titles and posters
 *   2. the Storage folders themselves — catches anything not attached to a
 *      project, e.g. a hero video uploaded straight from the sections editor
 */

export type MediaKind = 'image' | 'video';

/** Storage folders the admin writes into. */
const FOLDERS = ['projects', 'sections'];

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|svg)(\?|#|$)/i;

/** Firebase download URLs keep the original filename in the path segment. */
function kindFromUrl(url: string): MediaKind | undefined {
    const decoded = decodeURIComponent(url);
    if (VIDEO_EXT.test(decoded)) return 'video';
    if (IMAGE_EXT.test(decoded)) return 'image';
    return undefined;
}

interface LibraryItem {
    url: string;
    poster?: string;
    label: string;
    kind: MediaKind;
}

interface ProjectDoc {
    id: string;
    title?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    mediaType?: 'image' | 'video' | 'youtube';
    isRestricted?: boolean;
    additionalMedia?: { type?: string; url?: string; thumbnail?: string }[];
}

interface Props {
    kind: MediaKind;
    onPick: (url: string) => void;
    onClose: () => void;
}

export default function MediaLibraryPicker({ kind, onPick, onClose }: Props) {
    const [docs, setDocs] = useState<ProjectDoc[]>([]);
    const [storageItems, setStorageItems] = useState<LibraryItem[]>([]);
    const [storageError, setStorageError] = useState(false);
    const [loadingStorage, setLoadingStorage] = useState(true);
    const [query, setQuery] = useState('');

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'projects'), (snap) => {
            setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ProjectDoc[]);
        });
        return () => unsub();
    }, []);

    /* Storage listing needs a `list` rule; if it is not granted we simply fall
     * back to the project-derived library rather than failing the whole picker. */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const found: LibraryItem[] = [];
                for (const folder of FOLDERS) {
                    const res = await listAll(ref(storage, folder));
                    const urls = await Promise.all(
                        res.items.map(async (item) => ({
                            url: await getDownloadURL(item),
                            name: item.name,
                        })),
                    );
                    for (const u of urls) {
                        const k = kindFromUrl(u.url) ?? kindFromUrl(u.name);
                        if (!k) continue;
                        /* strip the timestamp prefix the uploader adds */
                        found.push({ url: u.url, kind: k, label: u.name.replace(/^\d+_/, '') });
                    }
                }
                if (!cancelled) setStorageItems(found);
            } catch {
                if (!cancelled) setStorageError(true);
            } finally {
                if (!cancelled) setLoadingStorage(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const items = useMemo(() => {
        const seen = new Set<string>();
        const out: LibraryItem[] = [];

        /* Media belonging to a locked project must not leak into a public
         * section, so those URLs are excluded from the library entirely —
         * including copies found by the Storage listing below. */
        const blocked = new Set<string>();
        for (const p of docs) {
            if (!p.isRestricted) continue;
            if (p.imageUrl) blocked.add(p.imageUrl);
            if (p.thumbnailUrl) blocked.add(p.thumbnailUrl);
            for (const m of p.additionalMedia ?? []) if (m.url) blocked.add(m.url);
        }

        const push = (url: string | undefined, itemKind: MediaKind | undefined, label: string, poster?: string) => {
            if (!url || blocked.has(url)) return;
            const k = itemKind ?? kindFromUrl(url);
            if (!k || seen.has(url)) return;
            seen.add(url);
            out.push({ url, kind: k, label, poster });
        };

        /* 1. project-attached media — richer labels, so these go first */
        for (const p of docs) {
            if (p.isRestricted) continue;
            const label = p.title ?? '제목 없음';

            if (p.mediaType === 'video') {
                push(p.imageUrl, 'video', label, p.thumbnailUrl);
            } else {
                /* image, youtube and unset all store a still in imageUrl */
                push(p.imageUrl, undefined, label, p.imageUrl);
            }

            push(p.thumbnailUrl, 'image', `${label} (썸네일)`, p.thumbnailUrl);

            for (const m of p.additionalMedia ?? []) {
                const k = m.type === 'video' ? 'video' : m.type === 'image' ? 'image' : undefined;
                push(m.url, k, label, m.thumbnail ?? (k === 'image' ? m.url : undefined));
            }
        }

        /* 2. anything sitting in Storage that no project references */
        for (const s of storageItems) push(s.url, s.kind, s.label, s.kind === 'image' ? s.url : undefined);

        const q = query.trim().toLowerCase();
        return out
            .filter((i) => i.kind === kind)
            .filter((i) => (q ? i.label.toLowerCase().includes(q) : true));
    }, [docs, storageItems, kind, query]);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[85vh] w-full max-w-4xl flex-col border border-white/28 bg-black"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-center justify-between gap-4 border-b border-white/15 px-4 py-3">
                    <span className="text-sm text-white">
                        {kind === 'video' ? '업로드된 영상에서 선택' : '업로드된 이미지에서 선택'}
                        <span className="ml-2 text-white/40">{items.length}개</span>
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="닫기"
                        className="text-white/60 hover:text-white transition-colors duration-200 ease-[var(--ease-btn)]"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="border-b border-white/15 px-4 py-3">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="이름으로 검색"
                        className="w-full border border-white/15 bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors duration-200 ease-[var(--ease-btn)] placeholder:text-white/35 focus:border-white/50"
                    />
                    {storageError && (
                        <p className="mt-2 text-xs text-white/40">
                            프로젝트에 등록된 미디어만 표시됩니다. (Storage 목록 조회 권한이 없어 폴더 전체는 불러오지 못했습니다)
                        </p>
                    )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {items.length === 0 ? (
                        <p className="py-12 text-center text-sm text-white/40">
                            {loadingStorage && docs.length === 0
                                ? '불러오는 중…'
                                : kind === 'video'
                                  ? '등록된 영상이 없습니다.'
                                  : '등록된 이미지가 없습니다.'}
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                            {items.map((item) => (
                                <button
                                    key={item.url}
                                    type="button"
                                    onClick={() => { onPick(item.url); onClose(); }}
                                    className="group border border-white/15 text-left hover:border-white transition-colors duration-200 ease-[var(--ease-btn)]"
                                >
                                    <div className="aspect-[4/3] overflow-hidden bg-black">
                                        {item.kind === 'video' ? (
                                            <video
                                                src={item.url.includes('#') ? item.url : `${item.url}#t=0.1`}
                                                poster={item.poster}
                                                className="h-full w-full object-cover"
                                                muted
                                                playsInline
                                                preload="metadata"
                                            />
                                        ) : (
                                            <img src={item.poster ?? item.url} alt="" className="h-full w-full object-cover" />
                                        )}
                                    </div>
                                    <p className="truncate px-2 py-1.5 text-xs text-white/70 group-hover:text-white">
                                        {item.label}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
