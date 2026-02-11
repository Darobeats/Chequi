
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useUserRole } from '@/hooks/useUserRole';

const Dashboard = () => {
  const { user, loading } = useSupabaseAuth();
  const { role, isAdmin, isControl, isAttendee, isScanner, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  useEffect(() => {
    if (loading || roleLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (user && role) {
      if (isAdmin || isControl) navigate('/admin');
      else if (isScanner) navigate('/scanner');
      else if (isAttendee) navigate('/profile');
    }
  }, [user, role, loading, roleLoading, isAdmin, isControl, isScanner, isAttendee, navigate]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-empresarial flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dorado mx-auto mb-4"></div>
          <p className="text-hueso mb-2">{t('dashboard.redirecting')}</p>
          <p className="text-gray-400 text-sm">
            {loading && t('dashboard.verifyingAuth')}
            {!loading && roleLoading && t('dashboard.loadingProfile')}
          </p>
        </div>
      </div>
    );
  }

  if (user && !role) {
    return (
      <div className="min-h-screen bg-empresarial flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">{t('dashboard.profileError')}</p>
          <p className="text-gray-400 text-sm mb-4">{t('dashboard.profileErrorDetail')}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-dorado text-empresarial px-4 py-2 rounded hover:bg-dorado/80"
          >
            {t('dashboard.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-empresarial flex items-center justify-center">
      <div className="text-center">
        <p className="text-hueso mb-2">{t('dashboard.systemStatus')}</p>
        <p className="text-gray-400 text-sm">
          {t('dashboard.userStatus')}: {user ? t('dashboard.authenticated') : t('dashboard.notAuthenticated')} | 
          {t('dashboard.role')}: {role || t('dashboard.noRole')}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
