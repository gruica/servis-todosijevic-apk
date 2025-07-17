import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NotificationContextType {
  highlightedServiceId: number | null;
  setHighlightedServiceId: (id: number | null) => void;
  notificationId: number | null;
  setNotificationId: (id: number | null) => void;
  clearHighlight: () => void;
  shouldAutoOpen: boolean;
  setShouldAutoOpen: (shouldOpen: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [highlightedServiceId, setHighlightedServiceId] = useState<number | null>(null);
  const [notificationId, setNotificationId] = useState<number | null>(null);
  const [shouldAutoOpen, setShouldAutoOpen] = useState(false);

  const clearHighlight = () => {
    setHighlightedServiceId(null);
    setNotificationId(null);
    setShouldAutoOpen(false);
  };

  return (
    <NotificationContext.Provider
      value={{
        highlightedServiceId,
        setHighlightedServiceId,
        notificationId,
        setNotificationId,
        clearHighlight,
        shouldAutoOpen,
        setShouldAutoOpen,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};