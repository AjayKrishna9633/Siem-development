import React, { useEffect } from 'react';
import { useAuthStore } from '@/features/auth';
import { Providers } from './providers.tsx';
import { AppRoutes } from './router.tsx';

export const App: React.FC = () => {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return (
    <Providers>
      <AppRoutes />
    </Providers>
  );
};

export default App;
