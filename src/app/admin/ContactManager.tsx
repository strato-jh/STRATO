import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Trash2, Eye, X, CheckCircle, Clock } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { SANS, SERIF } from '../theme';

const headingStyle = { fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em' } as const;

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

    /* State is typographic, not chromatic: unread reads heaviest, replied lightest. */
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'text-white font-semibold';
            case 'read': return 'text-white/70';
            case 'replied': return 'text-white/35';
            default: return 'text-white/70';
        }
    };

    /* Only unread carries a marker — a 4px white square. */
    const chipClass = (active: boolean) =>
        `px-4 py-2 text-sm uppercase tracking-wide transition-colors duration-200 ease-[var(--ease-btn)] ${
            active
                ? 'bg-white text-black font-medium'
                : 'border border-white/15 text-white/70 hover:border-white hover:text-white'
        }`;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'new': return <Mail size={14} />;
            case 'read': return <Eye size={14} />;
            case 'replied': return <CheckCircle size={14} />;
            default: return <Clock size={14} />;
        }
    };

    return (
        <div style={{ fontFamily: SANS }}>
            {/* Header */}
            <div className="mb-8">
                <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-3xl mb-2 flex items-center gap-3 text-white"
                    style={headingStyle}
                >
                    <Mail size={28} className="text-white" />
                    Contact Messages
                </motion.h1>
                <p className="text-sm text-white/50">사이트 문의 폼으로 접수된 내용입니다</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 border border-white/15 p-4">
                    <div className="text-2xl font-medium mb-1 text-white">{messages.length}</div>
                    <div className="text-xs text-white/50 uppercase tracking-wide">Total Messages</div>
                </div>
                <div className="bg-white/5 border border-white/28 p-4">
                    <div className="text-2xl font-semibold mb-1 text-white flex items-center gap-2">
                        <span className="w-1 h-1 bg-white shrink-0" />
                        {messages.filter(m => m.status === 'new').length}
                    </div>
                    <div className="text-xs text-white/50 uppercase tracking-wide">New</div>
                </div>
                <div className="bg-white/5 border border-white/15 p-4">
                    <div className="text-2xl font-medium mb-1 text-white/70">{messages.filter(m => m.status === 'read').length}</div>
                    <div className="text-xs text-white/50 uppercase tracking-wide">Read</div>
                </div>
                <div className="bg-white/5 border border-white/15 p-4">
                    <div className="text-2xl font-medium mb-1 text-white/35">{messages.filter(m => m.status === 'replied').length}</div>
                    <div className="text-xs text-white/50 uppercase tracking-wide">Replied</div>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-2 flex-wrap">
                <button onClick={() => setFilter('all')} className={chipClass(filter === 'all')}>
                    All
                </button>
                <button onClick={() => setFilter('new')} className={chipClass(filter === 'new')}>
                    New
                </button>
                <button onClick={() => setFilter('read')} className={chipClass(filter === 'read')}>
                    Read
                </button>
                <button onClick={() => setFilter('replied')} className={chipClass(filter === 'replied')}>
                    Replied
                </button>
            </div>

            {/* Messages List */}
            <div className="space-y-2">
                {filteredMessages.length === 0 ? (
                    <div className="bg-white/5 border border-white/15 p-8 text-center text-white/35">
                        <Mail size={40} className="mx-auto mb-4 opacity-40" />
                        <p>No messages found</p>
                    </div>
                ) : (
                    filteredMessages.map((message, index) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`bg-white/5 border ${
                                message.status === 'new' ? 'border-white/28' : 'border-white/15'
                            } p-4 hover:border-white transition-colors duration-200 ease-[var(--ease-btn)]`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`flex items-center gap-1.5 text-xs uppercase tracking-wide ${getStatusColor(message.status)}`}>
                                            {message.status === 'new' && <span className="w-1 h-1 bg-white shrink-0" />}
                                            {getStatusIcon(message.status)}
                                            {message.status}
                                        </span>
                                        <span className="text-xs text-white/35">{message.date}</span>
                                    </div>
                                    <h3 className={`mb-1 ${message.status === 'new' ? 'text-white font-semibold' : message.status === 'read' ? 'text-white/70' : 'text-white/35'}`}>
                                        {message.name}
                                    </h3>
                                    <p className="text-sm text-white/50 mb-2">{message.email}</p>
                                    <p className="text-sm text-white/70 line-clamp-2">{message.message}</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => handleView(message)}
                                        className="bg-white text-black px-3 py-2 text-xs font-medium uppercase hover:bg-white/85 transition-colors duration-200 ease-[var(--ease-btn)]"
                                    >
                                        <Eye size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(message.id)}
                                        className="bg-red-500/80 text-white px-3 py-2 text-xs hover:bg-red-500 transition-colors duration-200 ease-[var(--ease-btn)]"
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
                            className="bg-black border border-white/28 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="border-b border-white/15 p-4 flex items-center justify-between sticky top-0 bg-black z-10">
                                <h2 className="text-xl text-white" style={headingStyle}>Message Details</h2>
                                <button
                                    onClick={() => setSelectedMessage(null)}
                                    className="text-white/70 hover:text-white transition-colors duration-200 ease-[var(--ease-btn)]"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Status Badge */}
                                <div className="flex items-center gap-2">
                                    <span className={`flex items-center gap-1.5 text-xs uppercase tracking-wide px-3 py-1.5 border ${
                                        selectedMessage.status === 'new' ? 'border-white/28' : 'border-white/15'
                                    } ${getStatusColor(selectedMessage.status)}`}>
                                        {selectedMessage.status === 'new' && <span className="w-1 h-1 bg-white shrink-0" />}
                                        {getStatusIcon(selectedMessage.status)}
                                        {selectedMessage.status}
                                    </span>
                                    <span className="text-xs text-white/35">{selectedMessage.date}</span>
                                </div>

                                {/* From */}
                                <div>
                                    <label className="block text-xs mb-2 uppercase tracking-wide text-white/50">
                                        From
                                    </label>
                                    <div className="bg-white/5 border border-white/15 p-3">
                                        <p className="font-medium mb-1 text-white">{selectedMessage.name}</p>
                                        <p className="text-sm text-white/50">{selectedMessage.email}</p>
                                    </div>
                                </div>

                                {/* Message */}
                                <div>
                                    <label className="block text-xs mb-2 uppercase tracking-wide text-white/50">
                                        Message
                                    </label>
                                    <div className="bg-white/5 border border-white/15 p-4">
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/70">{selectedMessage.message}</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4 border-t border-white/15">
                                    <a
                                        href={`mailto:${selectedMessage.email}`}
                                        className="flex-1 bg-white text-black px-6 py-3 font-medium uppercase tracking-wide hover:bg-white/85 transition-colors duration-200 ease-[var(--ease-btn)] text-center"
                                    >
                                        메일로 답장
                                    </a>
                                    {selectedMessage.status !== 'replied' && (
                                        <button
                                            onClick={() => handleMarkAsReplied(selectedMessage.id)}
                                            className="px-6 py-3 border border-white/28 text-white font-medium uppercase tracking-wide hover:border-white transition-colors duration-200 ease-[var(--ease-btn)]"
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
                className="mt-8 text-xs text-white/35 border-t border-white/15 pt-4 space-y-0.5"
            >
                <p>새 문의가 접수되면 목록에 실시간으로 반영됩니다.</p>
                <p>'메일로 답장'을 누르면 기본 메일 프로그램이 열립니다.</p>
            </motion.div>
        </div>
    );
}
