import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link2, Instagram, Save, ExternalLink } from 'lucide-react';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

const fontMono = "'Space Mono', monospace";

interface SocialLink {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
}
export default function SocialLinksManager() {
    const defaultLinks: SocialLink[] = [
        { id: 'instagram', name: 'Instagram', url: 'https://instagram.com/strato', enabled: true },
        { id: 'twitter', name: 'Twitter / X', url: 'https://twitter.com/strato', enabled: false },
        { id: 'linkedin', name: 'LinkedIn', url: 'https://linkedin.com/company/strato', enabled: false },
        { id: 'behance', name: 'Behance', url: 'https://behance.net/strato', enabled: false },
        { id: 'dribbble', name: 'Dribbble', url: 'https://dribbble.com/strato', enabled: false }
    ];

    const [links, setLinks] = useState<SocialLink[]>(defaultLinks);
    const [contactEmail, setContactEmail] = useState('contact@strato.com');
    const [saved, setSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsubLinks = onSnapshot(collection(db, 'social_links'), (snapshot) => {
            if (!snapshot.empty) {
                const dbLinks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialLink));
                setLinks(defaultLinks.map(def => dbLinks.find(l => l.id === def.id) || def));
            }
        });
        const unsubEmail = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
            if (docSnap.exists() && docSnap.data().contactEmail) {
                setContactEmail(docSnap.data().contactEmail);
            }
        });
        return () => { unsubLinks(); unsubEmail(); };
    }, []);

    const handleUpdate = (id: string, field: 'url' | 'enabled', value: string | boolean) => {
        setLinks(links.map(link =>
            link.id === id ? { ...link, [field]: value } : link
        ));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await Promise.all(links.map(link => setDoc(doc(db, 'social_links', link.id), link, { merge: true })));
            await setDoc(doc(db, 'settings', 'general'), { contactEmail }, { merge: true });
            
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error("Error saving social links:", error);
            alert("저장에 실패했습니다.");
        } finally {
            setIsSaving(false);
        }
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
                    <Link2 size={32} className="text-white" />
                    Social Links
                </motion.h1>
                <p className="text-sm text-white/60">&gt; Manage social media and external links</p>
            </div>

            {/* Instagram Highlight */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 border-2 border-pink-400/40 p-6"
            >
                <div className="flex items-center gap-3 mb-4">
                    <Instagram size={32} className="text-pink-400" />
                    <h2 className="text-2xl font-bold uppercase tracking-wide">Instagram</h2>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs mb-2 uppercase tracking-wide text-white/70">
                            &gt; Instagram URL
                        </label>
                        <input
                            type="url"
                            value={links.find(l => l.id === 'instagram')?.url || ''}
                            onChange={(e) => handleUpdate('instagram', 'url', e.target.value)}
                            className="w-full bg-white/5 border-2 border-pink-400/40 px-3 py-2 text-white outline-none focus:border-pink-400/70 transition-all"
                            placeholder="https://instagram.com/yourusername"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={links.find(l => l.id === 'instagram')?.enabled || false}
                                onChange={(e) => handleUpdate('instagram', 'enabled', e.target.checked)}
                                className="w-5 h-5 accent-pink-400"
                            />
                            <span className="text-sm uppercase tracking-wide">
                                Show on Contact Page
                            </span>
                        </label>
                        {links.find(l => l.id === 'instagram')?.url && (
                            <a
                                href={links.find(l => l.id === 'instagram')?.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1"
                            >
                                Preview
                                <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Other Social Links */}
            <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 uppercase tracking-wider">&gt; Other Social Links</h2>
                <div className="space-y-4">
                    {links.filter(link => link.id !== 'instagram').map((link, index) => (
                        <motion.div
                            key={link.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + index * 0.1 }}
                            className="bg-white/5 border-2 border-white/20 p-4"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold uppercase tracking-wide">{link.name}</h3>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs text-white/60 uppercase">Enabled</span>
                                    <input
                                        type="checkbox"
                                        checked={link.enabled}
                                        onChange={(e) => handleUpdate(link.id, 'enabled', e.target.checked)}
                                        className="w-5 h-5 accent-white"
                                    />
                                </label>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    value={link.url}
                                    onChange={(e) => handleUpdate(link.id, 'url', e.target.value)}
                                    className="flex-1 bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all text-sm"
                                    placeholder={`https://${link.id}.com/yourusername`}
                                />
                                {link.url && (
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-white/10 text-white px-3 py-2 text-xs hover:bg-white/20 transition-colors border-2 border-white/20 flex items-center gap-1"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Email Configuration */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-8 bg-white/5 border-2 border-white/20 p-6"
            >
                <h2 className="text-xl font-bold mb-4 uppercase tracking-wider">&gt; Email Configuration</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs mb-2 uppercase tracking-wide text-white/70">
                            &gt; Contact Email
                        </label>
                        <input
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className="w-full bg-white/5 border-2 border-white/20 px-3 py-2 text-white outline-none focus:border-white/50 transition-all"
                            placeholder="contact@yourdomain.com"
                        />
                        <p className="text-xs text-white/50 mt-1">Email address where contact form submissions will be sent</p>
                    </div>
                </div>
            </motion.div>

            {/* Save Button */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex justify-end"
            >
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`px-8 py-3 font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                        saved
                            ? 'bg-green-400 text-black'
                            : 'bg-white text-black hover:bg-white/90'
                    } disabled:opacity-50`}
                >
                    <Save size={18} />
                    {isSaving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                </button>
            </motion.div>

            {/* Preview Section */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 bg-white/5 border-2 border-white/20 p-6"
            >
                <h2 className="text-xl font-bold mb-4 uppercase tracking-wider">&gt; Preview</h2>
                <p className="text-sm text-white/60 mb-4">Enabled links will appear on the Contact page:</p>
                <div className="flex flex-wrap gap-3">
                    {links.filter(link => link.enabled && link.url).map(link => (
                        <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white text-black px-4 py-2 text-sm font-bold uppercase hover:bg-white/90 transition-colors flex items-center gap-2"
                        >
                            {link.id === 'instagram' && <Instagram size={16} />}
                            {link.name}
                            <ExternalLink size={12} />
                        </a>
                    ))}
                </div>
                {links.filter(link => link.enabled && link.url).length === 0 && (
                    <p className="text-white/40 text-sm">No enabled links yet</p>
                )}
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-8 text-xs text-[#00ff88] border-t-2 border-white/10 pt-4 font-bold"
            >
                <p>&gt; Data is live synchronized with Firestore database.</p>
            </motion.div>
        </div>
    );
}
