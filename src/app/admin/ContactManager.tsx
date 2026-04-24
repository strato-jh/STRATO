import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Trash2, Eye, X, CheckCircle, Clock } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const fontMono = "'Space Mono', monospace";

interface ContactMessage {
    id: number;
    name: string;
    email: string;
    message: string;
    date: string;
    status: 'new' | 'read' | 'replied';
}

export default function ContactManager() {
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    
    useEffect(() => {
        const q = collection(db, 'contacts');
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id as any,
                ...doc.data()
            })) as ContactMessage[];
            setMessages(data);
        });
        return () => unsubscribe();
    }, []);

    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
    const [filter, setFilter] = useState<'all' | 'new' | 'read' | 'replied'>('all');

    const handleView = async (message: ContactMessage) => {
        setSelectedMessage(message);
        if (message.status === 'new') {
            await updateDoc(doc(db, 'contacts', String(message.id)), {
                status: 'read'
            });
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this message?')) {
            await deleteDoc(doc(db, 'contacts', String(id)));
        }
    };

    const handleMarkAsReplied = async (id: number) => {
        await updateDoc(doc(db, 'contacts', String(id)), {
            status: 'replied'
        });
        setSelectedMessage(null);
    };

    const filteredMessages = messages.filter(m => {
        if (filter === 'all') return true;
        return m.status === filter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'text-green-400';
            case 'read': return 'text-yellow-400';
            case 'replied': return 'text-white/40';
            default: return 'text-white';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'new': return <Mail size={14} />;
            case 'read': return <Eye size={14} />;
            case 'replied': return <CheckCircle size={14} />;
            default: return <Clock size={14} />;
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
                    <Mail size={32} className="text-white" />
                    Contact Messages
                </motion.h1>
                <p className="text-sm text-white/60">&gt; Manage contact form submissions</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 border-2 border-white/20 p-4">
                    <div className="text-2xl font-bold mb-1">{messages.length}</div>
                    <div className="text-xs text-white/60 uppercase">Total Messages</div>
                </div>
                <div className="bg-white/5 border-2 border-green-400/40 p-4">
                    <div className="text-2xl font-bold mb-1 text-green-400">{messages.filter(m => m.status === 'new').length}</div>
                    <div className="text-xs text-white/60 uppercase">New</div>
                </div>
                <div className="bg-white/5 border-2 border-yellow-400/40 p-4">
                    <div className="text-2xl font-bold mb-1 text-yellow-400">{messages.filter(m => m.status === 'read').length}</div>
                    <div className="text-xs text-white/60 uppercase">Read</div>
                </div>
                <div className="bg-white/5 border-2 border-white/20 p-4">
                    <div className="text-2xl font-bold mb-1">{messages.filter(m => m.status === 'replied').length}</div>
                    <div className="text-xs text-white/60 uppercase">Replied</div>
                </div>
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
                    All
                </button>
                <button
                    onClick={() => setFilter('new')}
                    className={`px-4 py-2 text-sm uppercase tracking-wide transition-all ${
                        filter === 'new'
                            ? 'bg-green-400 text-black font-bold'
                            : 'bg-white/5 border-2 border-green-400/40 text-green-400 hover:bg-green-400/10'
                    }`}
                >
                    New
                </button>
                <button
                    onClick={() => setFilter('read')}
                    className={`px-4 py-2 text-sm uppercase tracking-wide transition-all ${
                        filter === 'read'
                            ? 'bg-yellow-400 text-black font-bold'
                            : 'bg-white/5 border-2 border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10'
                    }`}
                >
                    Read
                </button>
                <button
                    onClick={() => setFilter('replied')}
                    className={`px-4 py-2 text-sm uppercase tracking-wide transition-all ${
                        filter === 'replied'
                            ? 'bg-white text-black font-bold'
                            : 'bg-white/5 border-2 border-white/20 text-white hover:bg-white/10'
                    }`}
                >
                    Replied
                </button>
            </div>

            {/* Messages List */}
            <div className="space-y-2">
                {filteredMessages.length === 0 ? (
                    <div className="bg-white/5 border-2 border-white/20 p-8 text-center text-white/40">
                        <Mail size={48} className="mx-auto mb-4 opacity-40" />
                        <p>No messages found</p>
                    </div>
                ) : (
                    filteredMessages.map((message, index) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`bg-white/5 border-2 ${
                                message.status === 'new' ? 'border-green-400/40' : 'border-white/20'
                            } p-4 hover:border-white/40 transition-all`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`flex items-center gap-1.5 text-xs uppercase tracking-wide font-bold ${getStatusColor(message.status)}`}>
                                            {getStatusIcon(message.status)}
                                            {message.status}
                                        </span>
                                        <span className="text-xs text-white/40">{message.date}</span>
                                    </div>
                                    <h3 className="font-bold mb-1">{message.name}</h3>
                                    <p className="text-sm text-white/60 mb-2">{message.email}</p>
                                    <p className="text-sm text-white/80 line-clamp-2">{message.message}</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => handleView(message)}
                                        className="bg-white text-black px-3 py-2 text-xs font-bold uppercase hover:bg-white/90 transition-colors"
                                    >
                                        <Eye size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(message.id)}
                                        className="bg-red-500/80 text-white px-3 py-2 text-xs hover:bg-red-500 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* View Modal */}
            <AnimatePresence>
                {selectedMessage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedMessage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="bg-black border-2 border-white/40 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="border-b-2 border-white/30 p-4 flex items-center justify-between sticky top-0 bg-black z-10">
                                <h2 className="text-xl font-bold uppercase tracking-wide">Message Details</h2>
                                <button
                                    onClick={() => setSelectedMessage(null)}
                                    className="text-white hover:text-white/70 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Status Badge */}
                                <div className="flex items-center gap-2">
                                    <span className={`flex items-center gap-1.5 text-xs uppercase tracking-wide font-bold px-3 py-1.5 border-2 ${
                                        selectedMessage.status === 'new' ? 'border-green-400/40 text-green-400' :
                                        selectedMessage.status === 'read' ? 'border-yellow-400/40 text-yellow-400' :
                                        'border-white/20 text-white/40'
                                    }`}>
                                        {getStatusIcon(selectedMessage.status)}
                                        {selectedMessage.status}
                                    </span>
                                    <span className="text-xs text-white/40">{selectedMessage.date}</span>
                                </div>

                                {/* From */}
                                <div>
                                    <label className="block text-xs mb-2 uppercase tracking-wide text-white/60">
                                        &gt; From
                                    </label>
                                    <div className="bg-white/5 border-2 border-white/20 p-3">
                                        <p className="font-bold mb-1">{selectedMessage.name}</p>
                                        <p className="text-sm text-white/60">{selectedMessage.email}</p>
                                    </div>
                                </div>

                                {/* Message */}
                                <div>
                                    <label className="block text-xs mb-2 uppercase tracking-wide text-white/60">
                                        &gt; Message
                                    </label>
                                    <div className="bg-white/5 border-2 border-white/20 p-4">
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedMessage.message}</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4 border-t-2 border-white/20">
                                    <a
                                        href={`mailto:${selectedMessage.email}`}
                                        className="flex-1 bg-white text-black px-6 py-3 font-bold uppercase tracking-wide hover:bg-white/90 transition-colors text-center"
                                    >
                                        Reply via Email
                                    </a>
                                    {selectedMessage.status !== 'replied' && (
                                        <button
                                            onClick={() => handleMarkAsReplied(selectedMessage.id)}
                                            className="px-6 py-3 border-2 border-white/40 text-white font-bold uppercase tracking-wide hover:bg-white/10 transition-colors"
                                        >
                                            Mark as Replied
                                        </button>
                                    )}
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
                transition={{ delay: 0.3 }}
                className="mt-8 text-xs text-white/40 border-t-2 border-white/10 pt-4"
            >
                <p>&gt; Data is synced live with Firebase Firestore.</p>
                <p>&gt; Click "Reply via Email" to open your default email client</p>
            </motion.div>
        </div>
    );
}
