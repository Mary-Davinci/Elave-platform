import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../services/notificationService';

const NotificationBell: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { user } = useAuth();
  
  // Use the REAL notification hook - no mock data!
  const { 
    notifications, 
    unreadCount, 
    loading, 
    error, 
    isConnected,
    markAsRead, 
    markAllAsRead,
    retry 
  } = useNotifications(30000); // Poll every 30 seconds

  const handleViewAllApprovals = () => {
    setShowDropdown(false);
    // Navigate to approvals page
    window.location.href = '/approvals';
  };

  // Don't show if user is not admin/super_admin
  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return null;
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'company_pending':
        return (
          <div className="notification-icon company">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-4h2v4h2v-4h2v6z"/>
            </svg>
          </div>
        );
      case 'sportello_pending':
        return (
          <div className="notification-icon sportello">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
            </svg>
          </div>
        );
      case 'agente_pending':
        return (
          <div className="notification-icon agente">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        );
      case 'segnalatore_pending':
        return (
          <div className="notification-icon segnalatore">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="notification-icon default">
            <span>🔔</span>
          </div>
        );
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ora';
    if (diffInMinutes < 60) return `${diffInMinutes}m fa`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h fa`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}g fa`;
    
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      <style>{`
        .notification-container {
          position: relative;
          display: inline-block;
        }

        .notification-bell {
          position: relative;
          background: transparent;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #6b7280;
        }

        .notification-bell:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .notification-bell.has-notifications {
          color: #3b82f6;
        }

        .notification-bell.has-notifications:hover {
          background: #eff6ff;
          color: #2563eb;
        }

        .bell-icon {
          width: 20px;
          height: 20px;
          transition: transform 0.2s ease;
        }

        .notification-bell:hover .bell-icon {
          transform: scale(1.1);
        }

        .notification-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #ef4444;
          color: white;
          border-radius: 10px;
          min-width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .connection-indicator {
          position: absolute;
          bottom: -1px;
          right: 2px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 2px solid white;
        }

        .connection-indicator.connected {
          background: #10b981;
        }

        .connection-indicator.disconnected {
          background: #ef4444;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .dropdown-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 40;
        }

        .notification-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 380px;
          max-width: 90vw;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          z-index: 50;
          overflow: hidden;
          animation: dropdownSlide 0.2s ease-out;
        }

        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .dropdown-header {
          padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
          background: #fafafa;
        }

        .dropdown-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 4px 0;
        }

        .dropdown-subtitle {
          font-size: 12px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .dropdown-content {
          max-height: 400px;
          overflow-y: auto;
        }

        .dropdown-content::-webkit-scrollbar {
          width: 4px;
        }

        .dropdown-content::-webkit-scrollbar-track {
          background: #f9fafb;
        }

        .dropdown-content::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 2px;
        }

        .empty-state, .error-state, .loading-state {
          padding: 40px 20px;
          text-align: center;
        }

        .empty-state-icon, .error-state-icon {
          font-size: 48px;
          margin-bottom: 12px;
          display: block;
        }

        .empty-state-title, .error-state-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 4px 0;
        }

        .empty-state-subtitle, .error-state-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .retry-button {
          margin-top: 12px;
          padding: 8px 16px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          color: #374151;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .retry-button:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .notification-item {
          padding: 16px 20px;
          border-bottom: 1px solid #f9fafb;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          gap: 12px;
        }

        .notification-item:hover {
          background: #f8fafc;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-icon {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }

        .notification-icon.company {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .notification-icon.sportello {
          background: #ecfdf5;
          color: #059669;
        }

        .notification-icon.agente {
          background: #fef3c7;
          color: #d97706;
        }

        .notification-icon.segnalatore {
          background: #fce7f3;
          color: #be185d;
        }

        .notification-icon.default {
          background: #f3f4f6;
          color: #6b7280;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
          margin: 0 0 4px 0;
          line-height: 1.4;
        }

        .notification-message {
          font-size: 13px;
          color: #6b7280;
          margin: 0 0 8px 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .notification-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .notification-time {
          font-size: 12px;
          color: #9ca3af;
        }

        .notification-action {
          font-size: 12px;
          color: #3b82f6;
          font-weight: 500;
        }

        .dropdown-footer {
          padding: 12px 20px;
          border-top: 1px solid #f3f4f6;
          background: #fafafa;
        }

        .footer-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .mark-all-read {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 13px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .mark-all-read:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .view-all-button {
          width: 100%;
          background: none;
          border: none;
          color: #3b82f6;
          font-size: 14px;
          font-weight: 500;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-all-button:hover {
          background: #eff6ff;
          color: #2563eb;
        }

        .debug-info {
          padding: 8px 12px;
          background: #fef3c7;
          border-top: 1px solid #fde68a;
          font-size: 11px;
          color: #92400e;
          font-family: monospace;
        }
      `}</style>

      <div className="notification-container">
        <button 
          className={`notification-bell ${unreadCount > 0 ? 'has-notifications' : ''}`}
          onClick={() => setShowDropdown(!showDropdown)}
          type="button"
          title={`Notifiche${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
        >
          <svg className="bell-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
          
          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          
          <span className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
        </button>

        {showDropdown && (
          <>
            <div className="dropdown-backdrop" onClick={() => setShowDropdown(false)}></div>
            
            <div className="notification-dropdown">
              <div className="dropdown-header">
                <h3 className="dropdown-title">Notifiche</h3>
                <div className="dropdown-subtitle">
                  {loading && <div className="loading-spinner"></div>}
                  <span>
                    {error ? 'Errore di connessione' : 
                     loading ? 'Caricamento...' : 
                     isConnected ? 'Connesso' : 'Disconnesso'}
                  </span>
                </div>
              </div>
              
              <div className="dropdown-content">
                {/* Error State */}
                {error && (
                  <div className="error-state">
                    <span className="error-state-icon">⚠️</span>
                    <h4 className="error-state-title">Errore di Connessione</h4>
                    <p className="error-state-subtitle">{error}</p>
                    <button onClick={retry} className="retry-button">
                      Riprova
                    </button>
                  </div>
                )}

                {/* Loading State */}
                {loading && !error && (
                  <div className="loading-state">
                    <div className="loading-spinner" style={{ width: '32px', height: '32px', marginBottom: '12px' }}></div>
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                      Caricamento notifiche...
                    </p>
                  </div>
                )}

                {/* Empty State */}
                {!loading && !error && notifications.length === 0 && (
                  <div className="empty-state">
                    <span className="empty-state-icon">🔕</span>
                    <h4 className="empty-state-title">Nessuna Notifica</h4>
                    <p className="empty-state-subtitle">Sei aggiornato con tutto!</p>
                  </div>
                )}

                {/* Notifications */}
                {!loading && !error && notifications.length > 0 && notifications.map((notification) => (
                  <div 
                    key={notification._id}
                    className="notification-item"
                    onClick={() => markAsRead(notification._id)}
                  >
                    {getNotificationIcon(notification.type)}
                    
                    <div className="notification-content">
                      <h4 className="notification-title">
                        {notification.title}
                      </h4>
                      <p className="notification-message">
                        {notification.message}
                      </p>
                      <div className="notification-meta">
                        <span className="notification-time">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                        <span className="notification-action">
                          Clicca per rimuovere
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Footer */}
              {!error && (
                <div className="dropdown-footer">
                  {notifications.length > 0 && (
                    <div className="footer-actions">
                      <button 
                        className="mark-all-read"
                        onClick={markAllAsRead}
                      >
                        Segna tutte come lette
                      </button>
                    </div>
                  )}
                  <button 
                    className="view-all-button"
                    onClick={handleViewAllApprovals}
                  >
                    Visualizza Tutte le Approvazioni →
                  </button>
                </div>
              )}

              {/* Debug Info (development only) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="debug-info">
                  Connesso: {isConnected ? 'Sì' : 'No'} | 
                  Notifiche: {notifications.length} | 
                  Non lette: {unreadCount}
                  {error && ` | Errore: ${error}`}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default NotificationBell;