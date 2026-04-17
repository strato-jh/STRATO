import { createBrowserRouter } from 'react-router';
import GalleryPage from './pages/GalleryPage';
import AdminLogin from './admin/AdminLogin';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/AdminDashboard';
import ProjectManager from './admin/ProjectManager';
import SectionManager from './admin/SectionManager';
import ContactManager from './admin/ContactManager';
import SocialLinksManager from './admin/SocialLinksManager';
import PasswordGenerator from './admin/PasswordGenerator';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <GalleryPage />,
    },
    {
        path: '/admin',
        element: <AdminLogin />,
    },
    {
        path: '/admin',
        element: <AdminLayout />,
        children: [
            {
                path: 'dashboard',
                element: <AdminDashboard />,
            },
            {
                path: 'projects',
                element: <ProjectManager />,
            },
            {
                path: 'sections',
                element: <SectionManager />,
            },
            {
                path: 'contacts',
                element: <ContactManager />,
            },
            {
                path: 'social-links',
                element: <SocialLinksManager />,
            },
            {
                path: 'password-gen',
                element: <PasswordGenerator />,
            },
        ],
    },
]);
