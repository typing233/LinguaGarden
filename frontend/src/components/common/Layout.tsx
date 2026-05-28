import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import clsx from 'clsx';

const navItems = [
  { path: '/dashboard', key: 'dashboard' },
  { path: '/vocabulary', key: 'vocabulary' },
  { path: '/exercises', key: 'exercises' },
  { path: '/garden', key: 'garden' },
  { path: '/progress', key: 'progress' },
  { path: '/profile', key: 'profile' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const next = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(next);
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary-600">LinguaGarden</h1>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'block px-4 py-2.5 rounded-lg text-sm font-medium transition',
                location.pathname === item.path
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={toggleLanguage}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg text-left"
          >
            {i18n.language === 'en' ? '中文' : 'English'}
          </button>
          <div className="px-4 py-2 text-sm text-gray-500 truncate">
            {user?.display_name || user?.username}
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left"
          >
            {t('nav.logout')}
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
