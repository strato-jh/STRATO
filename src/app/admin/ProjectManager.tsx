import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Folder, Plus, Edit, Trash2, Eye, EyeOff, Image, Save, X, Upload, Film } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';

const fontMono = "'Space Mono', monospace";

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
    mediaType: 'image' | 'video';
    isRestricted: boolean;
    category: string;
    date: string;
    location?: string;
    additionalMedia?: MediaItem[];
    createdAt?: number;
}

export default function ProjectManager() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
    const [selectedAdditionalFiles, setSelectedAdditionalFiles] = useState<File[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const projectsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Project[];
            setProjects(projectsData);
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
                    mediaType: isImage ? 'image' : 'video'
                });
            } else {
                setNewProject({
                    ...newProject,
                    imageUrl: result,
                    mediaType: isImage ? 'image' : 'video'
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
                await updateDoc(projectRef, {
                    title: editForm.title,
                    description: editForm.description,
                    imageUrl: finalImageUrl,
                    thumbnailUrl: editForm.mediaType === 'video' ? finalThumbnailUrl : '',
                    mediaType: editForm.mediaType,
                    isRestricted: editForm.isRestricted,
                    category: editForm.category,
                    date: editForm.date,
                    location: editForm.location || '',
                    additionalMedia: finalAdditionalMedia
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

            await addDoc(collection(db, 'projects'), {
                title: newProject.title,
                description: newProject.description,
                imageUrl: finalImageUrl,
                thumbnailUrl: newProject.mediaType === 'video' ? finalThumbnailUrl : '',
                mediaType: newProject.mediaType,
                isRestricted: newProject.isRestricted,
                category: newProject.category,
                date: newProject.date,
                location: newProject.location || '',
                additionalMedia: newAdditionalMedias,
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

    return (
        <div style={{ fontFamily: fontMono }}>
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-3xl font-bold mb-2 uppercase tracking-wider flex items-center gap-3"
                    >
                        <Folder size={32} className="text-white" />
                        Project Manager
                    </motion.h1>
                    <p className="text-sm text-white/60">&gt; Manage gallery projects, images, and content</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-white text-black px-6 py-3 font-bold uppercase tracking-wide hover:bg-white/90 transition-all flex items-center gap-2"
                >
                    <Plus size={18} />
                    Add New
                </button>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-2 flex-wrap">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 text-sm uppercase tracking-wide transition-all ${
                        filter === 'all'
                            ? 'bg-white text-black font-bold'
                            : 'bg-white/5 border-2 border-white/20 text-white hover:bg-white/10'
                    }`}
                >
                    All ({projects.length})
                </button>
                <button
                    onClick={() => setFilter('visible')}
                    className={`px-4 py-2 text-sm uppercase tracking-wide transition-all ${
                        filter === 'visible'
                            ? 'bg-white text-black font-bold'
                            : 'bg-white/5 border-2 border-white/20 text-white hover:bg-white/10'
                    }`}
                >
                    Visible ({projects.filter(p => !p.isRestricted).length})
                </button>
                <button
                    onClick={() => setFilter('restricted')}
                    className={`px-4 py-2 text-sm uppercase tracking-wide transition-all ${
                        filter === 'restricted'
                            ? 'bg-white text-black font-bold'
                            : 'bg-white/5 border-2 border-white/20 text-white hover:bg-white/10'
                    }`}
                >
                    Restricted ({projects.filter(p => p.isRestricted).length})
                </button>
            </div>

            {/* Project Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProjects.map((project, index) => (
                    <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="bg-white/5 border-2 border-white/20 overflow-hidden hover:border-white/40 transition-all group"
                    >
                        {/* Media */}
                        <div className="relative aspect-[4/5] bg-black overflow-hidden">
                            {project.mediaType === 'video' ? (
                                <video
                                    src={project.imageUrl}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-300"
                                    muted
                                    loop
                                    playsInline
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
                                    <span className="bg-white/90 text-black px-2 py-1 text-[10px] font-bold uppercase flex items-center gap-1">
                                        <Film size={10} />
                                        Video
                                    </span>
                                )}
                                {project.isRestricted && (
                                    <span className="bg-white/90 text-black px-2 py-1 text-[10px] font-bold uppercase">
                                        Restricted
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-3">
                            <h3 className="font-bold text-sm mb-1 truncate">{project.title}</h3>
                            <p className="text-xs text-white/60 mb-3 truncate">{project.category}</p>

                            {/* Actions */}
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleEdit(project)}
                                    className="flex-1 bg-white text-black px-2 py-1.5 text-xs font-bold uppercase hover:bg-white/90 transition-colors flex items-center justify-center gap-1"
                                >
                                    <Edit size={12} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleToggleVisibility(project)}
                                    className="bg-white/20 text-white px-2 py-1.5 text-xs hover:bg-white/30 transition-colors border border-white/40"
                                    title={project.isRestricted ? 'Make Visible' : 'Make Restricted'}
                                >
                                    {project.isRestricted ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                                <button
                                    onClick={() => handleDelete(project.id)}
                                    className="bg-red-500/80 text-white px-2 py-1.5 text-xs hover:bg-red-500 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

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
                            onClick={(e) => e.stopPropagation()}
                            className="bg-black border-2 border-white/40 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="border-b-2 border-white/30 p-4 flex items-center justify-between sticky top-0 bg-black z-10">
                                <h2 className="text-xl font-bold uppercase tracking-wide">Add New Project</h2>
                                <button
                                    onClick={() => { setShowAddModal(false); setSelectedAdditionalFiles([]); setUploadProgress(0); }}
                                    className="text-white hover:text-white/70 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="p-6 space-y-6">
                                {/* File Upload */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Upload Image or Video
                                    </label>
                                    <div className="border-2 border-dashed border-white/30 p-6 text-center hover:border-white/50 transition-colors">
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
                                            <Upload size={32} className="text-white/60" />
                                            <span className="text-sm text-white/60">
                                                Click to upload or drag and drop
                                            </span>
                                            <span className="text-xs text-white/40">
                                                Images: JPG, PNG, GIF / Videos: MP4, WebM, MOV
                                            </span>
                                        </label>
                                    </div>
                                    {newProject.imageUrl && (
                                        <div className="mt-4 border-2 border-white/20 p-2">
                                            <p className="text-xs text-white/60 mb-2 uppercase">Preview:</p>
                                            {newProject.mediaType === 'video' ? (
                                                <video
                                                    src={newProject.imageUrl}
                                                    className="w-full max-h-64 object-contain"
                                                    controls
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
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Upload Thumbnail Image (Required for video)
                                    </label>
                                    <div className="border-2 border-dashed border-white/30 p-4 text-center hover:border-white/50 transition-colors bg-white/5">
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
                                            <Upload size={24} className="text-[#ff3366]/80" />
                                            <span className="text-xs text-white/80">
                                                Click to upload thumbnail (JPG, PNG)
                                            </span>
                                        </label>
                                    </div>
                                    {newProject.thumbnailUrl && (
                                        <div className="mt-2 text-xs text-[#00ff88]">Thumbnail selected.</div>
                                    )}
                                </div>
                                )}

                                {/* Additional Media Upload */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Additional Sub Media (Optional)
                                    </label>
                                    <div className="border-2 border-dashed border-white/30 p-4 text-center hover:border-white/50 transition-colors">
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
                                            <Plus size={24} className="text-white/80" />
                                            <span className="text-xs text-white/80 uppercase">
                                                Add multiple sub images or videos
                                            </span>
                                        </label>
                                    </div>
                                    {selectedAdditionalFiles.length > 0 && (
                                        <div className="mt-3 flex flex-col gap-2">
                                            {selectedAdditionalFiles.map((file, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white/10 border border-white/20">
                                                    <span className="truncate w-[80%]">{file.name}</span>
                                                    <button onClick={() => removeAdditionalFile(idx)} className="text-red-400 hover:text-red-300">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Title
                                    </label>
                                    <input
                                        type="text"
                                        value={newProject.title}
                                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                                        className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all"
                                        placeholder="Project Title"
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Category
                                    </label>
                                    <select
                                        value={newProject.category}
                                        onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                                        className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all appearance-none uppercase"
                                    >
                                        <option value="FASHION" className="text-black">FASHION</option>
                                        <option value="BEAUTY" className="text-black">BEAUTY</option>
                                        <option value="OTHER" className="text-black">OTHER</option>
                                    </select>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Description
                                    </label>
                                    <textarea
                                        value={newProject.description}
                                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                        rows={4}
                                        className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all resize-none"
                                        placeholder="Project description..."
                                    />
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Date Range
                                    </label>
                                    <input
                                        type="text"
                                        value={newProject.date}
                                        onChange={(e) => setNewProject({ ...newProject, date: e.target.value })}
                                        className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all"
                                        placeholder="2025.10 — 2026.03"
                                    />
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Location (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={newProject.location || ''}
                                        onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                                        className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all"
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
                                    <div className="w-full h-1 bg-white/20 mt-4 rounded">
                                        <div className="h-full bg-white transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                )}
                                <div className="flex gap-3 pt-4 border-t-2 border-white/20">
                                    <button
                                        onClick={handleAddNew}
                                        disabled={!newProject.title || !newProject.imageUrl || (uploadProgress > 0 && uploadProgress < 100)}
                                        className="flex-1 bg-white text-black px-6 py-3 font-bold uppercase tracking-wide hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Plus size={18} />
                                        {uploadProgress > 0 && uploadProgress < 100 ? 'Uploading...' : 'Add Project'}
                                    </button>
                                    <button
                                        onClick={() => setShowAddModal(false)}
                                        className="px-6 py-3 border-2 border-white/40 text-white font-bold uppercase tracking-wide hover:bg-white/10 transition-colors"
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
                            onClick={(e) => e.stopPropagation()}
                            className="bg-black border-2 border-white/40 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="border-b-2 border-white/30 p-4 flex items-center justify-between sticky top-0 bg-black z-10">
                                <h2 className="text-xl font-bold uppercase tracking-wide">Edit Project</h2>
                                <button
                                    onClick={() => { setIsEditing(false); setSelectedAdditionalFiles([]); setUploadProgress(0); }}
                                    className="text-white hover:text-white/70 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="p-6 space-y-6">
                                {/* Current Media Preview */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Current Media
                                    </label>
                                    <div className="aspect-[4/5] max-w-xs bg-black border-2 border-white/20">
                                        {editForm.mediaType === 'video' ? (
                                            <video src={editForm.imageUrl} className="w-full h-full object-cover" controls />
                                        ) : (
                                            <img src={editForm.imageUrl} alt="" className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                </div>

                                {/* File Upload */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Replace Media (Optional)
                                    </label>
                                    <div className="border-2 border-dashed border-white/30 p-4 text-center hover:border-white/50 transition-colors">
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
                                            <Upload size={24} className="text-white/60" />
                                            <span className="text-xs text-white/60">
                                                Click to upload new media
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Thumbnail Replace (Only for Video) */}
                                {editForm.mediaType === 'video' && (
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Update Thumbnail Image
                                    </label>
                                    {editForm.thumbnailUrl && (
                                        <img src={editForm.thumbnailUrl} alt="Thumbnail" className="w-24 h-24 object-cover border border-white/20 mb-2" />
                                    )}
                                    <div className="border-2 border-dashed border-white/30 p-4 text-center hover:border-white/50 transition-colors bg-white/5">
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
                                            <Upload size={24} className="text-[#ff3366]/80" />
                                            <span className="text-xs text-white/80">
                                                Click to replace thumbnail
                                            </span>
                                        </label>
                                    </div>
                                </div>
                                )}

                                {/* Edit Additional Media */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Additional Sub Media
                                    </label>
                                    
                                    {/* Existing Media */}
                                    {editForm.additionalMedia && editForm.additionalMedia.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs text-white/50 uppercase mb-2">Existing Media:</p>
                                            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                                                {editForm.additionalMedia.map((media, idx) => (
                                                    <div key={idx} className="relative w-24 h-24 shrink-0 border border-white/20 bg-black group">
                                                        {media.type === 'video' ? (
                                                            <video src={media.url} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <img src={media.url} alt="" className="w-full h-full object-cover" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button onClick={() => removeExistingAdditionalMedia(idx)} className="text-red-400 hover:text-red-300">
                                                                <Trash2 size={20} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Add New Additional Media */}
                                    <div className="border-2 border-dashed border-white/30 p-4 text-center hover:border-white/50 transition-colors">
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
                                            <Plus size={24} className="text-white/80" />
                                            <span className="text-xs text-white/80 uppercase">
                                                Add multiple sub images or videos
                                            </span>
                                        </label>
                                    </div>
                                    {selectedAdditionalFiles.length > 0 && (
                                        <div className="mt-3 flex flex-col gap-2">
                                            <p className="text-xs text-white/50 uppercase">New Media to Upload:</p>
                                            {selectedAdditionalFiles.map((file, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white/10 border border-white/20">
                                                    <span className="truncate w-[80%]">{file.name}</span>
                                                    <button onClick={() => removeAdditionalFile(idx)} className="text-red-400 hover:text-red-300">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Title
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all"
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Category
                                    </label>
                                    <select
                                        value={editForm.category}
                                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                        className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all appearance-none uppercase"
                                    >
                                        <option value="FASHION" className="text-black">FASHION</option>
                                        <option value="BEAUTY" className="text-black">BEAUTY</option>
                                        <option value="OTHER" className="text-black">OTHER</option>
                                    </select>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Description
                                    </label>
                                    <textarea
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        rows={4}
                                        className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all resize-none"
                                    />
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Date Range
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.date}
                                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                        className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all"
                                        placeholder="2025.10 — 2026.03"
                                    />
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Location (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.location || ''}
                                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                        className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all"
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
                                    <div className="w-full h-1 bg-white/20 mt-4 rounded">
                                        <div className="h-full bg-white transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                )}
                                <div className="flex gap-3 pt-4 border-t-2 border-white/20">
                                    <button
                                        onClick={handleSave}
                                        disabled={!editForm.title || !editForm.imageUrl || (uploadProgress > 0 && uploadProgress < 100)}
                                        className="flex-1 bg-white text-black px-6 py-3 font-bold uppercase tracking-wide hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Save size={18} />
                                        {uploadProgress > 0 && uploadProgress < 100 ? 'Uploading...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={() => { setIsEditing(false); setSelectedAdditionalFiles([]); setUploadProgress(0); }}
                                        className="px-6 py-3 border-2 border-white/40 text-white font-bold uppercase tracking-wide hover:bg-white/10 transition-colors"
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
