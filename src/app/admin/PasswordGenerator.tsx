import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Key, Copy, RefreshCw, Check, Lock } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const fontMono = "'Space Mono', monospace";

export default function PasswordGenerator() {
    const [password, setPassword] = useState('');
    const [length, setLength] = useState(16);
    const [includeUppercase, setIncludeUppercase] = useState(true);
    const [includeLowercase, setIncludeLowercase] = useState(true);
    const [includeNumbers, setIncludeNumbers] = useState(true);
    const [includeSymbols, setIncludeSymbols] = useState(true);
    const [copied, setCopied] = useState(false);
    const [strength, setStrength] = useState('');

    const generatePassword = async () => {
        let charset = '';
        if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
        if (includeNumbers) charset += '0123456789';
        if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        if (charset === '') {
            setPassword('');
            setStrength('');
            return;
        }

        let generatedPassword = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            generatedPassword += charset[randomIndex];
        }

        setPassword(generatedPassword);
        calculateStrength(generatedPassword);

        try {
            await setDoc(doc(db, 'settings', 'galleryAccess'), {
                currentPassword: generatedPassword,
                expiresAt: Date.now() + 24 * 60 * 60 * 1000
            });
        } catch (error) {
            console.error("Failed to save password to Firestore", error);
        }
    };

    const calculateStrength = (pwd: string) => {
        let score = 0;
        if (pwd.length >= 12) score++;
        if (pwd.length >= 16) score++;
        if (/[a-z]/.test(pwd)) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^a-zA-Z0-9]/.test(pwd)) score++;

        if (score <= 2) setStrength('Weak');
        else if (score <= 4) setStrength('Medium');
        else setStrength('Strong');
    };

    const copyToClipboard = () => {
        if (password) {
            navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getStrengthColor = () => {
        switch (strength) {
            case 'Weak': return '#ff3366';
            case 'Medium': return '#ffaa00';
            case 'Strong': return '#00ff88';
            default: return 'white';
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
                    <Key size={32} className="text-white" />
                    Password Generator
                </motion.h1>
                <p className="text-sm text-white/60">&gt; Generate secure passwords for admin access</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Generator Panel */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/5 border-2 border-white/20 p-6"
                >
                    <h2 className="text-lg font-bold mb-4 uppercase tracking-wide flex items-center gap-2">
                        <Lock size={18} />
                        Configure
                    </h2>

                    <div className="space-y-5">
                        {/* Length Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm uppercase tracking-wide text-white/70">
                                    &gt; Length
                                </label>
                                <span className="text-white font-bold text-lg">{length}</span>
                            </div>
                            <input
                                type="range"
                                min="8"
                                max="32"
                                value={length}
                                onChange={(e) => setLength(parseInt(e.target.value))}
                                className="w-full accent-white"
                            />
                            <div className="flex justify-between text-xs text-white/40 mt-1">
                                <span>8</span>
                                <span>32</span>
                            </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-3 pt-2 border-t border-white/20">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeUppercase}
                                    onChange={(e) => setIncludeUppercase(e.target.checked)}
                                    className="w-5 h-5 accent-white"
                                />
                                <span className="text-sm uppercase tracking-wide group-hover:text-white/70 transition-colors">
                                    Uppercase Letters (A-Z)
                                </span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeLowercase}
                                    onChange={(e) => setIncludeLowercase(e.target.checked)}
                                    className="w-5 h-5 accent-white"
                                />
                                <span className="text-sm uppercase tracking-wide group-hover:text-white/70 transition-colors">
                                    Lowercase Letters (a-z)
                                </span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeNumbers}
                                    onChange={(e) => setIncludeNumbers(e.target.checked)}
                                    className="w-5 h-5 accent-white"
                                />
                                <span className="text-sm uppercase tracking-wide group-hover:text-white/70 transition-colors">
                                    Numbers (0-9)
                                </span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeSymbols}
                                    onChange={(e) => setIncludeSymbols(e.target.checked)}
                                    className="w-5 h-5 accent-white"
                                />
                                <span className="text-sm uppercase tracking-wide group-hover:text-white/70 transition-colors">
                                    Symbols (!@#$%...)
                                </span>
                            </label>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={generatePassword}
                            className="w-full bg-white text-black py-3 px-6 font-bold uppercase tracking-widest hover:bg-white/90 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 mt-6"
                        >
                            <RefreshCw size={18} />
                            Generate Password
                        </button>
                    </div>
                </motion.div>

                {/* Result Panel */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/5 border-2 border-white/20 p-6"
                >
                    <h2 className="text-lg font-bold mb-4 uppercase tracking-wide">
                        &gt; Generated Password
                    </h2>

                    {/* Password Display */}
                    <div className="mb-6">
                        <div className="bg-black border-2 border-white/40 p-4 min-h-[80px] flex items-center justify-center relative group">
                            {password ? (
                                <>
                                    <p className="text-white text-lg break-all text-center font-bold tracking-wide">
                                        {password}
                                    </p>
                                    <button
                                        onClick={copyToClipboard}
                                        className="absolute top-2 right-2 text-white/60 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                        title="Copy to clipboard"
                                    >
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                    </button>
                                </>
                            ) : (
                                <p className="text-white/40 text-sm uppercase">
                                    No password generated yet
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Strength Indicator */}
                    {password && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-6"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm uppercase tracking-wide text-white/70">
                                    &gt; Strength
                                </span>
                                <span
                                    className="font-bold uppercase text-sm px-3 py-1 border-2"
                                    style={{
                                        color: getStrengthColor(),
                                        borderColor: getStrengthColor()
                                    }}
                                >
                                    {strength}
                                </span>
                            </div>
                            <div className="w-full h-2 bg-black border border-white/30">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: strength === 'Weak' ? '33%' : strength === 'Medium' ? '66%' : '100%'
                                    }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full"
                                    style={{ backgroundColor: getStrengthColor() }}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* Copy Button */}
                    {password && (
                        <button
                            onClick={copyToClipboard}
                            disabled={copied}
                            className={`w-full py-3 px-6 font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                copied
                                    ? 'bg-white text-black'
                                    : 'border-2 border-white/40 text-white hover:bg-white hover:text-black'
                            }`}
                        >
                            {copied ? (
                                <>
                                    <Check size={18} />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy size={18} />
                                    Copy to Clipboard
                                </>
                            )}
                        </button>
                    )}
                </motion.div>
            </div>

            {/* Usage Guide */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8 bg-white/5 border-2 border-white/20 p-6"
            >
                <h3 className="text-lg font-bold mb-3 uppercase tracking-wide text-white">
                    &gt; Usage Guide
                </h3>
                <div className="space-y-2 text-sm text-white/80">
                    <p>&gt; Use these generated passwords for:</p>
                    <ul className="list-none space-y-1 ml-4">
                        <li>• Admin authentication</li>
                        <li>• Gallery access codes (like STRATO01)</li>
                        <li>• Restricted project passwords</li>
                        <li>• API keys and tokens</li>
                    </ul>
                    <p className="mt-4 text-white/60 text-xs">
                        &gt; Remember to store passwords securely and never share them publicly
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
