import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Key, Copy, RefreshCw, Check, Lock } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { SANS, SERIF } from '../theme';

const headingStyle = { fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em' } as const;

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

    /* Strength is monochrome: how much of the track is filled + a Korean label. */
    const getStrengthFill = () => {
        switch (strength) {
            case 'Weak': return '33%';
            case 'Medium': return '66%';
            case 'Strong': return '100%';
            default: return '0%';
        }
    };

    const getStrengthLabel = () => {
        switch (strength) {
            case 'Weak': return '약함';
            case 'Medium': return '보통';
            case 'Strong': return '강함';
            default: return '';
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
                    <Key size={28} className="text-white" />
                    Password Generator
                </motion.h1>
                <p className="text-sm text-white/50">비공개 프로젝트를 열람할 수 있는 접근 코드를 발급합니다 (유효기간 24시간)</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Generator Panel */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/5 border border-white/15 p-6"
                >
                    <h2 className="text-lg mb-4 flex items-center gap-2 text-white" style={headingStyle}>
                        <Lock size={18} />
                        Configure
                    </h2>

                    <div className="space-y-5">
                        {/* Length Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm uppercase tracking-wide text-white/50">
                                    Length
                                </label>
                                <span className="text-white font-medium text-lg">{length}</span>
                            </div>
                            <input
                                type="range"
                                min="8"
                                max="32"
                                value={length}
                                onChange={(e) => setLength(parseInt(e.target.value))}
                                className="w-full accent-white"
                            />
                            <div className="flex justify-between text-xs text-white/35 mt-1">
                                <span>8</span>
                                <span>32</span>
                            </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-3 pt-4 border-t border-white/15">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeUppercase}
                                    onChange={(e) => setIncludeUppercase(e.target.checked)}
                                    className="w-5 h-5 accent-white"
                                />
                                <span className="text-sm uppercase tracking-wide text-white/70 group-hover:text-white transition-colors duration-200 ease-[var(--ease-btn)]">
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
                                <span className="text-sm uppercase tracking-wide text-white/70 group-hover:text-white transition-colors duration-200 ease-[var(--ease-btn)]">
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
                                <span className="text-sm uppercase tracking-wide text-white/70 group-hover:text-white transition-colors duration-200 ease-[var(--ease-btn)]">
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
                                <span className="text-sm uppercase tracking-wide text-white/70 group-hover:text-white transition-colors duration-200 ease-[var(--ease-btn)]">
                                    Symbols (!@#$%...)
                                </span>
                            </label>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={generatePassword}
                            className="w-full bg-white text-black py-3 px-6 font-medium uppercase tracking-widest hover:bg-white/85 transition-colors duration-200 ease-[var(--ease-btn)] flex items-center justify-center gap-2 mt-6"
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
                    className="bg-white/5 border border-white/15 p-6"
                >
                    <h2 className="text-lg mb-4 text-white" style={headingStyle}>
                        Generated Password
                    </h2>

                    {/* Password Display */}
                    <div className="mb-6">
                        <div className="bg-black border border-white/28 p-4 min-h-[80px] flex items-center justify-center relative group">
                            {password ? (
                                <>
                                    <p className="text-white text-lg break-all text-center font-medium tracking-wide">
                                        {password}
                                    </p>
                                    <button
                                        onClick={copyToClipboard}
                                        className="absolute top-2 right-2 text-white/50 hover:text-white transition-colors duration-200 ease-[var(--ease-btn)] opacity-0 group-hover:opacity-100"
                                        title="Copy to clipboard"
                                    >
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                    </button>
                                </>
                            ) : (
                                <p className="text-white/35 text-sm uppercase">
                                    No password generated yet
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Strength Indicator — fill length + label, no hue */}
                    {password && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mb-6"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm uppercase tracking-wide text-white/50">
                                    Strength
                                </span>
                                <span className="text-sm text-white font-semibold">
                                    {getStrengthLabel()}
                                </span>
                            </div>
                            <div className="w-full h-2 bg-black border border-white/15">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: getStrengthFill() }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full bg-white"
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* Copy Button */}
                    {password && (
                        <button
                            onClick={copyToClipboard}
                            disabled={copied}
                            className={`w-full py-3 px-6 font-medium uppercase tracking-widest transition-colors duration-200 ease-[var(--ease-btn)] flex items-center justify-center gap-2 ${
                                copied
                                    ? 'bg-white text-black'
                                    : 'border border-white/28 text-white hover:border-white'
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
                className="mt-8 bg-white/5 border border-white/15 p-6"
            >
                <h3 className="text-lg mb-3 text-white" style={headingStyle}>
                    안내
                </h3>
                <div className="space-y-2 text-sm text-white/70">
                    <p>여기서 발급한 코드는 <strong className="text-white">비공개 프로젝트 열람용</strong>입니다.</p>
                    <ul className="list-none space-y-1 ml-4">
                        <li>• 사이트의 자물쇠 아이콘을 눌러 입력하면 잠긴 작업물이 표시됩니다</li>
                        <li>• 저장하면 이전 코드는 즉시 무효가 됩니다</li>
                        <li>• <strong className="text-white">유효기간은 발급 후 24시간</strong>이며, 지나면 다시 발급해야 합니다</li>
                    </ul>
                    <p className="mt-4 text-white/35 text-xs">
                        관리자 로그인 비밀번호와는 별개입니다. 관리자 계정은 Firebase Authentication에서 관리합니다.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
