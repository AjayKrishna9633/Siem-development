import React from 'react';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
    <Toaster
      position="bottom-right"
      theme="dark"
      closeButton
      toastOptions={{ className: '!bg-surface !border-line-strong !text-ink' }}
    />
  </BrowserRouter>
);
