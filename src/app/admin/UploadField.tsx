import React, { useRef, useState } from 'react';
import { Upload, X, FolderOpen } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebaseStorage';
import MediaLibraryPicker from './MediaLibraryPicker';

/**
 * A media field that accepts a file upload OR a pasted URL.
 *
 * Uploads go to Firebase Storage and the resulting download URL is written
 * back through `onChange`, so the stored value is always a plain URL — the
 * public site needs no knowledge of how it got there.
 */

const inputClass =
    'w-full bg-white/[0.04] border border-white/15 px-3 py-2 text-white outline-none focus:border-white/50 transition-colors duration-200 ease-[var(--ease-btn)] placeholder:text-white/35';

export type UploadKind = 'image' | 'video';

interface UploadFieldProps {
    kind: UploadKind;
    value: string;
    onChange: (url: string) => void;
    /** Storage folder, e.g. 'sections'. */
    folder: string;
    placeholder?: string;
    help?: string;
}

export default function UploadField({ kind, value, onChange, folder, placeholder, help }: UploadFieldProps) {
    const fileInput = useRef<HTMLInputElement | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);

    const accept = kind === 'video' ? 'video/*' : 'image/*';

    const handleFile = async (file: File) => {
        setError('');
        if (!file.type.startsWith(kind === 'video' ? 'video/' : 'image/')) {
            setError(kind === 'video' ? '영상 파일을 선택해 주세요.' : '이미지 파일을 선택해 주세요.');
            return;
        }

        setProgress(0);
        try {
            const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
            const task = uploadBytesResumable(fileRef, file);

            await new Promise<void>((resolve, reject) => {
                task.on(
                    'state_changed',
                    (snap) => setProgress((snap.bytesTransferred / snap.totalBytes) * 100),
                    reject,
                    () => resolve(),
                );
            });

            onChange(await getDownloadURL(task.snapshot.ref));
        } catch {
            setError('업로드에 실패했습니다. 다시 시도해 주세요.');
        } finally {
            setProgress(null);
        }
    };

    const busy = progress !== null;

    return (
        <div>
            {value ? (
                <div className="mb-2 border border-white/15 bg-black">
                    <div className="aspect-video max-h-56 flex items-center justify-center overflow-hidden">
                        {kind === 'video' ? (
                            <video
                                src={value.includes('#') ? value : `${value}#t=0.1`}
                                className="w-full h-full object-contain"
                                controls
                                preload="metadata"
                            />
                        ) : (
                            <img src={value} alt="" className="w-full h-full object-contain" />
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-white/15 px-3 py-2">
                        <span className="truncate text-xs text-white/50">{value}</span>
                        <div className="flex shrink-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setPickerOpen(true)}
                                className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors duration-200 ease-[var(--ease-btn)]"
                            >
                                <FolderOpen size={13} />
                                교체
                            </button>
                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors duration-200 ease-[var(--ease-btn)]"
                            >
                                <X size={13} />
                                제거
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mb-2 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        disabled={busy}
                        className="flex flex-col items-center gap-2 border border-dashed border-white/15 px-4 py-6 text-white/60 hover:border-white/50 hover:text-white transition-colors duration-200 ease-[var(--ease-btn)] disabled:opacity-50"
                    >
                        <Upload size={18} />
                        <span className="text-sm">
                            {busy
                                ? `업로드 중… ${Math.round(progress ?? 0)}%`
                                : kind === 'video'
                                  ? '새 영상 업로드'
                                  : '새 이미지 업로드'}
                        </span>
                    </button>

                    {/* Reuse something already uploaded instead of uploading twice. */}
                    <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        disabled={busy}
                        className="flex flex-col items-center gap-2 border border-dashed border-white/15 px-4 py-6 text-white/60 hover:border-white/50 hover:text-white transition-colors duration-200 ease-[var(--ease-btn)] disabled:opacity-50"
                    >
                        <FolderOpen size={18} />
                        <span className="text-sm">업로드된 파일에서 선택</span>
                    </button>
                </div>
            )}

            {pickerOpen && (
                <MediaLibraryPicker kind={kind} onPick={onChange} onClose={() => setPickerOpen(false)} />
            )}

            {busy && (
                <div className="mb-2 h-1 w-full bg-white/15">
                    <div className="h-full bg-white transition-all" style={{ width: `${progress ?? 0}%` }} />
                </div>
            )}

            <input
                ref={fileInput}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                }}
            />

            {/* Manual URL entry stays available — handy for reusing an asset
              * that is already hosted, or for pasting a CDN link. */}
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={inputClass}
                placeholder={placeholder ?? (kind === 'video' ? 'https://... .mp4' : 'https://... .jpg')}
            />

            {error && <p className="mt-2 text-xs text-white" style={{ fontWeight: 600 }}>{error}</p>}
            {help && <p className="mt-2 text-xs text-white/40">{help}</p>}
        </div>
    );
}
