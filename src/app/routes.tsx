import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import HomePage from './pages/HomePage';

/* The admin area is never needed by a visitor, and it pulls in Firebase
 * Auth/Storage plus eight management screens. Split it into its own chunk
 * so the public site ships only what it uses. */
const AdminLogin = lazy(() => import('./admin/AdminLogin'));
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const ProjectManager = lazy(() => import('./admin/ProjectManager'));
const SectionManager = lazy(() => import('./admin/SectionManager'));
const ContactManager = lazy(() => import('./admin/ContactManager'));
const SocialLinksManager = lazy(() => import('./admin/SocialLinksManager'));
const PasswordGenerator = lazy(() => import('./admin/PasswordGenerator'));

function AdminChunk({ children }: { children: ReactNode }) {
    return (
        <Suspense
            fallback={
                <div
                    style={{
                        minHeight: '100vh',
                        background: '#000',
                        color: 'rgba(255,255,255,0.5)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    불러오는 중…
                </div>
            }
        >
            {children}
        </Suspense>
    );
}

export const router = createBrowserRouter([
    {
        path: '/',
        element: <HomePage />,
    },
    {
        path: '/admin',
        element: (
            <AdminChunk>
                <AdminLogin />
            </AdminChunk>
        ),
    },
    {
        path: '/admin',
        element: (
            <AdminChunk>
                <AdminLayout />
            </AdminChunk>
        ),
        children: [
            { path: 'dashboard', element: <AdminDashboard /> },
            { path: 'projects', element: <ProjectManager /> },
            { path: 'sections', element: <SectionManager /> },
            { path: 'contacts', element: <ContactManager /> },
            { path: 'social-links', element: <SocialLinksManager /> },
            { path: 'password-gen', element: <PasswordGenerator /> },
        ],
    },
]);
