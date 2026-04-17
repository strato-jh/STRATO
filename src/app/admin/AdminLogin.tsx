import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { motion } from 'motion/react';
import { Terminal, Lock, Eye, EyeOff } from 'lucide-react';

const fontMono = "'Space Mono', monospace";

export default function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(false);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            sessionStorage.setItem('admin_auth', 'true');
            navigate('/admin/dashboard');
        } catch (err) {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden" style={{ fontFamily: fontMono }}>
            {/* Subtle grid background */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 2px,
                        white 2px,
                        white 4px
                    )`
                }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Terminal header */}
                <div className="bg-black border-2 border-white/20 shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
                    <div className="border-b-2 border-white/10 px-4 py-3 flex items-center gap-3 bg-white/5">
                        <Terminal size={18} className="text-white" />
                        <span className="text-sm uppercase tracking-widest">STRATO Admin Access</span>
                    </div>

                    <div className="p-8">
                        <div className="space-y-6">
                            <div className="text-sm">
                                <p className="mb-2 text-white/80">&gt; RESTRICTED AREA</p>
                                <p className="text-white/50">&gt; Authorization required to proceed...</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs mb-2 uppercase tracking-wider text-white/60">
                                        &gt; Enter Email:
                                    </label>
                                    <div className="relative mb-4">
                                        <Terminal size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white/5 border-2 border-white/20 px-10 py-3 text-white outline-none focus:border-white/50 transition-all font-mono placeholder:text-white/30"
                                            placeholder="admin@strato.com"
                                            autoFocus
                                        />
                                    </div>
                                    <label className="block text-xs mb-2 uppercase tracking-wider text-white/60">
                                        &gt; Enter Password:
                                    </label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/5 border-2 border-white/20 px-10 py-3 text-white outline-none focus:border-white/50 transition-all font-mono placeholder:text-white/30"
                                            placeholder="**********"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-red-400 text-sm border-2 border-red-400/50 bg-red-400/10 px-4 py-2"
                                    >
                                        &gt; ACCESS DENIED: Invalid credentials
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-white text-black py-3 px-6 font-bold uppercase tracking-widest hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

                            <div className="text-xs text-white/30 text-center pt-4 border-t border-white/10">
                                <p>&gt; System Version: 2.1.4</p>
                                <p>&gt; Last Login: Never</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Demo credentials hint */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-4 text-center text-xs text-white/30"
                >
                    <p>// Please use registered Firebase Admin Account.</p>
                </motion.div>
            </motion.div>
        </div>
    );
}
