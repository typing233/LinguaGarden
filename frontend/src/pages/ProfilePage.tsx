import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import client from '@/api/client';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [language, setLanguage] = useState(user?.preferred_language || 'en');
  const [passwords, setPasswords] = useState({ current: '', new: '' });

  const handleSave = async () => {
    try {
      await client.put('/users/me', { display_name: displayName, preferred_language: language });
      updateUser({ display_name: displayName, preferred_language: language });
      i18n.changeLanguage(language);
      toast.success(t('profile.saved'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleChangePassword = async () => {
    try {
      await client.put('/users/me/password', { current_password: passwords.current, new_password: passwords.new });
      toast.success(t('common.success'));
      setPasswords({ current: '', new: '' });
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">{t('profile.title')}</h1>

      <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.displayName')}</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.language')}</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500">
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>
        <button onClick={handleSave} className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition">
          {t('profile.save')}
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
        <h2 className="font-semibold">{t('profile.changePassword')}</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.currentPassword')}</label>
          <input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.newPassword')}</label>
          <input type="password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <button onClick={handleChangePassword} className="w-full py-2.5 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition">
          {t('profile.changePassword')}
        </button>
      </div>
    </div>
  );
}
