import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Folder, FileText, Key, LogOut, Menu, X, Terminal, Home, Mail, Link2 } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../firebaseAuth';
import { SANS } from '../theme';

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [time, setTime] = useState('');
    /** null = still resolving the Firebase session. */
    const [signedIn, setSignedIn] = useState<boolean | null>(null);

    /* The gate has to be the real Firebase session, not a local flag: Firestore
     * authorises on `request.auth`, so anything else lets the UI look signed in
     * while every write is rejected. */
    useEffect(() => {
        return onAuthStateChanged(auth, (user) => {
            setSignedIn(!!user);
            if (!user) navigate('/admin', { replace: true });
        });
    }, [navigate]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-US', { hour12: false }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } finally {
            navigate('/admin', { replace: true });
        }
    };

    /* Don't flash the admin shell before we know who this is. */
    if (signedIn !== true) {
        return (
            <div
                style={{
                    minHeight: '100vh', background: '#000', color: 'rgba(255,255,255,0.5)',
                    fontFamily: SANS, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                {signedIn === null ? '확인 중…' : '로그인이 필요합니다.'}
            </div>
        );
    }

    const navItems = [
        { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/projects', icon: Folder, label: 'Projects' },
        { path: '/admin/sections', icon: FileText, label: 'Sections' },
        { path: '/admin/contacts', icon: Mail, label: 'Contacts' },
        { path: '/admin/social-links', icon: Link2, label: 'Social Links' },
        { path: '/admin/password-gen', icon: Key, label: 'Password Gen' },
    ];

    return (
        <div className="min-h-screen bg-black text-white" style={{ fontFamily: SANS }}>
            {/* Top Bar */}
            <div className="fixed top-0 left-0 right-0 h-14 bg-black border-b border-white/15 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden text-white hover:bg-white/10 p-2 transition-colors duration-200 ease-[var(--ease-btn)]"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div className="flex items-center gap-3">
                        <Terminal size={18} />
                        <span className="text-sm uppercase">
                            <span className="font-extrabold tracking-[-0.01em]">STRATO</span>
                            <span className="font-normal text-white/60 tracking-wide"> Admin</span>
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <span className="hidden md:block text-white/50">{time}</span>
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 ease-[var(--ease-btn)]"
                    >
                        <Home size={16} />
                        <span className="hidden sm:inline">Home</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 ease-[var(--ease-btn)]"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>

            {/* Sidebar */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        initial={{ x: -280 }}
                        animate={{ x: 0 }}
                        exit={{ x: -280 }}
                        transition={{ type: 'tween', duration: 0.3 }}
                        className="fixed left-0 top-14 bottom-0 w-72 bg-black border-r border-white/15 z-40 overflow-y-auto"
                    >
                        <nav className="p-4 space-y-1">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 text-sm uppercase tracking-wider transition-all duration-200 ease-[var(--ease-btn)] ${
                                            isActive
                                                ? 'bg-white text-black font-medium'
                                                : 'text-white/70 hover:text-white hover:bg-white/5'
                                        }`
                                    }
                                >
                                    <item.icon size={18} />
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </nav>

                        {/* Sidebar Footer */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/15 text-xs text-white/35 space-y-0.5">
                            <p>System Status: Online</p>
                            <p>Version: 2.1.4</p>
                            <p>Location: Seoul, KR</p>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main
                className={`pt-14 min-h-screen transition-all duration-300 ${
                    sidebarOpen ? 'lg:pl-72' : 'pl-0'
                }`}
            >
                <div className="p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
