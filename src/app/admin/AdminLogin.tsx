import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebaseAuth';
import { motion } from 'motion/react';
import { Terminal, Lock, Eye, EyeOff, X } from 'lucide-react';
import { SANS, SERIF } from '../theme';

const headingStyle = { fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em' } as const;

export default function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    /* Already signed in (Firebase persists the session across tabs and
     * restarts) — skip the form. */
    useEffect(() => {
        return onAuthStateChanged(auth, (user) => {
            if (user) navigate('/admin/dashboard', { replace: true });
        });
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(false);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/admin/dashboard', { replace: true });
        } catch (err) {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden" style={{ fontFamily: SANS }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Login panel */}
                <div className="bg-black border border-white/28">
                    <div className="border-b border-white/15 px-4 py-3 flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-3">
                            <Terminal size={18} className="text-white" />
                            <span className="text-sm uppercase">
                                <span className="font-extrabold tracking-[-0.01em]">STRATO</span>
                                <span className="font-normal text-white/60 tracking-wide"> Admin Access</span>
                            </span>
                        </div>
                        <button
                            onClick={() => navigate('/')}
                            className="text-white/50 hover:text-white transition-colors duration-200 ease-[var(--ease-btn)] p-1"
                            title="Close and return to site"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-8">
                        <div className="space-y-6">
                            <div>
                                <h1 className="text-2xl mb-2 text-white" style={headingStyle}>Restricted area</h1>
                                <p className="text-sm text-white/50">Authorization required to proceed.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs mb-2 uppercase tracking-wider text-white/50">
                                        Enter Email
                                    </label>
                                    <div className="relative mb-4">
                                        <Terminal size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/15 px-10 py-3 text-white outline-none focus:border-white/50 transition-colors duration-200 ease-[var(--ease-btn)] placeholder:text-white/35"
                                            placeholder="admin@strato.com"
                                            autoFocus
                                        />
                                    </div>
                                    <label className="block text-xs mb-2 uppercase tracking-wider text-white/50">
                                        Enter Password
                                    </label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/15 px-10 py-3 text-white outline-none focus:border-white/50 transition-colors duration-200 ease-[var(--ease-btn)] placeholder:text-white/35"
                                            placeholder="**********"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white transition-colors duration-200 ease-[var(--ease-btn)]"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-white text-sm font-semibold border border-white bg-white/5 px-4 py-2 flex items-center gap-2"
                                    >
                                        <span className="w-1 h-1 bg-white shrink-0" />
                                        ACCESS DENIED: Invalid credentials
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-white text-black py-3 px-6 font-medium uppercase tracking-widest hover:bg-white/85 transition-colors duration-200 ease-[var(--ease-btn)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="animate-pulse">Authenticating</span>
                                            <span className="animate-[ping_1s_ease-in-out_infinite]">.</span>
                                            <span className="animate-[ping_1s_ease-in-out_infinite_0.2s]">.</span>
                                            <span className="animate-[ping_1s_ease-in-out_infinite_0.4s]">.</span>
                                        </span>
                                    ) : (
                                        'LOGIN'
                                    )}
                                </button>
                            </form>

                            <div className="text-xs text-white/35 text-center pt-4 border-t border-white/15 space-y-0.5">
                                <p>System Version: 2.1.4</p>
                                <p>Last Login: Never</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Demo credentials hint */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-4 text-center text-xs text-white/35"
                >
                    <p>Please use registered Firebase Admin Account.</p>
                </motion.div>
            </motion.div>
        </div>
    );
}
