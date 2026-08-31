import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Folder, FileText, Key, Activity, Eye, Lock } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { SANS, SERIF } from '../theme';

const headingStyle = { fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em' } as const;

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalProjects: 0,
        visibleProjects: 0,
        restrictedProjects: 0,
        sections: 0,
        lastUpdate: new Date().toLocaleDateString()
    });

    useEffect(() => {
        const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
            const currentProjects = snap.docs.map(doc => doc.data());
            const total = currentProjects.length;
            const restricted = currentProjects.filter(p => p.isRestricted).length;
            const visible = total - restricted;
            
            setStats(prev => ({
                ...prev,
                totalProjects: total,
                visibleProjects: visible,
                restrictedProjects: restricted,
                lastUpdate: new Date().toLocaleDateString()
            }));
        });

        const unsubSections = onSnapshot(collection(db, 'sections'), (snap) => {
            setStats(prev => ({
                ...prev,
                sections: snap.size,
                lastUpdate: new Date().toLocaleDateString()
            }));
        });

        return () => {
            unsubProjects();
            unsubSections();
        };
    }, []);

    const quickActions = [
        { icon: Folder, label: 'Manage Projects', path: '/admin/projects', color: 'white' },
        { icon: FileText, label: 'Edit Sections', path: '/admin/sections', color: 'white' },
        { icon: Key, label: 'Generate Password', path: '/admin/password-gen', color: 'white' },
    ];

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
                    <Activity size={28} className="text-white" />
                    Dashboard
                </motion.h1>
                <p className="text-sm text-white/50">현재 등록 현황과 바로가기</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/5 border border-white/15 p-6 hover:border-white/28 transition-colors duration-200 ease-[var(--ease-btn)]"
                >
                    <div className="flex items-center justify-between mb-3">
                        <Folder size={24} className="text-white" />
                        <span className="text-xs text-white/50 tracking-wider">TOTAL</span>
                    </div>
                    <div className="text-4xl font-medium mb-1 text-white">{stats.totalProjects}</div>
                    <div className="text-sm text-white/50 uppercase tracking-wide">Projects</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/5 border border-white/15 p-6 hover:border-white/28 transition-colors duration-200 ease-[var(--ease-btn)]"
                >
                    <div className="flex items-center justify-between mb-3">
                        <Eye size={24} className="text-white" />
                        <span className="text-xs text-white/50 tracking-wider">PUBLIC</span>
                    </div>
                    <div className="text-4xl font-medium mb-1 text-white">{stats.visibleProjects}</div>
                    <div className="text-sm text-white/50 uppercase tracking-wide">Visible</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/5 border border-white/15 p-6 hover:border-white/28 transition-colors duration-200 ease-[var(--ease-btn)]"
                >
                    <div className="flex items-center justify-between mb-3">
                        <Lock size={24} className="text-white" />
                        <span className="text-xs text-white/50 tracking-wider">PRIVATE</span>
                    </div>
                    <div className="text-4xl font-medium mb-1 text-white">{stats.restrictedProjects}</div>
                    <div className="text-sm text-white/50 uppercase tracking-wide">Restricted</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/5 border border-white/15 p-6 hover:border-white/28 transition-colors duration-200 ease-[var(--ease-btn)]"
                >
                    <div className="flex items-center justify-between mb-3">
                        <FileText size={24} className="text-white" />
                        <span className="text-xs text-white/50 tracking-wider">PAGES</span>
                    </div>
                    <div className="text-4xl font-medium mb-1 text-white">{stats.sections}</div>
                    <div className="text-sm text-white/50 uppercase tracking-wide">Sections</div>
                </motion.div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
                <h2 className="text-xl mb-4 text-white" style={headingStyle}>Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {quickActions.map((action, index) => (
                        <motion.div
                            key={action.path}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + index * 0.1 }}
                        >
                            <Link
                                to={action.path}
                                className="block bg-white/5 border border-white/15 p-6 hover:bg-white/10 hover:border-white/28 transition-colors duration-200 ease-[var(--ease-btn)] group"
                            >
                                <div className="flex items-center gap-4">
                                    <action.icon size={28} className="text-white" />
                                    <span className="text-lg font-medium text-white">
                                        {action.label}
                                    </span>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Activity Log */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="bg-white/5 border border-white/15 p-6"
            >
                <h2 className="text-xl mb-4 flex items-center gap-2 text-white" style={headingStyle}>
                    <Activity size={20} />
                    Recent Activity
                </h2>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center border-b border-white/15 pb-2">
                        <span className="text-white/70">System initialized</span>
                        <span className="text-white/35">Just now</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/15 pb-2">
                        <span className="text-white/70">Admin session started</span>
                        <span className="text-white/35">Just now</span>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                        <span className="text-white/50">Ready to manage content...</span>
                        <span className="text-white/35">Awaiting action</span>
                    </div>
                </div>
            </motion.div>

            {/* System Info */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-6 text-xs text-white/35 border-t border-white/15 pt-4 space-y-0.5"
            >
                <p>Last Update: {stats.lastUpdate}</p>
                <p>Database: Firebase Live</p>
                <p>Status: Ready</p>
            </motion.div>
        </div>
    );
}
