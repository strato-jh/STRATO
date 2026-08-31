import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Folder, Plus, Edit, Trash2, Eye, EyeOff, Image, Save, X, Upload, Film,
    ArrowUp, ArrowDown, ChevronsUp, LayoutGrid, List,
} from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db } from '../../firebase';
import { storage } from '../../firebaseStorage';
import { SANS, SERIF } from '../theme';
import { byDisplayOrder } from '../pages/useStratoData';

const headingStyle = { fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em' } as const;

/**
 * Media-fragment seek so the browser paints the first frame when a project has
 * no thumbnail. Without it a poster-less <video> renders as a black box.
 */
function videoSrc(url?: string) {
    if (!url) return undefined;
    return url.includes('#') ? url : `${url}#t=0.1`;
}

/* Dense admin input: 1px hairline, zero radius, no glow on focus. */
const inputClass =
    'w-full bg-white/[0.04] border border-white/15 px-3 py-2 text-white outline-none focus:border-white/50 transition-colors duration-200 ease-[var(--ease-btn)] placeholder:text-white/35';
const labelClass = 'block text-sm mb-2 uppercase tracking-wide text-white/50';
const dropZoneClass =
    'border border-dashed border-white/15 text-center hover:border-white/50 transition-colors duration-200 ease-[var(--ease-btn)]';
/* Active filter is white-filled; inactive is a hairline outline. */
const chipClass = (active: boolean) =>
    `px-4 py-2 text-sm uppercase tracking-wide transition-colors duration-200 ease-[var(--ease-btn)] ${
        active
            ? 'bg-white text-black font-medium'
            : 'border border-white/15 text-white/70 hover:border-white hover:text-white'
    }`;

interface MediaItem {
    url: string;
    type: 'image' | 'video';
}

interface Project {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    thumbnailUrl?: string;
    mediaType: 'image' | 'video' | 'youtube';
    youtubeUrl?: string;
    isRestricted: boolean;
    category: string;
    date: string;
    location?: string;
    additionalMedia?: MediaItem[];
    createdAt?: number;
    /** Manual display order. Lower comes first; unset sorts last. */
    order?: number;
}

export default function ProjectManager() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
    const [selectedAdditionalFiles, setSelectedAdditionalFiles] = useState<File[]>([]);
    const [isReordering, setIsReordering] = useState(false);
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const projectsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Project[];
            /* Same ordering rule as the public site. */
            setProjects(projectsData.sort(byDisplayOrder));
        }, (error) => {
            console.error("Error fetching projects: ", error);
        });
        return () => unsubscribe();
    }, []);

    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Project | null>(null);
    const [filter, setFilter] = useState<'all' | 'visible' | 'restricted'>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newProject, setNewProject] = useState<Project>({
        id: '',
        title: '',
        description: '',
        imageUrl: '',
        thumbnailUrl: '',
        mediaType: 'image',
        youtubeUrl: '',
        isRestricted: false,
        category: 'FASHION',
        date: '2025.10 — 2026.03',
        location: '',
        additionalMedia: []
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check if it's image or video
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
            alert('Please upload an image or video file');
            return;
        }

        setSelectedFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            if (isEdit && editForm) {
                setEditForm({
                    ...editForm,
                    imageUrl: result,
                    mediaType: editForm.mediaType === 'youtube' ? 'youtube' : (isImage ? 'image' : 'video')
                });
            } else {
                setNewProject({
                    ...newProject,
                    imageUrl: result,
                    mediaType: newProject.mediaType === 'youtube' ? 'youtube' : (isImage ? 'image' : 'video')
                });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleEdit = (project: Project) => {
        setEditForm({ ...project, thumbnailUrl: project.thumbnailUrl || '', additionalMedia: project.additionalMedia || [] });
        setIsEditing(true);
        setSelectedProject(project);
    };

    const handleAdditionalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const validFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
        setSelectedAdditionalFiles(prev => [...prev, ...validFiles]);
    };

    const removeAdditionalFile = (idx: number) => {
        setSelectedAdditionalFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const removeExistingAdditionalMedia = (idx: number) => {
        if (editForm) {
            const newMedia = [...(editForm.additionalMedia || [])];
            newMedia.splice(idx, 1);
            setEditForm({ ...editForm, additionalMedia: newMedia });
        }
    };

    const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file for thumbnail');
            return;
        }

        setSelectedThumbnailFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            if (isEdit && editForm) {
                setEditForm({ ...editForm, thumbnailUrl: result });
            } else {
                setNewProject({ ...newProject, thumbnailUrl: result });
            }
        };
        reader.readAsDataURL(file);
    };

    const uploadFileToStorage = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const fileRef = ref(storage, `projects/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(fileRef, file);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                }, 
                (error) => {
                    reject(error);
                }, 
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                }
            );
        });
    }

    const handleSave = async () => {
        if (editForm) {
            try {
                let finalImageUrl = editForm.imageUrl;
                if (selectedFile) {
                    finalImageUrl = await uploadFileToStorage(selectedFile);
                }

                let finalThumbnailUrl = editForm.thumbnailUrl || '';
                if (editForm.mediaType === 'video' && selectedThumbnailFile) {
                    finalThumbnailUrl = await uploadFileToStorage(selectedThumbnailFile);
                }
                
                // Upload newly added additional files
                const newlyUploadedMedias: MediaItem[] = [];
                if (selectedAdditionalFiles.length > 0) {
                    for (let i = 0; i < selectedAdditionalFiles.length; i++) {
                        const file = selectedAdditionalFiles[i];
                        const downloadUrl = await uploadFileToStorage(file);
                        newlyUploadedMedias.push({
                            url: downloadUrl,
                            type: file.type.startsWith('image/') ? 'image' : 'video'
                        });
                    }
                }
                
                const finalAdditionalMedia = [...(editForm.additionalMedia || []), ...newlyUploadedMedias];

                const projectRef = doc(db, 'projects', editForm.id);
                /* Firestore rejects `undefined` outright, so every optional
                 * field is coerced to '' before it goes near the write. */
                await updateDoc(projectRef, {
                    title: editForm.title ?? '',
                    description: editForm.description ?? '',
                    imageUrl: finalImageUrl ?? '',
                    thumbnailUrl: editForm.mediaType === 'video' ? (finalThumbnailUrl ?? '') : '',
                    mediaType: editForm.mediaType ?? 'image',
                    youtubeUrl: editForm.mediaType === 'youtube' ? (editForm.youtubeUrl ?? '') : '',
                    isRestricted: !!editForm.isRestricted,
                    category: editForm.category ?? '',
                    date: editForm.date ?? '',
                    location: editForm.location ?? '',
                    additionalMedia: finalAdditionalMedia.map((m) => ({
                        url: m.url ?? '',
                        type: m.type ?? 'image',
                        ...(m.thumbnail ? { thumbnail: m.thumbnail } : {}),
                    })),
                });
                
                setIsEditing(false);
                setSelectedProject(null);
                setEditForm(null);
                setSelectedFile(null);
                setSelectedThumbnailFile(null);
                setSelectedAdditionalFiles([]);
                setUploadProgress(0);
            } catch (error) {
                console.error("Error updating project: ", error);
                alert("Failed to update project");
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this project?')) {
            try {
                await deleteDoc(doc(db, 'projects', id));
            } catch (error) {
                console.error("Error deleting document: ", error);
            }
        }
    };

    const handleToggleVisibility = async (project: Project) => {
        try {
            await updateDoc(doc(db, 'projects', project.id), {
                isRestricted: !project.isRestricted
            });
        } catch (error) {
            console.error("Error updating visibility: ", error);
        }
    };

    const handleAddNew = async () => {
        if (!newProject.title) return;
        
        try {
            let finalImageUrl = newProject.imageUrl;
            if (selectedFile) {
                finalImageUrl = await uploadFileToStorage(selectedFile);
            }

            let finalThumbnailUrl = newProject.thumbnailUrl || '';
            if (newProject.mediaType === 'video' && selectedThumbnailFile) {
                finalThumbnailUrl = await uploadFileToStorage(selectedThumbnailFile);
            }

            // Upload additional files sequentially
            const newAdditionalMedias: MediaItem[] = [];
            if (selectedAdditionalFiles.length > 0) {
                for (let i = 0; i < selectedAdditionalFiles.length; i++) {
                    const file = selectedAdditionalFiles[i];
                    const downloadUrl = await uploadFileToStorage(file);
                    newAdditionalMedias.push({
                        url: downloadUrl,
                        type: file.type.startsWith('image/') ? 'image' : 'video'
                    });
                }
            }

            /* Same rule as the edit path: never let `undefined` reach Firestore. */
            await addDoc(collection(db, 'projects'), {
                title: newProject.title ?? '',
                description: newProject.description ?? '',
                imageUrl: finalImageUrl ?? '',
                thumbnailUrl: newProject.mediaType === 'video' ? (finalThumbnailUrl ?? '') : '',
                mediaType: newProject.mediaType ?? 'image',
                youtubeUrl: newProject.mediaType === 'youtube' ? (newProject.youtubeUrl ?? '') : '',
                isRestricted: !!newProject.isRestricted,
                category: newProject.category ?? '',
                date: newProject.date ?? '',
                location: newProject.location ?? '',
                additionalMedia: newAdditionalMedias.map((m) => ({
                    url: m.url ?? '',
                    type: m.type ?? 'image',
                    ...(m.thumbnail ? { thumbnail: m.thumbnail } : {}),
                })),
                createdAt: Date.now()
            });

            setShowAddModal(false);
            setNewProject({
                id: '',
                title: '',
                description: '',
                imageUrl: '',
                thumbnailUrl: '',
                mediaType: 'image',
                youtubeUrl: '',
                isRestricted: false,
                category: 'FASHION',
                date: '2025.10 — 2026.03',
                location: '',
                additionalMedia: []
            });
            setSelectedFile(null);
            setSelectedThumbnailFile(null);
            setSelectedAdditionalFiles([]);
            setUploadProgress(0);
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("Failed to add project");
        }
    };

    const filteredProjects = projects.filter(p => {
        if (filter === 'visible') return !p.isRestricted;
        if (filter === 'restricted') return p.isRestricted;
        return true;
    });

    /* Reordering rewrites `order` for every project in one batch, so a list
     * that was never ordered before gets normalised on the first move.
     * Only offered on the unfiltered list — moving an item inside a filtered
     * view would jump it past hidden neighbours with no visible feedback. */
    const canReorder = filter === 'all';

    const persistOrder = async (next: Project[]) => {
        setIsReordering(true);
        try {
            const batch = writeBatch(db);
            next.forEach((p, i) => batch.update(doc(db, 'projects', p.id), { order: i }));
            await batch.commit();
        } catch (error) {
            console.error('Error reordering projects: ', error);
            alert('순서 변경에 실패했습니다.');
        } finally {
            setIsReordering(false);
        }
    };

    /** Pull one project out and re-insert it at `to`, then renumber everything. */
    const moveTo = async (from: number, to: number) => {
        if (isReordering || from === to) return;
        if (from < 0 || from >= projects.length || to < 0 || to >= projects.length) return;

        const next = [...projects];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        await persistOrder(next);
    };

    const moveProject = (index: number, delta: number) => moveTo(index, index + delta);

    /* --- drag and drop (native HTML5, no dependency) --- */

    const onDragStart = (index: number) => (e: React.DragEvent) => {
        if (!canReorder) return;
        setDragIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        /* Firefox needs data set or the drag never starts. */
        e.dataTransfer.setData('text/plain', String(index));
    };

    const onDragOver = (index: number) => (e: React.DragEvent) => {
        if (!canReorder || dragIndex === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (index !== overIndex) setOverIndex(index);
    };

    const onDrop = (index: number) => (e: React.DragEvent) => {
        if (!canReorder || dragIndex === null) return;
        e.preventDefault();
        const from = dragIndex;
        setDragIndex(null);
        setOverIndex(null);
        moveTo(from, index);
    };

    const onDragEnd = () => {
        setDragIndex(null);
        setOverIndex(null);
    };

    /* Suggestions come from what is actually in the data, plus the studio's
     * standing set — so a new category can be typed without a code change. */
    const categoryOptions = Array.from(
        new Set([
            ...projects.map((p) => (p.category ?? '').trim().toUpperCase()).filter(Boolean),
            'FASHION', 'BEAUTY', 'EDUCATION', 'OTHER',
        ]),
    ).sort();

    return (
        <div style={{ fontFamily: SANS }}>
            <datalist id="strato-categories">
                {categoryOptions.map((c) => (
                    <option key={c} value={c} />
                ))}
            </datalist>

            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-3xl mb-2 flex items-center gap-3 text-white"
                        style={headingStyle}
                    >
                        <Folder size={28} className="text-white" />
                        Project Manager
                    </motion.h1>
                    <p className="text-sm text-white/50">프로젝트와 미디어를 등록하고 노출 순서를 관리합니다</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-white text-black px-6 py-3 font-medium uppercase tracking-wide hover:bg-white/85 transition-colors duration-200 ease-[var(--ease-btn)] flex items-center gap-2"
                >
                    <Plus size={18} />
                    Add New
                </button>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-2 flex-wrap">
                <button onClick={() => setFilter('all')} className={chipClass(filter === 'all')}>
                    All ({projects.length})
                </button>
                <button onClick={() => setFilter('visible')} className={chipClass(filter === 'visible')}>
                    Visible ({projects.filter(p => !p.isRestricted).length})
                </button>
                <button onClick={() => setFilter('restricted')} className={chipClass(filter === 'restricted')}>
                    Restricted ({projects.filter(p => p.isRestricted).length})
                </button>

                <div className="ml-auto flex gap-2">
                    <button
                        onClick={() => setView('grid')}
                        className={`${chipClass(view === 'grid')} flex items-center gap-1.5`}
                        title="그리드로 보기"
                    >
                        <LayoutGrid size={14} />
                        Grid
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={`${chipClass(view === 'list')} flex items-center gap-1.5`}
                        title="리스트로 보기"
                    >
                        <List size={14} />
                        List
                    </button>
                </div>
            </div>

            <p className="mb-6 text-xs text-white/40">
                {canReorder
                    ? '드래그해서 옮기거나 화살표를 쓰세요. ⌃ 는 맨 앞으로 보냅니다. 이 순서가 사이트에 그대로 반영됩니다.'
                    : '순서 변경은 All 탭에서만 가능합니다.'}
            </p>

            {view === 'list' ? (
                /* Compact rows — the practical way to reorder a long list. */
                <div className="border border-white/15">
                    {filteredProjects.map((project, index) => (
                        <div
                            key={project.id}
                            draggable={canReorder && !isReordering}
                            onDragStart={onDragStart(index)}
                            onDragOver={onDragOver(index)}
                            onDrop={onDrop(index)}
                            onDragEnd={onDragEnd}
                            className="flex items-center gap-3 border-b border-white/15 px-3 py-2 last:border-b-0 hover:bg-white/5 transition-colors duration-200 ease-[var(--ease-btn)]"
                            style={{
                                opacity: dragIndex === index ? 0.35 : 1,
                                /* drop indicator */
                                boxShadow:
                                    overIndex === index && dragIndex !== null && dragIndex !== index
                                        ? 'inset 0 2px 0 0 var(--accent)'
                                        : undefined,
                                cursor: canReorder ? 'grab' : undefined,
                            }}
                        >
                            <span className="w-7 shrink-0 text-xs text-white/40 tabular-nums">
                                {String(index + 1).padStart(2, '0')}
                            </span>

                            <div className="h-11 w-11 shrink-0 overflow-hidden bg-black">
                                {project.mediaType === 'video' ? (
                                    <video
                                        src={videoSrc(project.imageUrl)}
                                        poster={project.thumbnailUrl}
                                        className="h-full w-full object-cover"
                                        muted
                                        playsInline
                                        preload="metadata"
                                    />
                                ) : (
                                    <img src={project.imageUrl} alt="" className="h-full w-full object-cover" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm text-white">{project.title}</p>
                                <p className="truncate text-xs text-white/50">
                                    {[project.category, project.date].filter(Boolean).join(' · ')}
                                </p>
                            </div>

                            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                                {project.mediaType === 'video' && (
                                    <span className="border border-white/28 px-1.5 py-0.5 text-[10px] uppercase text-white/70">
                                        Video
                                    </span>
                                )}
                                {project.isRestricted && (
                                    <span className="border border-white/28 px-1.5 py-0.5 text-[10px] uppercase text-white/70">
                                        Restricted
                                    </span>
                                )}
                                {project.mediaType === 'video' && !project.thumbnailUrl && (
                                    <span className="border border-white/60 px-1.5 py-0.5 text-[10px] text-white">
                                        썸네일 없음
                                    </span>
                                )}
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                                {canReorder && (
                                    <>
                                        <button
                                            onClick={() => moveTo(index, 0)}
                                            disabled={index === 0 || isReordering}
                                            title="맨 앞으로"
                                            aria-label="맨 앞으로 이동"
                                            className="border border-white/28 p-1 text-white hover:border-white disabled:opacity-30 transition-colors duration-200 ease-[var(--ease-btn)]"
                                        >
                                            <ChevronsUp size={12} />
                                        </button>
                                        <button
                                            onClick={() => moveProject(index, -1)}
                                            disabled={index === 0 || isReordering}
                                            title="앞으로"
                                            aria-label="앞으로 이동"
                                            className="border border-white/28 p-1 text-white hover:border-white disabled:opacity-30 transition-colors duration-200 ease-[var(--ease-btn)]"
                                        >
                                            <ArrowUp size={12} />
                                        </button>
                                        <button
                                            onClick={() => moveProject(index, 1)}
                                            disabled={index === projects.length - 1 || isReordering}
                                            title="뒤로"
                                            aria-label="뒤로 이동"
                                            className="border border-white/28 p-1 text-white hover:border-white disabled:opacity-30 transition-colors duration-200 ease-[var(--ease-btn)]"
                                        >
                                            <ArrowDown size={12} />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => handleEdit(project)}
                                    className="bg-white px-3 py-1 text-xs font-medium uppercase text-black hover:bg-white/85 transition-colors duration-200 ease-[var(--ease-btn)]"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleToggleVisibility(project)}
                                    title={project.isRestricted ? '공개로 전환' : '비공개로 전환'}
                                    className="border border-white/28 p-1.5 text-white hover:border-white transition-colors duration-200 ease-[var(--ease-btn)]"
                                >
                                    {project.isRestricted ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                                <button
                                    onClick={() => handleDelete(project.id)}
                                    title="삭제"
                                    className="bg-red-500/80 p-1.5 text-white hover:bg-red-500 transition-colors duration-200 ease-[var(--ease-btn)]"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (

            /* Project Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProjects.map((project, index) => (
                    <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        draggable={canReorder && !isReordering}
                        onDragStart={onDragStart(index)}
                        onDragOver={onDragOver(index)}
                        onDrop={onDrop(index)}
                        onDragEnd={onDragEnd}
                        className="bg-white/5 border border-white/15 overflow-hidden hover:border-white/28 transition-colors duration-200 ease-[var(--ease-btn)] group"
                        style={{
                            opacity: dragIndex === index ? 0.35 : undefined,
                            outline:
                                overIndex === index && dragIndex !== null && dragIndex !== index
                                    ? '2px solid var(--accent)'
                                    : undefined,
                            outlineOffset: -2,
                            cursor: canReorder ? 'grab' : undefined,
                        }}
                    >
                        {/* Media */}
                        <div className="relative aspect-[4/5] bg-black overflow-hidden">
                            {project.mediaType === 'video' ? (
                                <video
                                    src={videoSrc(project.imageUrl)}
                                    poster={project.thumbnailUrl}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-300"
                                    muted
                                    loop
                                    playsInline
                                    preload="metadata"
                                />
                            ) : (
                                <img
                                    src={project.imageUrl}
                                    alt={project.title}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                                />
                            )}
                            <div className="absolute top-2 right-2 flex gap-1 flex-col items-end">
                                {project.mediaType === 'video' && (
                                    <span className="bg-white text-black px-2 py-1 text-[10px] font-medium uppercase tracking-wide flex items-center gap-1">
                                        <Film size={10} />
                                        Video
                                    </span>
                                )}
                                {project.isRestricted && (
                                    <span className="bg-white text-black px-2 py-1 text-[10px] font-medium uppercase tracking-wide">
                                        Restricted
                                    </span>
                                )}
                                {/* Without a thumbnail the card falls back to the
                                  * first video frame — flag it so it gets fixed. */}
                                {project.mediaType === 'video' && !project.thumbnailUrl && (
                                    <span className="border border-white/60 text-white px-2 py-1 text-[10px] font-medium tracking-wide">
                                        썸네일 없음
                                    </span>
                                )}
                            </div>

                            {/* Display-order controls */}
                            {canReorder && (
                                <div className="absolute top-2 left-2 flex items-center gap-1">
                                    <span className="bg-black/70 text-white px-2 py-1 text-[10px] font-medium tabular-nums">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <button
                                        onClick={() => moveTo(index, 0)}
                                        disabled={index === 0 || isReordering}
                                        title="맨 앞으로"
                                        aria-label="맨 앞으로 이동"
                                        className="bg-black/70 text-white p-1 border border-white/28 hover:border-white disabled:opacity-30 transition-colors duration-200 ease-[var(--ease-btn)]"
                                    >
                                        <ChevronsUp size={12} />
                                    </button>
                                    <button
                                        onClick={() => moveProject(index, -1)}
                                        disabled={index === 0 || isReordering}
                                        title="앞으로"
                                        aria-label="앞으로 이동"
                                        className="bg-black/70 text-white p-1 border border-white/28 hover:border-white disabled:opacity-30 transition-colors duration-200 ease-[var(--ease-btn)]"
                                    >
                                        <ArrowUp size={12} />
                                    </button>
                                    <button
                                        onClick={() => moveProject(index, 1)}
                                        disabled={index === projects.length - 1 || isReordering}
                                        title="뒤로"
                                        aria-label="뒤로 이동"
                                        className="bg-black/70 text-white p-1 border border-white/28 hover:border-white disabled:opacity-30 transition-colors duration-200 ease-[var(--ease-btn)]"
                                    >
                                        <ArrowDown size={12} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="p-3">
                            <h3 className="font-medium text-sm mb-1 truncate text-white">{project.title}</h3>
                            <p className="text-xs text-white/50 mb-3 truncate">{project.category}</p>

                            {/* Actions */}
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleEdit(project)}
                                    className="flex-1 bg-white text-black px-2 py-1.5 text-xs font-medium uppercase hover:bg-white/85 transition-colors duration-200 ease-[var(--ease-btn)] flex items-center justify-center gap-1"
                                >
                                    <Edit size={12} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleToggleVisibility(project)}
                                    className="text-white px-2 py-1.5 text-xs border border-white/28 hover:border-white transition-colors duration-200 ease-[var(--ease-btn)]"
                                    title={project.isRestricted ? 'Make Visible' : 'Make Restricted'}
                                >
                                    {project.isRestricted ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                                <button
                                    onClick={() => handleDelete(project.id)}
                                    className="bg-red-500/80 text-white px-2 py-1.5 text-xs hover:bg-red-500 transition-colors duration-200 ease-[var(--ease-btn)]"
                                    title="Delete"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
            )}

            {/* Add New Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => { setShowAddModal(false); setSelectedAdditionalFiles([]); setUploadProgress(0); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="bg-black border border-white/28 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="border-b border-white/15 p-4 flex items-center justify-between sticky top-0 bg-black z-10">
                                <h2 className="text-xl text-white" style={headingStyle}>Add New Project</h2>
                                <button
                                    onClick={() => { setShowAddModal(false); setSelectedAdditionalFiles([]); setUploadProgress(0); }}
                                    className="text-white/70 hover:text-white transition-colors duration-200 ease-[var(--ease-btn)]"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="p-6 space-y-6">
                                {/* Media Type Switch */}
                                <div>
                                    <label className={labelClass}>
                                        Media Source
                                    </label>
                                    <div className="flex gap-6 mb-4 mt-2">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70"><input type="radio" className="accent-white cursor-pointer w-4 h-4" checked={newProject.mediaType !== 'youtube'} onChange={() => setNewProject({ ...newProject, mediaType: 'image' })} /> Direct Upload (Image/Video)</label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70"><input type="radio" className="accent-white cursor-pointer w-4 h-4" checked={newProject.mediaType === 'youtube'} onChange={() => setNewProject({ ...newProject, mediaType: 'youtube' })} /> YouTube Link</label>
                                    </div>
                                </div>

                                {/* YouTube Input */}
                                {newProject.mediaType === 'youtube' && (
                                    <div>
                                        <label className={labelClass}>
                                            YouTube URL
                                        </label>
                                        <input type="text" value={newProject.youtubeUrl || ''} onChange={(e) => setNewProject({ ...newProject, youtubeUrl: e.target.value })} className={`${inputClass} text-sm`} placeholder="e.g. https://www.youtube.com/watch?v=..." />
                                        <p className="text-xs text-white/50 mt-2">YouTube 링크를 쓰면 서버 부담이 줄어듭니다. 목록에 노출될 썸네일 이미지를 아래에서 함께 등록해 주세요.</p>
                                    </div>
                                )}

                                {/* File Upload */}
                                <div>
                                    <label className={labelClass}>
                                        {newProject.mediaType === 'youtube' ? '썸네일 이미지 업로드' : '이미지 또는 영상 업로드'}
                                    </label>
                                    <div className={`${dropZoneClass} p-6`}>
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            onChange={(e) => handleFileUpload(e, false)}
                                            className="hidden"
                                            id="file-upload-new"
                                        />
                                        <label
                                            htmlFor="file-upload-new"
                                            className="cursor-pointer flex flex-col items-center gap-3"
                                        >
                                            <Upload size={28} className="text-white/50" />
                                            <span className="text-sm text-white/50">
                                                Click to upload or drag and drop
                                            </span>
                                            <span className="text-xs text-white/35">
                                                Images: JPG, PNG, GIF / Videos: MP4, WebM, MOV
                                            </span>
                                        </label>
                                    </div>
                                    {newProject.imageUrl && (
                                        <div className="mt-4 border border-white/15 p-2">
                                            <p className="text-xs text-white/50 mb-2 uppercase">Preview:</p>
                                            {newProject.mediaType === 'video' ? (
                                                <video
                                                    src={videoSrc(newProject.imageUrl)}
                                                    poster={newProject.thumbnailUrl}
                                                    className="w-full max-h-64 object-contain"
                                                    controls
                                                    preload="metadata"
                                                />
                                            ) : (
                                                <img
                                                    src={newProject.imageUrl}
                                                    alt="Preview"
                                                    className="w-full max-h-64 object-contain"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Thumbnail Upload (Only for Video) */}
                                {newProject.mediaType === 'video' && (
                                <div>
                                    <label className={labelClass}>
                                        Upload Thumbnail Image (Required for video)
                                    </label>
                                    <div className={`${dropZoneClass} p-4 bg-white/5`}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleThumbnailUpload(e, false)}
                                            className="hidden"
                                            id="thumbnail-upload-new"
                                        />
                                        <label
                                            htmlFor="thumbnail-upload-new"
                                            className="cursor-pointer flex flex-col items-center gap-2"
                                        >
                                            <Upload size={24} className="text-white/50" />
                                            <span className="text-xs text-white/70">
                                                Click to upload thumbnail (JPG, PNG)
                                            </span>
                                        </label>
                                    </div>
                                    {newProject.thumbnailUrl && (
                                        <div className="mt-2 text-xs text-white/70">Thumbnail selected.</div>
                                    )}
                                </div>
                                )}

                                {/* Additional Media Upload */}
                                <div>
                                    <label className={labelClass}>
                                        Additional Sub Media (Optional)
                                    </label>
                                    <div className={`${dropZoneClass} p-4`}>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*,video/*"
                                            onChange={handleAdditionalFileUpload}
                                            className="hidden"
                                            id="additional-files-new"
                                        />
                                        <label
                                            htmlFor="additional-files-new"
                                            className="cursor-pointer flex flex-col items-center gap-2"
                                        >
                                            <Plus size={24} className="text-white/70" />
                                            <span className="text-xs text-white/70 uppercase">
                                                Add multiple sub images or videos
                                            </span>
                                        </label>
                                    </div>
                                    {selectedAdditionalFiles.length > 0 && (
                                        <div className="mt-3 flex flex-col gap-2">
                                            {selectedAdditionalFiles.map((file, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white/5 border border-white/15">
                                                    <span className="truncate w-[80%]">{file.name}</span>
                                                    <button onClick={() => removeAdditionalFile(idx)} className="text-red-500/80 hover:text-red-500 transition-colors duration-200 ease-[var(--ease-btn)]">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <div>
                                    <label className={labelClass}>
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={newProject.title}
                                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                                        className={inputClass}
                                        placeholder="Project Title"
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className={labelClass}>
                                        Category
                                    </label>
                                    <input
                                        type="text"
                                        list="strato-categories"
                                        value={newProject.category}
                                        onChange={(e) => setNewProject({ ...newProject, category: e.target.value.toUpperCase() })}
                                        className={`${inputClass} uppercase`}
                                        placeholder="예: FASHION"
                                    />
                                    <p className="text-xs text-white/40 mt-2">
                                        기존 카테고리에서 고르거나 새로 입력할 수 있습니다. 사이트 필터는 실제 등록된 카테고리를 따라갑니다.
                                    </p>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className={labelClass}>
                                        Description
                                    </label>
                                    <textarea
                                        value={newProject.description}
                                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                        rows={4}
                                        className={`${inputClass} resize-none`}
                                        placeholder="Project description..."
                                    />
                                </div>

                                {/* Date */}
                                <div>
                                    <label className={labelClass}>
                                        Date Range
                                    </label>
                                    <input
                                        type="text"
                                        value={newProject.date}
                                        onChange={(e) => setNewProject({ ...newProject, date: e.target.value })}
                                        className={inputClass}
                                        placeholder="2025.10 — 2026.03"
                                    />
                                </div>

                                {/* Location */}
                                <div>
                                    <label className={labelClass}>
                                        Location (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={newProject.location || ''}
                                        onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                                        className={inputClass}
                                        placeholder="e.g., Hyundai Dept. Trade Center"
                                    />
                                </div>

                                {/* Visibility */}
                                <div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newProject.isRestricted}
                                            onChange={(e) => setNewProject({ ...newProject, isRestricted: e.target.checked })}
                                            className="w-5 h-5 accent-white"
                                        />
                                        <span className="text-sm uppercase tracking-wide">
                                            Make this project restricted (requires access code)
                                        </span>
                                    </label>
                                </div>

                                {/* Actions */}
                                {uploadProgress > 0 && uploadProgress < 100 && (
                                    <div className="w-full h-1 bg-white/15 mt-4">
                                        <div className="h-full bg-white transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                )}
                                <div className="flex gap-3 pt-4 border-t border-white/15">
                                    <button
                                        onClick={handleAddNew}
                                        disabled={!newProject.title || !newProject.imageUrl || (uploadProgress > 0 && uploadProgress < 100)}
                                        className="flex-1 bg-white text-black px-6 py-3 font-medium uppercase tracking-wide hover:bg-white/85 transition-colors duration-200 ease-[var(--ease-btn)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Plus size={18} />
                                        {uploadProgress > 0 && uploadProgress < 100 ? 'Uploading...' : 'Add Project'}
                                    </button>
                                    <button
                                        onClick={() => setShowAddModal(false)}
                                        className="px-6 py-3 border border-white/28 text-white font-medium uppercase tracking-wide hover:border-white transition-colors duration-200 ease-[var(--ease-btn)]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditing && editForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => { setIsEditing(false); setSelectedAdditionalFiles([]); setUploadProgress(0); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="bg-black border border-white/28 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="border-b border-white/15 p-4 flex items-center justify-between sticky top-0 bg-black z-10">
                                <h2 className="text-xl text-white" style={headingStyle}>Edit Project</h2>
                                <button
                                    onClick={() => { setIsEditing(false); setSelectedAdditionalFiles([]); setUploadProgress(0); }}
                                    className="text-white/70 hover:text-white transition-colors duration-200 ease-[var(--ease-btn)]"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="p-6 space-y-6">
                                {/* Media Type Switch */}
                                <div>
                                    <label className={labelClass}>
                                        Media Source
                                    </label>
                                    <div className="flex gap-6 mb-4 mt-2">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70"><input type="radio" className="accent-white cursor-pointer w-4 h-4" checked={editForm.mediaType !== 'youtube'} onChange={() => setEditForm({ ...editForm, mediaType: 'image' })} /> Direct Upload (Image/Video)</label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70"><input type="radio" className="accent-white cursor-pointer w-4 h-4" checked={editForm.mediaType === 'youtube'} onChange={() => setEditForm({ ...editForm, mediaType: 'youtube' })} /> YouTube Link</label>
                                    </div>
                                </div>

                                {/* YouTube Input */}
                                {editForm.mediaType === 'youtube' && (
                                    <div>
                                        <label className={labelClass}>
                                            YouTube URL
                                        </label>
                                        <input type="text" value={editForm.youtubeUrl || ''} onChange={(e) => setEditForm({ ...editForm, youtubeUrl: e.target.value })} className={`${inputClass} text-sm`} placeholder="e.g. https://www.youtube.com/watch?v=..." />
                                        <p className="text-xs text-white/50 mt-2">YouTube 링크를 쓰면 서버 부담이 줄어듭니다. 목록에 노출될 썸네일 이미지가 등록돼 있는지 확인해 주세요.</p>
                                    </div>
                                )}

                                {/* Current Media Preview */}
                                <div>
                                    <label className={labelClass}>
                                        Current Thumbnail / Media
                                    </label>
                                    <div className="aspect-[4/5] max-w-xs bg-black border border-white/15">
                                        {editForm.mediaType === 'video' ? (
                                            <video
                                                src={videoSrc(editForm.imageUrl)}
                                                poster={editForm.thumbnailUrl}
                                                className="w-full h-full object-cover"
                                                controls
                                                preload="metadata"
                                            />
                                        ) : (
                                            <img src={editForm.imageUrl} alt="" className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                </div>

                                {/* File Upload */}
                                <div>
                                    <label className={labelClass}>
                                        Replace Media (Optional)
                                    </label>
                                    <div className={`${dropZoneClass} p-4`}>
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            onChange={(e) => handleFileUpload(e, true)}
                                            className="hidden"
                                            id="file-upload-edit"
                                        />
                                        <label
                                            htmlFor="file-upload-edit"
                                            className="cursor-pointer flex flex-col items-center gap-2"
                                        >
                                            <Upload size={24} className="text-white/50" />
                                            <span className="text-xs text-white/50">
                                                Click to upload new media
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Thumbnail Replace (Only for Video) */}
                                {editForm.mediaType === 'video' && (
                                <div>
                                    <label className={labelClass}>
                                        Update Thumbnail Image
                                    </label>
                                    {editForm.thumbnailUrl && (
                                        <img src={editForm.thumbnailUrl} alt="Thumbnail" className="w-24 h-24 object-cover border border-white/20 mb-2" />
                                    )}
                                    <div className={`${dropZoneClass} p-4 bg-white/5`}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleThumbnailUpload(e, true)}
                                            className="hidden"
                                            id="thumbnail-upload-edit"
                                        />
                                        <label
                                            htmlFor="thumbnail-upload-edit"
                                            className="cursor-pointer flex flex-col items-center gap-2"
                                        >
                                            <Upload size={24} className="text-white/50" />
                                            <span className="text-xs text-white/70">
                                                Click to replace thumbnail
                                            </span>
                                        </label>
                                    </div>
                                </div>
                                )}

                                {/* Edit Additional Media */}
                                <div>
                                    <label className={labelClass}>
                                        Additional Sub Media
                                    </label>
                                    
                                    {/* Existing Media */}
                                    {editForm.additionalMedia && editForm.additionalMedia.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs text-white/50 uppercase mb-2">Existing Media:</p>
                                            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                                                {editForm.additionalMedia.map((media, idx) => (
                                                    <div key={idx} className="relative w-24 h-24 shrink-0 border border-white/20 bg-black group">
                                                        {media.type === 'video' ? (
                                                            <video
                                                                src={videoSrc(media.url)}
                                                                poster={media.thumbnail}
                                                                className="w-full h-full object-cover"
                                                                preload="metadata"
                                                            />
                                                        ) : (
                                                            <img src={media.url} alt="" className="w-full h-full object-cover" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button onClick={() => removeExistingAdditionalMedia(idx)} className="text-red-500/80 hover:text-red-500 transition-colors duration-200 ease-[var(--ease-btn)]">
                                                                <Trash2 size={20} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Add New Additional Media */}
                                    <div className={`${dropZoneClass} p-4`}>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*,video/*"
                                            onChange={handleAdditionalFileUpload}
                                            className="hidden"
                                            id="additional-files-edit"
                                        />
                                        <label
                                            htmlFor="additional-files-edit"
                                            className="cursor-pointer flex flex-col items-center gap-2"
                                        >
                                            <Plus size={24} className="text-white/70" />
                                            <span className="text-xs text-white/70 uppercase">
                                                Add multiple sub images or videos
                                            </span>
                                        </label>
                                    </div>
                                    {selectedAdditionalFiles.length > 0 && (
                                        <div className="mt-3 flex flex-col gap-2">
                                            <p className="text-xs text-white/50 uppercase">New Media to Upload:</p>
                                            {selectedAdditionalFiles.map((file, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white/5 border border-white/15">
                                                    <span className="truncate w-[80%]">{file.name}</span>
                                                    <button onClick={() => removeAdditionalFile(idx)} className="text-red-500/80 hover:text-red-500 transition-colors duration-200 ease-[var(--ease-btn)]">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <div>
                                    <label className={labelClass}>
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className={labelClass}>
                                        Category
                                    </label>
                                    <input
                                        type="text"
                                        list="strato-categories"
                                        value={editForm.category}
                                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value.toUpperCase() })}
                                        className={`${inputClass} uppercase`}
                                        placeholder="예: FASHION"
                                    />
                                    <p className="text-xs text-white/40 mt-2">
                                        기존 카테고리에서 고르거나 새로 입력할 수 있습니다.
                                    </p>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className={labelClass}>
                                        Description
                                    </label>
                                    <textarea
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        rows={4}
                                        className={`${inputClass} resize-none`}
                                    />
                                </div>

                                {/* Date */}
                                <div>
                                    <label className={labelClass}>
                                        Date Range
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.date}
                                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                        className={inputClass}
                                        placeholder="2025.10 — 2026.03"
                                    />
                                </div>

                                {/* Location */}
                                <div>
                                    <label className={labelClass}>
                                        Location (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.location || ''}
                                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                        className={inputClass}
                                        placeholder="e.g., Hyundai Dept. Trade Center"
                                    />
                                </div>

                                {/* Visibility */}
                                <div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editForm.isRestricted}
                                            onChange={(e) => setEditForm({ ...editForm, isRestricted: e.target.checked })}
                                            className="w-5 h-5 accent-white"
                                        />
                                        <span className="text-sm uppercase tracking-wide">
                                            Make this project restricted (requires access code)
                                        </span>
                                    </label>
                                </div>

                                {/* Actions */}
                                {uploadProgress > 0 && uploadProgress < 100 && (
                                    <div className="w-full h-1 bg-white/15 mt-4">
                                        <div className="h-full bg-white transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                )}
                                <div className="flex gap-3 pt-4 border-t border-white/15">
                                    <button
                                        onClick={handleSave}
                                        disabled={!editForm.title || !editForm.imageUrl || (uploadProgress > 0 && uploadProgress < 100)}
                                        className="flex-1 bg-white text-black px-6 py-3 font-medium uppercase tracking-wide hover:bg-white/85 transition-colors duration-200 ease-[var(--ease-btn)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Save size={18} />
                                        {uploadProgress > 0 && uploadProgress < 100 ? 'Uploading...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={() => { setIsEditing(false); setSelectedAdditionalFiles([]); setUploadProgress(0); }}
                                        className="px-6 py-3 border border-white/28 text-white font-medium uppercase tracking-wide hover:border-white transition-colors duration-200 ease-[var(--ease-btn)]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
