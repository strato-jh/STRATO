import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Folder, FileText, Key, LogOut, Menu, X, Terminal, Home, Mail, Link2 } from 'lucide-react';

const fontMono = "'Space Mono', monospace";

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [time, setTime] = useState('');

    useEffect(() => {
        // Check authentication
        const isAuth = sessionStorage.getItem('admin_auth');
        if (!isAuth) {
            navigate('/admin');
        }
    }, [navigate]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-US', { hour12: false }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem('admin_auth');
        navigate('/admin');
    };

    const navItems = [
        { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/projects', icon: Folder, label: 'Projects' },
        { path: '/admin/sections', icon: FileText, label: 'Sections' },
        { path: '/admin/contacts', icon: Mail, label: 'Contacts' },
        { path: '/admin/social-links', icon: Link2, label: 'Social Links' },
        { path: '/admin/password-gen', icon: Key, label: 'Password Gen' },
    ];

    return (
        <div className="min-h-screen bg-black text-white" style={{ fontFamily: fontMono }}>
            {/* Top Bar */}
            <div className="fixed top-0 left-0 right-0 h-14 bg-black border-b-2 border-white/20 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden text-white hover:bg-white/10 p-2 transition-colors"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div className="flex items-center gap-3">
                        <Terminal size={18} />
                        <span className="text-sm font-bold uppercase tracking-widest">STRATO Admin</span>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <span className="hidden md:block text-white/60">{time}</span>
                    <Link
                        to="/"
                        className="flex items-center gap-2 hover:text-white/70 transition-colors"
                    >
                        <Home size={16} />
                        <span className="hidden sm:inline">Home</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 hover:text-white/70 transition-colors"
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
                        className="fixed left-0 top-14 bottom-0 w-72 bg-black border-r-2 border-white/20 z-40 overflow-y-auto"
                    >
                        <nav className="p-4 space-y-2">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 text-sm uppercase tracking-wider transition-all ${
                                            isActive
                                                ? 'bg-white text-black font-bold'
                                                : 'text-white hover:bg-white/10 hover:translate-x-1'
                                        }`
                                    }
                                >
                                    <item.icon size={18} />
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </nav>

                        {/* Sidebar Footer */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t-2 border-white/20 text-xs text-white/40">
                            <p>&gt; System Status: Online</p>
                            <p>&gt; Version: 2.1.4</p>
                            <p>&gt; Location: Seoul, KR</p>
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

            {/* Background grid effect */}
            <div className="fixed inset-0 pointer-events-none opacity-5 z-0">
                <div
                    className="w-full h-full"
                    style={{
                        backgroundImage: `
                            linear-gradient(white 1px, transparent 1px),
                            linear-gradient(90deg, white 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px'
                    }}
                />
            </div>
        </div>
    );
}
