import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import * as THREE from 'three';
import gsap from 'gsap';
import { motion, AnimatePresence } from 'motion/react';
import { Key, X, Grid, Lock, MapPin, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Play } from 'lucide-react';

const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};
import { doc, getDoc, collection, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const ITEM_HEIGHT = 5;
const fontFamilySans = "'Space Grotesk', sans-serif";
const fontFamilyMono = "'Space Mono', monospace";

function CustomCursor() {
    const cursorRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const move = (e: MouseEvent) => {
            if (cursorRef.current) {
                cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
            }
        };
        window.addEventListener('mousemove', move);
        return () => window.removeEventListener('mousemove', move);
    }, []);

    return (
        <div ref={cursorRef} className="hidden md:block fixed top-0 left-0 pointer-events-none z-[9999] will-change-transform">
            <div id="cursor-inner" className="relative -top-1 -left-1 transition-transform duration-300 ease-out origin-top-left">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#ff3366" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                </svg>
            </div>
        </div>
    );
}

function HUD({ activePage, onHomeClick }: any) {
    const [time, setTime] = useState("");
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-US', { hour12: false }) + ':' + now.getMilliseconds().toString().padStart(3, '0').slice(0, 2));
        }, 50);
        return () => clearInterval(interval);
    }, []);

    const isHome = activePage === 'home';

    return (
        <div style={{ fontFamily: fontFamilyMono }} className="fixed inset-0 pointer-events-none z-[100] text-[#f0f0f0] text-[10px] uppercase tracking-widest leading-relaxed opacity-50">
            <div className="absolute top-5 left-5 flex flex-col gap-2 pointer-events-auto">
                <button 
                    onClick={onHomeClick}
                    className="interactive-el text-white text-lg block tracking-widest leading-none font-bold bg-transparent border-none text-left cursor-pointer hover:opacity-80 transition-opacity p-0 m-0" 
                    style={{ fontFamily: fontFamilySans }}
                >
                    STRATO
                </button>
            </div>
            {isHome && (
                <>
                    <div className="absolute top-5 right-5 text-right">
                        <strong className="text-white text-xs block mb-1">{time}</strong>
                        LOC: SEOUL, KR<br/>
                        COORD: 37.5665° N, 126.9780° E
                    </div>
                    <div className="absolute bottom-[90px] md:bottom-5 left-5 text-left text-white/70">
                        DRAG TO PAN<br/>
                        SCROLL TO ZOOM<br/>
                        CLICK TO EXPAND
                    </div>
                </>
            )}
        </div>
    );
}

function Nav({ activePage, setPageWithHistory, isVisible }: any) {
    if (!isVisible) return null;
    return (
        <nav className="fixed bottom-[30px] left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md border border-white/20 rounded-[50px] flex p-1 z-[200] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            {['home', 'gallery', 'about', 'contact'].map(page => (
                <button
                    key={page}
                    className={`interactive-el bg-transparent border-none text-sm font-bold px-5 py-2.5 md:px-6 rounded-[30px] cursor-pointer transition-all duration-300 capitalize ${activePage === page ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                    onClick={() => setPageWithHistory(activePage === page ? 'home' : page)}
                    style={{ fontFamily: fontFamilySans }}
                >
                    {page}
                </button>
            ))}
        </nav>
    );
}

function PageGallery({ isActive, projects, onSelectProject, isUnlocked, onRequestUnlock }: any) {
    const [filter, setFilter] = useState('ALL');
    const categories = ['ALL', 'FASHION', 'BEAUTY', 'EDUCATION', 'OTHER', 'LOCKED'];

    let filtered = projects;
    if (filter === 'LOCKED') {
        filtered = projects.filter((p: any) => p.isRestricted);
    } else {
        filtered = projects.filter((p: any) => (!p.isRestricted || isUnlocked) && (filter === 'ALL' || p.category === filter || (filter === 'OTHER' && (p.category === 'ENT' || p.category === 'OTHER'))));
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: isActive ? 1 : 0, pointerEvents: isActive ? 'auto' : 'none' }} transition={{ duration: 0.5 }}
            className="absolute inset-0 z-40 bg-[#050505]/80 backdrop-blur-xl flex flex-col px-[5vw] pt-[120px] overflow-y-auto"
        >
            {isActive && (
                <div className="w-full max-w-[1400px] mx-auto pb-20">
                    <div className="flex overflow-x-auto hide-scrollbar gap-2 md:gap-4 mb-10 border-b border-white/10 pb-6 w-full px-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                        {categories.map(c => (
                            <button
                                key={c}
                                onClick={() => setFilter(c)}
                                className={`interactive-el text-[10px] md:text-sm font-bold uppercase tracking-widest px-4 py-2 md:px-6 md:py-3 border transition-all rounded-[30px] cursor-pointer shrink-0 ${filter === c ? 'border-white text-black bg-white' : 'border-white/20 text-white hover:text-white hover:border-white'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>

                    {filter === 'LOCKED' && !isUnlocked ? (
                        <div className="py-32 flex flex-col items-center justify-center text-center border border-dashed border-white/20 rounded-[10px]">
                            <Lock size={48} className="mb-6 opacity-50" />
                            <h2 className="text-2xl font-bold uppercase tracking-widest mb-4">Restricted Access</h2>
                            <p className="text-white/50 font-mono text-sm mb-8 max-w-md">The contents of this gallery are locked. Please provide the authorization code to proceed.</p>
                            <button
                                onClick={onRequestUnlock}
                                className="interactive-el px-10 py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-white/80 transition-colors rounded-[30px]"
                            >
                                Enter Password
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filtered.map((p: any) => (
                                <div key={p.id} className="interactive-el relative group cursor-pointer overflow-hidden border border-white/10 rounded-[10px] bg-black/50" onClick={() => onSelectProject(p)}>
                                    <div className="w-full aspect-[4/5] relative">
                                        {p.mediaType === 'video' ? (
                                            <video src={p.imageUrl} poster={p.thumbnailUrl || p.imageUrl} preload="none" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
                                        ) : p.mediaType === 'youtube' ? (
                                            <div className="w-full h-full relative">
                                                <img src={p.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                <div className="absolute inset-0 flex items-center justify-center p-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    <Play size={48} className="text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] fill-white/20" />
                                                </div>
                                            </div>
                                        ) : (
                                            <img src={p.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        )}
                                        {/* Optional: we can still keep the restricted overlay briefly if we want, but they are already in the locked tab, so we can omit it, or keep it subtle */}
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <h3 className="font-bold uppercase tracking-wide truncate text-white">{p.title}</h3>
                                        <p className="text-xs text-[#ff3366] font-mono uppercase tracking-widest mt-1">{p.category}</p>
                                    </div>
                                </div>
                            ))}
                            {filtered.length === 0 && (
                                <div className="col-span-full py-20 text-center text-white/40 uppercase tracking-widest border border-dashed border-white/10 rounded-[10px]">
                                    No restricted projects found
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}

function PageAbout({ isActive, section }: any) {
    const title = section?.title || 'Technology\nFocused &\nCreatively Driven';
    const content = section?.content || '우리는 기술과 크리에이티브의 경계를 허뭅니다. 물리법칙에 기반한 인터랙션과 몰입감 넘치는 3D 공간을 통해 사용자에게 잊을 수 없는 디지털 경험을 제공합니다.';

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: isActive ? 1 : 0, pointerEvents: isActive ? 'auto' : 'none' }} transition={{ duration: 0.5 }}
            className="absolute inset-0 z-20 flex flex-col justify-center items-center text-center px-[5vw] overflow-y-auto"
        >
            {isActive && (
                <>
                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                        className="text-[clamp(40px,8vw,120px)] font-bold leading-none uppercase tracking-[-2px] mb-5 text-[#f0f0f0]"
                    >
                        {title.split('\n').map((line: string, i: number) => (
                            <React.Fragment key={i}>{line}<br/></React.Fragment>
                        ))}
                    </motion.div>
                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                        className="text-[clamp(14px,2vw,20px)] max-w-[600px] text-[#aaa] leading-relaxed break-keep whitespace-pre-wrap" style={{ fontFamily: fontFamilyMono }}
                    >
                        {content}
                    </motion.div>
                </>
            )}
        </motion.div>
    );
}

function PageContact({ isActive, setPageWithHistory, socialLinks }: any) {
    // Only display enabled social links that have URLs
    const activeLinks = socialLinks?.filter((link: any) => link.enabled && link.url) || [];

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: isActive ? 1 : 0, pointerEvents: isActive ? 'auto' : 'none' }} transition={{ duration: 0.5 }}
            className="absolute inset-0 z-20 flex flex-col justify-center px-[5vw] overflow-y-auto"
        >
            {isActive && (
                <ul className="list-none w-full max-w-[800px] mx-auto">
                    <motion.li initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                        className="text-[clamp(40px,6vw,100px)] font-bold uppercase border-b border-white/10 text-white/30 hover:text-white transition-colors duration-300 relative"
                    >
                        <span className="interactive-el block w-full py-5 cursor-pointer" onClick={() => setPageWithHistory('mail')}>Mail</span>
                    </motion.li>
                    {activeLinks.map((link: any, index: number) => (
                        <motion.li key={link.id} initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 + (index * 0.1), ease: "easeOut" }}
                            className="text-[clamp(40px,6vw,100px)] font-bold uppercase border-b border-white/10 text-white/30 hover:text-white transition-colors duration-300 relative"
                        >
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="interactive-el block w-full py-5 cursor-pointer no-underline text-inherit">{link.name}</a>
                        </motion.li>
                    ))}
                </ul>
            )}
        </motion.div>
    );
}

function PageMail({ isActive, setPageWithHistory }: any) {
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.message) {
            alert('Please fill in all fields.');
            return;
        }

        setSending(true);
        try {
            await addDoc(collection(db, 'contacts'), {
                name: formData.name,
                email: formData.email,
                message: formData.message,
                status: 'new',
                date: new Date().toISOString().split('T')[0].replace(/-/g, '.')
            });
            setSent(true);
            setTimeout(() => {
                setSent(false);
                setFormData({ name: '', email: '', message: '' });
                setPageWithHistory('contact');
            }, 2000);
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: isActive ? 1 : 0, pointerEvents: isActive ? 'auto' : 'none' }} transition={{ duration: 0.5 }}
            className="absolute inset-0 z-20 flex flex-col justify-center items-center px-[5vw] overflow-y-auto"
        >
            {isActive && (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                    className="w-full max-w-[600px] bg-white/[0.03] border border-white/10 p-10 rounded-[20px] backdrop-blur-xl"
                >
                    <div className="text-sm text-[#ff3366] mb-[30px] uppercase tracking-[2px]" style={{ fontFamily: fontFamilyMono }}>// COMPOSE NEW MESSAGE</div>
                    <div className="mb-[30px]">
                        <label className="block text-xs uppercase mb-[10px] text-white/50" style={{ fontFamily: fontFamilyMono }}>Your Name</label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="John Doe" className="interactive-el w-full bg-transparent border-none border-b border-white/20 py-2.5 text-white text-xl outline-none focus:border-white transition-colors duration-300" />
                    </div>
                    <div className="mb-[30px]">
                        <label className="block text-xs uppercase mb-[10px] text-white/50" style={{ fontFamily: fontFamilyMono }}>Email Address</label>
                        <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="john@example.com" className="interactive-el w-full bg-transparent border-none border-b border-white/20 py-2.5 text-white text-xl outline-none focus:border-white transition-colors duration-300" />
                    </div>
                    <div className="mb-[30px]">
                        <label className="block text-xs uppercase mb-[10px] text-white/50" style={{ fontFamily: fontFamilyMono }}>Message</label>
                        <textarea rows={4} value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} placeholder="Tell us about your project..." className="interactive-el w-full bg-transparent border-none border-b border-white/20 py-2.5 text-white text-xl outline-none focus:border-white transition-colors duration-300 resize-none"></textarea>
                    </div>
                    <div className="flex gap-[15px] mt-10">
                        <button onClick={() => setPageWithHistory('contact')} className="interactive-el flex-1 p-5 text-base font-bold uppercase tracking-[2px] cursor-pointer rounded-[10px] border border-white/20 bg-transparent text-white hover:bg-white/10 transition-colors">Cancel</button>
                        <button onClick={handleSubmit} disabled={sending || sent}
                            className={`interactive-el flex-1 p-5 text-base font-bold uppercase tracking-[2px] cursor-pointer rounded-[10px] border-none transition-all duration-300 ${sent ? 'bg-[#00ff88] text-black' : sending ? 'bg-white/80 text-black' : 'bg-white text-black hover:bg-[#ff3366] hover:text-white hover:-translate-y-[2px]'}`}
                        >
                            {sent ? "Message Sent!" : sending ? "Sending..." : "Send Message"}
                        </button>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

function PageDetail({ project, projects, onSelectProject, onClose, isUnlocked }: any) {
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    const allMedia = React.useMemo(() => {
        if (!project) return [];
        const media = [];
        if (project.mediaType === 'video') {
            media.push({ type: 'video', url: project.imageUrl, thumbnail: project.thumbnailUrl });
        } else if (project.mediaType === 'youtube') {
            media.push({ type: 'youtube', url: project.youtubeUrl, thumbnail: project.imageUrl });
        } else {
            media.push({ type: 'image', url: project.imageUrl });
        }
        if (project.additionalMedia && Array.isArray(project.additionalMedia)) {
            media.push(...project.additionalMedia);
        }
        return media;
    }, [project]);

    useEffect(() => {
        setCurrentMediaIndex(0);
        
        // Auto-scroll sidebar thumbnail into view when project changes
        const selectedEl = document.querySelector(`.sidebar-project-${project?.id}`);
        if (selectedEl) {
            selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [project]);

    if (!project) return null;

    const visibleProjects = projects.filter((p:any) => p.isRestricted ? isUnlocked : true);
    const currentIndex = visibleProjects.findIndex((p:any) => p.id === project.id);

    const nextProject = () => {
        if (visibleProjects.length === 0) return;
        const nextIdx = (currentIndex + 1) % visibleProjects.length;
        onSelectProject(visibleProjects[nextIdx]);
    };
    
    const prevProject = () => {
        if (visibleProjects.length === 0) return;
        const prevIdx = (currentIndex - 1 + visibleProjects.length) % visibleProjects.length;
        onSelectProject(visibleProjects[prevIdx]);
    };

    const nextMedia = (e: any) => {
        e.stopPropagation();
        setDirection(1);
        setCurrentMediaIndex((prev) => (prev + 1) % allMedia.length);
    };

    const prevMedia = (e: any) => {
        e.stopPropagation();
        setDirection(-1);
        setCurrentMediaIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
    };

    const currentMedia = allMedia[currentMediaIndex];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-50 bg-[#f0f0f0] text-[#050505] flex h-screen w-screen overflow-hidden"
        >
            <div className="flex-1 flex flex-col lg:flex-row gap-10 lg:gap-20 px-[5vw] pt-[100px] pb-[100px] lg:pt-[10vh] lg:pb-[10vh] overflow-y-auto hide-scrollbar relative">
                
                {/* Left Side: Media Carousel */}
                <div className="w-full lg:w-[50%] flex flex-col items-center justify-start max-h-[85vh] relative">
                    {/* Media Container */}
                    <div className="w-full relative flex items-center justify-center overflow-hidden">
                        <AnimatePresence mode="popLayout" custom={direction}>
                            {currentMedia && (
                                <motion.div
                                    key={`${project.id}-media-${currentMediaIndex}`}
                                    custom={direction}
                                    variants={{
                                        enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 20 : -20 }),
                                        center: { opacity: 1, x: 0 },
                                        exit: (dir: number) => ({ opacity: 0, x: dir < 0 ? 20 : -20 })
                                    }}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className="w-full flex items-center justify-center relative rounded-[20px] overflow-hidden"
                                >
                                    {currentMedia.type === 'video' ? (
                                        <video src={currentMedia.url} poster={currentMedia.thumbnail} autoPlay loop controls playsInline className="w-full h-auto max-h-[80vh] object-contain snap-center" />
                                    ) : currentMedia.type === 'youtube' ? (
                                        <iframe 
                                            src={`https://www.youtube.com/embed/${getYouTubeId(currentMedia.url || '')}?autoplay=1&loop=1&playlist=${getYouTubeId(currentMedia.url || '')}`}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="w-full aspect-video h-auto max-h-[80vh] border-none bg-black rounded-[20px]"
                                        />
                                    ) : (
                                        <img src={currentMedia.url} className="w-full h-auto max-h-[80vh] object-contain snap-center" alt="" />
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        {/* Media Arrows */}
                        {allMedia.length > 1 && (
                            <>
                                <button onClick={prevMedia} className="interactive-el absolute left-4 w-10 h-10 bg-white/50 hover:bg-white border border-black/10 rounded-full flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer text-black">
                                    <ChevronLeft size={20} />
                                </button>
                                <button onClick={nextMedia} className="interactive-el absolute right-4 w-10 h-10 bg-white/50 hover:bg-white border border-black/10 rounded-full flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer text-black">
                                    <ChevronRight size={20} />
                                </button>
                                
                                <div className="absolute bottom-4 flex gap-2">
                                    {allMedia.map((_, i) => (
                                        <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentMediaIndex ? 'bg-[#ff3366] w-6' : 'bg-black/30'}`} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Side: Details & Actions */}
                <div className="flex-1 flex flex-col justify-center">
                    {/* Mobile Navigation (Appears between Media and Date) */}
                    <div className="flex lg:hidden mb-8 pb-8 border-b border-black/10 items-center justify-between w-full flex-nowrap shrink-0 mt-4 lg:mt-0">
                        <button onClick={onClose} title="Return" className="interactive-el flex-1 max-w-[200px] flex items-center justify-center px-4 h-12 sm:h-14 rounded-[30px] border-2 border-[#ff3366]/40 text-[#ff3366] bg-[#ff3366]/5 font-bold uppercase tracking-widest hover:bg-[#ff3366] hover:text-white transition-all duration-300 cursor-pointer gap-2">
                            <Grid size={18} /> Home
                        </button>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={prevProject} className="interactive-el flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-black/20 text-black hover:bg-black hover:text-white transition-all duration-300 cursor-pointer">
                                <ArrowLeft size={18} />
                            </button>
                            <button onClick={nextProject} className="interactive-el flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-black/20 text-black hover:bg-black hover:text-white transition-all duration-300 cursor-pointer">
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="text-sm font-bold text-[#ff3366] mb-4 uppercase tracking-[2px]" style={{ fontFamily: fontFamilyMono }}>
                        {project.date || '2026.04'} / {project.category}
                    </div>
                    <h2 className={`text-[clamp(20px,2.5vw,40px)] ${project.location ? 'mb-2' : 'mb-6 md:mb-10'} font-semibold uppercase leading-[1.1] tracking-tighter text-black truncate w-full`} style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                        {project.title}
                    </h2>
                    {project.location && (
                        <div className="text-xs md:text-sm text-black/50 mb-6 md:mb-10 font-medium uppercase tracking-wide flex items-center gap-1">
                            <MapPin size={14} /> {project.location}
                        </div>
                    )}
                    
                    <div className="space-y-4 md:space-y-6 max-w-full md:max-w-[600px] text-sm md:text-lg text-[#333] leading-[1.8] truncate" style={{ fontFamily: "'Noto Sans KR', 'Noto Sans', sans-serif" }}>
                        <p>{project.description || '이 작품에 대한 상세 설명이 아직 등록되지 않았습니다.'}</p>
                    </div>

                    <div className="hidden lg:flex mt-12 pt-10 border-t border-black/10 items-center justify-between w-full flex-nowrap shrink-0">
                        <button onClick={onClose} title="Return" className="interactive-el flex-1 max-w-[200px] flex items-center justify-center px-4 h-14 rounded-[30px] border-2 border-[#ff3366]/40 text-[#ff3366] bg-[#ff3366]/5 font-bold uppercase tracking-widest hover:bg-[#ff3366] hover:text-white transition-all duration-300 cursor-pointer gap-2">
                            <Grid size={18} /> <span>HOME</span>
                        </button>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={prevProject} className="interactive-el flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-full border border-black/20 text-black hover:bg-black hover:text-white transition-all duration-300 cursor-pointer">
                                <ArrowLeft size={18} />
                            </button>
                            <button onClick={nextProject} className="interactive-el flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-full border border-black/20 text-black hover:bg-black hover:text-white transition-all duration-300 cursor-pointer">
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>


        </motion.div>
    );
}

export default function GalleryPage() {
    const [activePage, setActivePage] = useState('home'); // Initial is home
    const [projects, setProjects] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [socialLinks, setSocialLinks] = useState<any[]>([]);
    const [contactEmail, setContactEmail] = useState('contact@strato.com');
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [inputCode, setInputCode] = useState('');
    const [codeError, setCodeError] = useState(false);

    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // refs for three.js
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const galleryGroupRef = useRef<THREE.Group | null>(null);
    const planesRef = useRef<THREE.Mesh[]>([]);
    const animationFrameId = useRef<number>(0);
    const raycasterRef = useRef(new THREE.Raycaster());
    const mouseRef = useRef(new THREE.Vector2());

    const dragInfo = useRef({
        isDragging: false,
        moved: false,
        startX: 0,
        startY: 0,
        velocityX: 0,
        velocityY: 0,
        targetRotationX: 0,
        targetRotationY: 0
    });
    const hoveredMeshRef = useRef<THREE.Mesh | null>(null);
    const selectedMeshRef = useRef<THREE.Mesh | null>(null);

    const setPageWithHistory = (page: string) => {
        if (activePage !== page) {
            window.history.pushState({ page, project: null }, '', `/?page=${page}`);
            setActivePage(page);
        }
    };

    const handleHomeClick = () => {
        if (selectedProject) {
            closeDetail(false);
        } else {
            setPageWithHistory('home');
        }
    };

    // History API Listener
    useEffect(() => {
        // Init state if none
        if (!window.history.state) {
            window.history.replaceState({ page: activePage, project: selectedProject }, '', window.location.search || '/');
        }

        const handlePopState = (e: PopStateEvent) => {
            const state = e.state;
            if (state) {
                if (state.project) {
                    setSelectedProject(state.project);
                    setActivePage('home');
                } else {
                    if (selectedProject) {
                        closeDetail(true);
                    }
                    setActivePage(state.page || 'home');
                }
            } else {
                if (selectedProject) {
                    closeDetail(true);
                } else {
                    setActivePage('home');
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [activePage, selectedProject]);

    // Fetch Projects and Sections from Firestore
    useEffect(() => {
        const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
        const unsubP = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProjects(data);
        });

        const unsubS = onSnapshot(collection(db, 'sections'), (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSections(data);
        });

        const unsubSocial = onSnapshot(collection(db, 'social_links'), (snap) => {
            if (snap.empty) {
                // Fallback to default Instagram if DB is empty to prevent UI from breaking
                setSocialLinks([{ id: 'instagram', name: 'Instagram', url: 'https://instagram.com/strato', enabled: true }]);
            } else {
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setSocialLinks(data);
            }
        });

        const unsubEmail = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
            if (docSnap.exists() && docSnap.data().contactEmail) {
                setContactEmail(docSnap.data().contactEmail);
            }
        });

        return () => { unsubP(); unsubS(); unsubSocial(); unsubEmail(); };
    }, []);

    useEffect(() => {
        const handleEnter = () => document.body.classList.add('cursor-hover');
        const handleLeave = () => document.body.classList.remove('cursor-hover');

        const observer = new MutationObserver(() => {
            const currentElements = document.querySelectorAll('.interactive-el');
            currentElements.forEach(el => {
                el.removeEventListener('mouseenter', handleEnter);
                el.removeEventListener('mouseleave', handleLeave);
                el.addEventListener('mouseenter', handleEnter);
                el.addEventListener('mouseleave', handleLeave);
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, []);

    // Three.js Init
    useEffect(() => {
        if (!canvasContainerRef.current) return;

        const container = canvasContainerRef.current;
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x020108, 0.015);
        scene.background = new THREE.Color(0x020108);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const galleryGroup = new THREE.Group();
        scene.add(galleryGroup);
        galleryGroupRef.current = galleryGroup;

        const createSoftTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const context = canvas.getContext('2d');
            if (context) {
                const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
                gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                context.fillStyle = gradient;
                context.fillRect(0, 0, 64, 64);
            }
            return new THREE.CanvasTexture(canvas);
        };
        const softTexture = createSoftTexture();

        // 1. Space Theme: Stars (Increased visibility)
        const starsGeometry = new THREE.BufferGeometry();
        const starsVertices = [];
        const starsColors = [];
        const colorObj = new THREE.Color();
        for(let i=0; i<6000; i++) {
            starsVertices.push((Math.random() - 0.5) * 400, (Math.random() - 0.5) * 400, (Math.random() - 0.5) * 400);
            const mix = Math.random();
            colorObj.setHSL(0.6 + mix * 0.2, 0.8, 0.5 + Math.random() * 0.5); 
            if(Math.random() > 0.6) colorObj.setHex(0xffffff); // More pure white stars
            starsColors.push(colorObj.r, colorObj.g, colorObj.b);
        }
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starsColors, 3));

        const starsMaterial = new THREE.PointsMaterial({
            size: 1.5, 
            vertexColors: true, 
            transparent: true, 
            opacity: 1.0, 
            blending: THREE.AdditiveBlending,
            map: softTexture,
            depthWrite: false
        });
        const starField = new THREE.Points(starsGeometry, starsMaterial);
        scene.add(starField);

        // 2. Space Theme: Nebula / Milky Way (Subtle)
        const nebulaGeometry = new THREE.BufferGeometry();
        const nebulaVertices = [];
        const nebulaColors = [];
        const nColorObj = new THREE.Color();
        
        for(let i=0; i<600; i++) {
            const radius = 100 + Math.random() * 400;
            const theta = (Math.random() - 0.5) * Math.PI * 2;
            const y = (Math.random() - 0.5) * 150 * (1 - radius/500); 
            
            nebulaVertices.push(radius * Math.cos(theta), y, radius * Math.sin(theta));
            
            const colorType = Math.random();
            if (colorType < 0.2) nColorObj.setHex(0x6a1b9a); // Muted Purple
            else if (colorType < 0.5) nColorObj.setHex(0x1565c0); // Muted Blue
            else if (colorType < 0.7) nColorObj.setHex(0xad1457); // Muted Pink
            else if (colorType < 0.9) nColorObj.setHex(0x00838f); // Muted Cyan
            else nColorObj.setHex(0xaaaaaa); // Dim White

            nebulaColors.push(nColorObj.r, nColorObj.g, nColorObj.b);
        }
        nebulaGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nebulaVertices, 3));
        nebulaGeometry.setAttribute('color', new THREE.Float32BufferAttribute(nebulaColors, 3));
        
        const nebulaMaterial = new THREE.PointsMaterial({
            size: 300, 
            vertexColors: true, 
            transparent: true, 
            opacity: 0.25, // Increased visibility again
            blending: THREE.AdditiveBlending,
            map: softTexture,
            depthWrite: false
        });
        const nebulaField = new THREE.Points(nebulaGeometry, nebulaMaterial);
        nebulaField.rotation.z = Math.PI / 6; // Tilt the Milky Way
        scene.add(nebulaField);

        // 3. Space Theme: Shooting Stars
        // Make it thinner, shorter, and farther away
        const shootingStarGeo = new THREE.CylinderGeometry(0.05, 0.2, 20, 4);
        shootingStarGeo.rotateX(Math.PI / 2); // Align to Z. -Z is tail, +Z is front.
        const shootingStarMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const shootingStar = new THREE.Mesh(shootingStarGeo, shootingStarMat);
        shootingStar.visible = false;
        scene.add(shootingStar);

        let starTimeout: NodeJS.Timeout;
        const shootStar = () => {
            // Spawn farther away in the background (Z: -100 to -250)
            const startX = (Math.random() - 0.5) * 300;
            const startY = 30 + Math.random() * 80;
            const startZ = -150 - Math.random() * 100;

            const endX = startX - 50 - Math.random() * 50;
            const endY = startY - 50 - Math.random() * 50;
            const endZ = startZ + 30 + Math.random() * 30;

            shootingStar.position.set(startX, startY, startZ);
            shootingStar.lookAt(endX, endY, endZ);
            shootingStar.visible = true;
            shootingStar.material.opacity = 0.8;

            gsap.to(shootingStar.material, { opacity: 0, duration: 0.3, delay: 0.1 + Math.random() * 0.2 });
            gsap.to(shootingStar.position, {
                x: endX,
                y: endY,
                z: endZ,
                duration: 0.4 + Math.random() * 0.3,
                ease: "power1.in",
                onComplete: () => {
                    shootingStar.visible = false;
                    starTimeout = setTimeout(shootStar, 2000 + Math.random() * 5000); // Every 2-7 seconds
                }
            });
        };
        starTimeout = setTimeout(shootStar, 1000);

        const targetQuat = new THREE.Quaternion();



        const animate = () => {
            animationFrameId.current = requestAnimationFrame(animate);

            dragInfo.current.velocityX *= 0.95;
            dragInfo.current.velocityY *= 0.95;

            const deltaY = dragInfo.current.velocityX + (!dragInfo.current.isDragging ? 0.00075 : 0);
            const deltaX = dragInfo.current.velocityY;

            if (deltaX !== 0 || deltaY !== 0) {
                const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), deltaX);
                const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaY);
                targetQuat.premultiply(qX).premultiply(qY);
            }

            if (galleryGroupRef.current) {
                galleryGroupRef.current.quaternion.slerp(targetQuat, 0.1);
            }

            starField.rotation.y += 0.0005;
            starField.rotation.x += 0.0002;

            nebulaField.rotation.y += 0.0003;
            nebulaField.rotation.z += 0.0001;

            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        animate();

        const handleResize = () => {
            if (cameraRef.current && rendererRef.current) {
                cameraRef.current.aspect = window.innerWidth / window.innerHeight;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(window.innerWidth, window.innerHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(starTimeout);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId.current);
            if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
                container.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
        };
    }, []);

    // Rebuild 3D planes when `projects` changes
    useEffect(() => {
        if (!galleryGroupRef.current) return;
        const group = galleryGroupRef.current;
        
        // Remove old planes and prevent memory leaks by disposing of materials and maps
        planesRef.current.forEach(mesh => {
            group.remove(mesh);
            mesh.geometry.dispose();
            const material = mesh.material as THREE.MeshBasicMaterial;
            if (material.map) material.map.dispose();
            material.dispose();
        });
        planesRef.current = [];

        if (projects.length === 0) return;

        const textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = "Anonymous";

        const isMobile = window.innerWidth < 768;
        // Reduce item height on mobile to fit more items visibly
        const currentItemHeight = isMobile ? ITEM_HEIGHT * 0.35 : ITEM_HEIGHT;
        const totalItems = Math.max(projects.length, 1);

        projects.forEach((proj, i) => {
            const material = new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
            const geometry = new THREE.PlaneGeometry(currentItemHeight, currentItemHeight, 32, 32); 
            const mesh = new THREE.Mesh(geometry, material);

            let targetUrl = proj.imageUrl;
            if (proj.mediaType === 'video') {
                targetUrl = proj.thumbnailUrl || 'https://placehold.co/400x500/1a1a1a/ffffff.png?text=VIDEO';
            }

            // Immediately set visibility based on restriction and unlock status
            mesh.visible = !proj.isRestricted || isUnlocked;
            
            // Assign proj properties directly to userData, plus our texture metadata
            mesh.userData = { ...proj, _textureLoaded: false };
            
            mesh.userData._loadTexture = () => {
                if (mesh.userData._textureLoaded) return;
                textureLoader.load(targetUrl, 
                    (texture) => {
                        const ratio = texture.image.width / texture.image.height;
                        mesh.scale.set(ratio, 1, 1);
                        texture.colorSpace = THREE.SRGBColorSpace;
                        material.map = texture;
                        material.color.setHex(0xffffff);
                        material.needsUpdate = true;
                        mesh.userData._textureLoaded = true;
                    },
                    undefined,
                    (err) => {
                        console.error('Texture load error, log:', err);
                    }
                );
            };

            // Only load texture right away if it's visible. Otherwise, it will load when unlocked.
            if (mesh.visible) {
                mesh.userData._loadTexture();
            }

            const phi = Math.acos(1 - 2 * (i + 0.5) / totalItems);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;
            // Radius depends on total items to fit well. 
            // Wider base radius + smaller height on mobile = more items in view
            const radiusBase = isMobile ? 8 : 15;
            const radiusSpread = isMobile ? 5 : 10;
            const radius = radiusBase + Math.random() * radiusSpread; 

            mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
            mesh.position.y = radius * Math.cos(phi);
            mesh.position.z = radius * Math.sin(phi) * Math.sin(theta);
            mesh.lookAt(0, 0, 0);

            group.add(mesh);
            planesRef.current.push(mesh);
        });

    }, [projects]);

    // Handle unlocking dynamically without destroying out the 3D scene
    useEffect(() => {
        if (!isUnlocked) return;
        planesRef.current.forEach(mesh => {
            if (mesh.userData.isRestricted && !mesh.visible) {
                mesh.visible = true;
                if (mesh.userData._loadTexture && !mesh.userData._textureLoaded) {
                    mesh.userData._loadTexture();
                }
            }
        });
    }, [isUnlocked]);

    // Interactions
    useEffect(() => {
        const isInteractionDisabled = () => selectedMeshRef.current || activePage !== 'home' || showCodeModal;

        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            if (isInteractionDisabled()) return;
            
            const target = e.target as HTMLElement;
            if (target && target.closest && target.closest('.interactive-el, a, button, input, textarea, form, [role="dialog"]')) return;
            
            dragInfo.current.isDragging = true;
            dragInfo.current.moved = false;
            dragInfo.current.startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            dragInfo.current.startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            document.body.classList.add('cursor-scale-down');
        };

        const onPointerMove = (e: MouseEvent | TouchEvent) => {
            if (isInteractionDisabled()) return;
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            if (dragInfo.current.isDragging) {
                const deltaX = clientX - dragInfo.current.startX;
                const deltaY = clientY - dragInfo.current.startY;

                if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                    dragInfo.current.moved = true;
                }

                dragInfo.current.velocityX += deltaX * 0.0002;
                dragInfo.current.velocityY += deltaY * 0.0002;
                dragInfo.current.startX = clientX;
                dragInfo.current.startY = clientY;
            } else if (cameraRef.current) {
                const target = e.target as HTMLElement;
                if (target && target.closest && target.closest('.interactive-el, a, button, input, textarea, form, [role="dialog"]')) {
                    if (hoveredMeshRef.current) {
                        gsap.to(hoveredMeshRef.current.scale, { x: hoveredMeshRef.current.scale.x / 1.1, y: 1, z: 1, duration: 0.4 });
                        (hoveredMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.8;
                        hoveredMeshRef.current = null;
                        document.body.classList.remove('cursor-hover');
                    }
                    return;
                }

                mouseRef.current.x = (clientX / window.innerWidth) * 2 - 1;
                mouseRef.current.y = -(clientY / window.innerHeight) * 2 + 1;

                raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
                const intersects = raycasterRef.current.intersectObjects(planesRef.current);

                if (intersects.length > 0) {
                    const object = intersects[0].object as THREE.Mesh;
                    if (hoveredMeshRef.current !== object) {
                        if (hoveredMeshRef.current) {
                            gsap.to(hoveredMeshRef.current.scale, { x: hoveredMeshRef.current.scale.x / 1.1, y: 1, z: 1, duration: 0.4 });
                            (hoveredMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.8;
                        }
                        hoveredMeshRef.current = object;
                        gsap.to(hoveredMeshRef.current.scale, { x: hoveredMeshRef.current.scale.x * 1.1, y: 1.1, z: 1.1, duration: 0.4, ease: "back.out(1.5)" });
                        (hoveredMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 1.0;
                        document.body.classList.add('cursor-hover');
                    }
                } else {
                    if (hoveredMeshRef.current) {
                        gsap.to(hoveredMeshRef.current.scale, { x: hoveredMeshRef.current.scale.x / 1.1, y: 1, z: 1, duration: 0.4 });
                        (hoveredMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.8;
                        hoveredMeshRef.current = null;
                        document.body.classList.remove('cursor-hover');
                    }
                }
            }
        };

        const onPointerUp = () => {
            dragInfo.current.isDragging = false;
            document.body.classList.remove('cursor-scale-down');
        };

        const onWheel = (e: WheelEvent) => {
            if (isInteractionDisabled()) return;
            dragInfo.current.velocityY -= e.deltaY * 0.0001;
        };

        const onClick = (e: MouseEvent) => {
            if (isInteractionDisabled() || dragInfo.current.moved) return;
            
            const target = e.target as HTMLElement;
            if (target && target.closest && target.closest('.interactive-el, a, button, input, textarea, form, [role="dialog"]')) return;

            if (hoveredMeshRef.current && cameraRef.current) {
                const mesh = hoveredMeshRef.current;
                const proj = mesh.userData;
                
                if (proj.isRestricted && !isUnlocked) {
                    setShowCodeModal(true);
                    return;
                }

                selectedMeshRef.current = mesh;
                const targetPos = new THREE.Vector3();
                mesh.getWorldPosition(targetPos);
                const targetQuat = new THREE.Quaternion();
                mesh.getWorldQuaternion(targetQuat);

                const meshUp = new THREE.Vector3(0, 1, 0).applyQuaternion(targetQuat).normalize();
                const camTarget = targetPos.clone().normalize().multiplyScalar(targetPos.length() - 8);

                const tempCam = new THREE.PerspectiveCamera();
                tempCam.position.copy(camTarget);
                tempCam.up.copy(meshUp);
                tempCam.lookAt(targetPos);

                const startQuat = cameraRef.current.quaternion.clone();
                const endQuat = tempCam.quaternion.clone();
                const lookAtProxy = { t: 0 };

                gsap.to(cameraRef.current.position, {
                    x: camTarget.x, y: camTarget.y, z: camTarget.z,
                    duration: 1.2, ease: "power3.inOut"
                });

                gsap.to(lookAtProxy, {
                    t: 1, duration: 1.2, ease: "power3.inOut",
                    onUpdate: () => {
                        cameraRef.current!.quaternion.slerpQuaternions(startQuat, endQuat, lookAtProxy.t);
                    }
                });

                gsap.to(cameraRef.current, {
                    fov: 40, duration: 1.2, ease: "power3.inOut",
                    onUpdate: () => cameraRef.current!.updateProjectionMatrix()
                });

                setTimeout(() => {
                    setSelectedProject(proj);
                    window.history.pushState({ page: 'home', project: proj }, '', `/?project=${proj.id}`);
                }, 400);

                document.body.classList.remove('cursor-hover');
            }
        };

        window.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);
        window.addEventListener('touchstart', onPointerDown);
        window.addEventListener('touchmove', onPointerMove);
        window.addEventListener('touchend', onPointerUp);
        window.addEventListener('wheel', onWheel);
        window.addEventListener('click', onClick);

        return () => {
            window.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('mouseup', onPointerUp);
            window.removeEventListener('touchstart', onPointerDown);
            window.removeEventListener('touchmove', onPointerMove);
            window.removeEventListener('touchend', onPointerUp);
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('click', onClick);
        };
    }, [activePage, showCodeModal, isUnlocked]);

    // Page Transitions
    useEffect(() => {
        if (!cameraRef.current || !canvasContainerRef.current) return;
        if (activePage === 'home') {
            gsap.to(canvasContainerRef.current, { opacity: 1, duration: 1, ease: "power2.out" });
            gsap.to(cameraRef.current.position, { z: 0, duration: 1, ease: "power2.out" });
        } else {
            gsap.to(canvasContainerRef.current, { opacity: 0.2, duration: 0.8 });
            gsap.to(cameraRef.current.position, { z: 30, duration: 0.8, ease: "power2.inOut" });
        }
    }, [activePage]);

    const closeDetail = (isPopState = false) => {
        setSelectedProject(null);
        setActivePage('home');

        if (isPopState !== true) {
            window.history.pushState({ page: 'home', project: null }, '', '/');
        }

        dragInfo.current.targetRotationX = 0;
        dragInfo.current.targetRotationY = 0;
        dragInfo.current.velocityX = 0;
        dragInfo.current.velocityY = 0;

        if (cameraRef.current) {
            const startQuat = cameraRef.current.quaternion.clone();

            const tempCam = new THREE.PerspectiveCamera();
            tempCam.position.set(0, 0, 0);
            tempCam.up.set(0, 1, 0);
            tempCam.lookAt(0, 0, -1);
            const endQuat = tempCam.quaternion.clone();

            const lookAtProxy = { t: 0 };

            gsap.to(cameraRef.current.position, { x: 0, y: 0, z: 0, duration: 1.2, ease: "power3.inOut" });
            gsap.to(lookAtProxy, {
                t: 1, duration: 1.2, ease: "power3.inOut",
                onUpdate: () => {
                    cameraRef.current!.quaternion.slerpQuaternions(startQuat, endQuat, lookAtProxy.t);
                }
            });

            gsap.to(cameraRef.current, {
                fov: 60, duration: 1.2, ease: "power3.inOut",
                onUpdate: () => cameraRef.current!.updateProjectionMatrix(),
                onComplete: () => {
                    if (hoveredMeshRef.current) {
                        gsap.to(hoveredMeshRef.current.scale, { x: hoveredMeshRef.current.scale.x / 1.1, y: 1, z: 1, duration: 0.4 });
                        hoveredMeshRef.current = null;
                    }
                    selectedMeshRef.current = null;
                }
            });
        }
    };

    const handleSelectFrom2DGallery = (project: any) => {
        setActivePage('home'); // Fade back 3D bg out of dim mode
        // Note: Full 3D camera navigation to arbitrary mesh from 2D gallery requires complex matrix projection.
        // For simple UX parity, we will just open the Detail overlay for that project on top of home.
        setSelectedProject(project); 
        window.history.pushState({ page: 'home', project }, '', `/?project=${project.id}`);
    };

    const handleUnlockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (inputCode === 'strato001') {
            setIsUnlocked(true);
            setShowCodeModal(false);
            setInputCode('');
            return;
        }

        try {
            const docRef = doc(db, 'settings', 'galleryAccess');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (inputCode === data.currentPassword && Date.now() <= data.expiresAt) {
                    setIsUnlocked(true);
                    setShowCodeModal(false);
                    setInputCode('');
                    return;
                }
            }
            
            setCodeError(true);
            setTimeout(() => setCodeError(false), 2000);
        } catch (error) {
            console.error("Error verifying access code", error);
            setCodeError(true);
            setTimeout(() => setCodeError(false), 2000);
        }
    };

    return (
        <div style={{ fontFamily: fontFamilySans }} className="relative w-full h-screen bg-[#020108] text-[#f0f0f0] overflow-hidden cursor-auto md:cursor-none selection:bg-[#ff3366] selection:text-white">
            <style dangerouslySetInnerHTML={{__html: `
                @media (pointer: fine) { body { cursor: none; } }
                body.cursor-hover #cursor-inner { transform: scale(1.3) !important; }
                body.cursor-scale-down #cursor-inner { transform: scale(0.8) !important; }
            `}} />

            <CustomCursor />
            <HUD activePage={activePage} onHomeClick={handleHomeClick} />
            <Nav activePage={activePage} setPageWithHistory={setPageWithHistory} isVisible={!selectedProject} />

            {!selectedProject && (
                <Link to="/admin" className="fixed bottom-5 right-5 z-[150] text-[10px] text-white/30 hover:text-white/80 transition-colors uppercase tracking-widest pointer-events-auto interactive-el" style={{ fontFamily: fontFamilyMono }}>
                    admin
                </Link>
            )}

            {!selectedProject && !isUnlocked && (
                <button
                    onClick={() => setShowCodeModal(true)}
                    className="fixed top-[60px] left-5 z-[150] interactive-el flex items-center justify-center w-8 h-8 rounded-full border border-white/20 text-white/50 hover:bg-white hover:text-black transition-all duration-300 cursor-pointer bg-black/20 backdrop-blur-sm"
                >
                    <Key size={14} />
                </button>
            )}

            <div ref={canvasContainerRef} className="absolute inset-0 z-10 pointer-events-none" />

            <PageGallery isActive={activePage === 'gallery'} projects={projects} onSelectProject={handleSelectFrom2DGallery} isUnlocked={isUnlocked} onRequestUnlock={() => setShowCodeModal(true)} />
            <PageAbout isActive={activePage === 'about'} section={sections.find(s => s.id === 'about')} />
            <PageContact isActive={activePage === 'contact'} setPageWithHistory={setPageWithHistory} socialLinks={socialLinks} />
            <PageMail isActive={activePage === 'mail'} setPageWithHistory={setPageWithHistory} contactEmail={contactEmail} />

            <AnimatePresence>
                {selectedProject && (
                    <PageDetail project={selectedProject} projects={projects} onSelectProject={handleSelectFrom2DGallery} onClose={closeDetail} isUnlocked={isUnlocked} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCodeModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 pointer-events-auto">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#111] border border-white/10 p-8 rounded-[20px] w-full max-w-[400px] relative">
                            <button type="button" onClick={() => setShowCodeModal(false)} className="absolute top-4 right-4 z-50 text-white/50 hover:text-white interactive-el transition-colors cursor-pointer flex items-center justify-center p-2">
                                <X size={20} />
                            </button>
                            <div className="text-sm font-bold text-[#ff3366] mb-6 uppercase tracking-[2px]" style={{ fontFamily: fontFamilyMono }}>// Restricted Access</div>
                            <h3 className="text-2xl font-bold mb-2 uppercase">Enter Access Code</h3>
                            <p className="text-white/50 text-sm mb-6 font-mono">Unlock exclusive projects.</p>
                            <form onSubmit={handleUnlockSubmit}>
                                <input
                                    type="text"
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value)}
                                    placeholder="Enter Code"
                                    className={`w-full bg-black/50 border ${codeError ? 'border-[#ff3366]' : 'border-white/20'} rounded-[10px] px-4 py-3 text-white outline-none focus:border-white transition-colors interactive-el uppercase font-mono tracking-widest`}
                                />
                                {codeError && <p className="text-[#ff3366] text-xs mt-2 font-mono">Invalid code. Please try again.</p>}
                                <button type="submit" className="w-full mt-6 bg-white text-black font-bold uppercase tracking-widest py-4 rounded-[10px] hover:bg-[#ff3366] hover:text-white transition-colors interactive-el cursor-pointer">
                                    Unlock
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
