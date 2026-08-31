import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export type MediaType = 'image' | 'video' | 'youtube';

export interface AdditionalMedia {
    type: MediaType;
    url: string;
    thumbnail?: string;
}

export interface Project {
    id: string;
    title?: string;
    description?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    youtubeUrl?: string;
    mediaType?: MediaType;
    isRestricted?: boolean;
    category?: string;
    date?: string;
    location?: string;
    additionalMedia?: AdditionalMedia[];
    createdAt?: any;
    /** Manual display order set in Admin → Projects. Lower comes first. */
    order?: number;
}

/**
 * Display order: manually-ordered projects first (ascending), then anything
 * without an `order` yet, newest first. Kept here so the public site and the
 * admin list can never disagree about sequence.
 */
export function byDisplayOrder(a: Project, b: Project) {
    const ao = typeof a.order === 'number' ? a.order : Number.POSITIVE_INFINITY;
    const bo = typeof b.order === 'number' ? b.order : Number.POSITIVE_INFINITY;
    return ao - bo;
}

export interface Section {
    id: string;
    name?: string;
    title?: string;
    content?: string;
    imageUrl?: string;
}

export interface SocialLink {
    id: string;
    name?: string;
    url?: string;
    enabled?: boolean;
}

/**
 * Live Firestore subscriptions backing the public site.
 */
export function useStratoData() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
    /* Overridden by settings/general.contactEmail from the admin area. */
    const [contactEmail, setContactEmail] = useState('jhkim.strato@gmail.com');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        /* Ordered newest-first by the query, then re-sorted client-side so the
         * manual `order` field wins where it has been set. Sorting in Firestore
         * would drop documents that have no `order` yet. */
        const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
        const unsubP = onSnapshot(q, (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Project[];
            setProjects(rows.sort(byDisplayOrder));
            setLoading(false);
        }, () => setLoading(false));

        const unsubS = onSnapshot(collection(db, 'sections'), (snap) => {
            setSections(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Section[]);
        });

        const unsubSocial = onSnapshot(collection(db, 'social_links'), (snap) => {
            if (snap.empty) {
                setSocialLinks([{ id: 'instagram', name: 'Instagram', url: 'https://instagram.com/strato', enabled: true }]);
            } else {
                setSocialLinks(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SocialLink[]);
            }
        });

        const unsubEmail = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
            if (snap.exists() && snap.data().contactEmail) setContactEmail(snap.data().contactEmail);
        });

        return () => { unsubP(); unsubS(); unsubSocial(); unsubEmail(); };
    }, []);

    return { projects, sections, socialLinks, contactEmail, loading };
}

/** Projects the visitor is allowed to see. */
export function visibleProjects(projects: Project[], isUnlocked: boolean) {
    return projects.filter((p) => !p.isRestricted || isUnlocked);
}

/** Distinct categories present in the data, in a stable order. */
export function categoriesOf(projects: Project[]) {
    const order = ['FASHION', 'BEAUTY', 'EDUCATION', 'ENT', 'OTHER'];
    const found = Array.from(new Set(projects.map((p) => p.category).filter(Boolean))) as string[];
    return found.sort((a, b) => {
        const ia = order.indexOf(a); const ib = order.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
}

export function getYouTubeId(url?: string) {
    if (!url) return null;
    const m = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return m && m[2].length === 11 ? m[2] : null;
}

/** Poster/still image for a project regardless of media type. */
export function posterOf(p: Project) {
    if (p.mediaType === 'video') return p.thumbnailUrl || p.imageUrl;
    return p.imageUrl;
}

/** Submit the contact form. Shared by all concepts. */
export async function submitContact(data: { name: string; email: string; message: string }) {
    await addDoc(collection(db, 'contacts'), {
        ...data,
        status: 'new',
        date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
    });
}

/**
 * Verify a gallery access code against Firestore.
 * Verification goes through settings/galleryAccess only — there is deliberately
 * no hardcoded bypass code. Codes are issued from Admin → Password Gen.
 */
export async function verifyAccessCode(code: string) {
    try {
        const snap = await getDoc(doc(db, 'settings', 'galleryAccess'));
        if (!snap.exists()) return false;
        const data = snap.data();
        return code === data.currentPassword && Date.now() <= data.expiresAt;
    } catch {
        return false;
    }
}
