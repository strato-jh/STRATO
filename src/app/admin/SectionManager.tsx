import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Edit, Save, X } from 'lucide-react';
import { collection, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const fontMono = "'Space Mono', monospace";

interface Section {
    id: string;
    name: string;
    title: string;
    content: string;
    imageUrl?: string;
}

export default function SectionManager() {
    const defaultSections: Section[] = [
        {
            id: 'about',
            name: 'About Page',
            title: 'Technology\nFocused &\nCreatively Driven',
            content: '우리는 기술과 크리에이티브의 경계를 허뭅니다. 물리법칙에 기반한 인터랙션과 몰입감 넘치는 3D 공간을 통해 사용자에게 잊을 수 없는 디지털 경험을 제공합니다.',
            imageUrl: ''
        },
        {
            id: 'contact',
            name: 'Contact Page',
            title: 'Get In Touch',
            content: 'Connect with us through various channels. We\'re always open to collaboration and new projects.',
            imageUrl: ''
        },
        {
            id: 'hero',
            name: 'Hero Section',
            title: 'STRATO',
            content: 'Immersive 3D gallery experience powered by cutting-edge web technologies.',
            imageUrl: ''
        }
    ];

    const [sections, setSections] = useState<Section[]>(defaultSections);
    const [editingSection, setEditingSection] = useState<Section | null>(null);
    const [editForm, setEditForm] = useState<Section | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'sections'), (snapshot) => {
            if (!snapshot.empty) {
                // Merge database data with defaults to ensure all required fields exist
                const dbSections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Section));
                setSections(defaultSections.map(def => {
                    const found = dbSections.find(s => s.id === def.id);
                    return found || def;
                }));
            }
        });
        return () => unsubscribe();
    }, []);

    const handleEdit = (section: Section) => {
        setEditingSection(section);
        setEditForm({ ...section });
    };

    const handleSave = async () => {
        if (editForm) {
            setIsSaving(true);
            try {
                const dataToSave = {
                    name: editForm.name,
                    title: editForm.title,
                    content: editForm.content,
                    imageUrl: editForm.imageUrl || ''
                };
                await setDoc(doc(db, 'sections', editForm.id), dataToSave, { merge: true });
                setEditingSection(null);
                setEditForm(null);
            } catch (error) {
                console.error("Error saving section:", error);
                alert("저장에 실패했습니다.");
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleCancel = () => {
        setEditingSection(null);
        setEditForm(null);
    };

    return (
        <div style={{ fontFamily: fontMono }}>
            {/* Header */}
            <div className="mb-8">
                <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-3xl font-bold mb-2 uppercase tracking-wider flex items-center gap-3"
                >
                    <FileText size={32} className="text-white" />
                    Section Manager
                </motion.h1>
                <p className="text-sm text-white/60">&gt; Edit page sections and content</p>
            </div>

            {/* Sections List */}
            <div className="space-y-4">
                {sections.map((section, index) => (
                    <motion.div
                        key={section.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/5 border-2 border-white/20 hover:border-white/40 transition-all"
                    >
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-bold mb-1 uppercase tracking-wide text-white">
                                        {section.name}
                                    </h3>
                                    <p className="text-xs text-white/60">&gt; Section ID: {section.id}</p>
                                </div>
                                <button
                                    onClick={() => handleEdit(section)}
                                    className="bg-white text-black px-4 py-2 text-sm font-bold uppercase hover:bg-white/90 transition-colors flex items-center gap-2"
                                >
                                    <Edit size={14} />
                                    Edit
                                </button>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="border-l-2 border-white/30 pl-4">
                                    <p className="text-xs text-white/60 mb-1 uppercase">&gt; Title</p>
                                    <p className="whitespace-pre-wrap">{section.title}</p>
                                </div>
                                <div className="border-l-2 border-white/30 pl-4">
                                    <p className="text-xs text-white/60 mb-1 uppercase">&gt; Content</p>
                                    <p className="text-white/80">{section.content}</p>
                                </div>
                                {section.imageUrl && (
                                    <div className="border-l-2 border-white/30 pl-4">
                                        <p className="text-xs text-white/60 mb-1 uppercase">&gt; Image</p>
                                        <p className="text-white/80 truncate">{section.imageUrl}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingSection && editForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={handleCancel}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-black border-2 border-white/40 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="border-b-2 border-white/30 p-4 flex items-center justify-between sticky top-0 bg-black z-10">
                                <h2 className="text-xl font-bold uppercase tracking-wide">
                                    Editing: {editForm.name}
                                </h2>
                                <button
                                    onClick={handleCancel}
                                    className="text-white hover:text-white/70 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="p-6 space-y-6">
                                {/* Section Name */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Section Name
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all"
                                    />
                                    <p className="text-xs text-white/50 mt-1">This is the display name for this section</p>
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Title
                                    </label>
                                    <textarea
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        rows={3}
                                        className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all resize-none font-bold"
                                        placeholder="Section title..."
                                    />
                                    <p className="text-xs text-white/50 mt-1">Main heading text displayed on the page</p>
                                </div>

                                {/* Content */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Content
                                    </label>
                                    <textarea
                                        value={editForm.content}
                                        onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                                        rows={6}
                                        className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all resize-none"
                                        placeholder="Section content..."
                                    />
                                    <p className="text-xs text-white/50 mt-1">Body text or description for this section</p>
                                </div>

                                {/* Image URL (Optional) */}
                                <div>
                                    <label className="block text-sm mb-2 uppercase tracking-wide text-white/70">
                                        &gt; Image URL (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.imageUrl || ''}
                                        onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                                        className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all"
                                        placeholder="https://..."
                                    />
                                    <p className="text-xs text-white/50 mt-1">Background or featured image for this section</p>
                                </div>

                                {/* Preview */}
                                <div className="border-2 border-white/30 p-4">
                                    <p className="text-xs mb-3 uppercase tracking-wide text-white/70">&gt; Preview</p>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-white/50 mb-1">TITLE:</p>
                                            <p className="text-lg font-bold whitespace-pre-wrap text-white">
                                                {editForm.title || '(No title)'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-white/50 mb-1">CONTENT:</p>
                                            <p className="text-sm text-white/80">
                                                {editForm.content || '(No content)'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4 border-t-2 border-white/20">
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex-1 bg-white text-black px-6 py-3 font-bold uppercase tracking-wide hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Save size={18} />
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={handleCancel}
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

            {/* Info */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-xs text-[#00ff88] border-t-2 border-white/10 pt-4 font-bold"
            >
                <p>&gt; Data is live synchronized with Firestore database.</p>
            </motion.div>
        </div>
    );
}
