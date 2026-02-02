import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Dashboard.css';
import '../styles/UserDropdown.css';
import UserDropdown from '../pages/UserDropdown';
import NotificationBell from '../pages/NotificationBell';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dropdown states
  const [postalDropdownOpen, setPostalDropdownOpen] = useState(false);
  const [sportelloLavoroDropdownOpen, setSportelloLavoroDropdownOpen] = useState(false);
  const [segnalatoriDropdownOpen, setSegnalatoriDropdownOpen] = useState(false);
  const [abilaDropdownOpen, setAbilaDropdownOpen] = useState(false);
  const [companiesDropdownOpen, setCompaniesDropdownOpen] = useState(false);
  const [fornitoriDropdownOpen, setFornitoriDropdownOpen] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  // ---- Roles (no cascading) ----
  const role = user?.role ?? '';
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || isSuperAdmin;
  const isResponsabileTerritoriale = role === 'responsabile_territoriale';
  const isSportelloLavoro = role === 'sportello_lavoro';

  // ---- Capabilities (explicit) ----
  const canSeeApprovals = isAdmin;
  const canSeeConto = isAdmin || isResponsabileTerritoriale || isSportelloLavoro;

  const canSeeAziende = true;
  const canCreateAzienda = isAdmin || isSuperAdmin || isResponsabileTerritoriale || isSportelloLavoro;
  const canUploadAziende = canCreateAzienda;

  const canSeeUsers = isAdmin;

  const canSeeResponsabileMenu = isAdmin; // admin/superadmin manage responsabili
  const canCreateResponsabile = isAdmin;
  const canListResponsabile = isAdmin;

  const canSeeSportelloMenu = isAdmin || isResponsabileTerritoriale; // NOT for sportello role
  const canCreateSportello = isAdmin || isResponsabileTerritoriale;

  const canSeeSegnalatoriMenu = isAdmin || isResponsabileTerritoriale || isSportelloLavoro;
  const canCreateSegnalatore = isAdmin || isResponsabileTerritoriale || isSportelloLavoro;


  const canCreateFornitore = isAdmin || isResponsabileTerritoriale || isSportelloLavoro;

  // Helper to close all dropdowns
  const closeAllDropdowns = useCallback(() => {
    setPostalDropdownOpen(false);
    setSportelloLavoroDropdownOpen(false);
    setSegnalatoriDropdownOpen(false);
    setAbilaDropdownOpen(false);
    setCompaniesDropdownOpen(false);
    setFornitoriDropdownOpen(false);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleNavigation = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const headerTitle = (() => {
    if (location.pathname.startsWith('/companies/new')) {
      return 'Nuova Azienda';
    }
    if (location.pathname === '/companies') {
      return 'Elenco Aziende';
    }
    return (
      location.pathname.split('/')[1]?.charAt(0).toUpperCase() +
        location.pathname.split('/')[1]?.slice(1) || 'Dashboard'
    );
  })();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(event.target as Node)
      ) {
        setSidebarOpen(false);
        closeAllDropdowns();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeAllDropdowns]);

  const togglePostalDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !postalDropdownOpen;
    closeAllDropdowns();
    setPostalDropdownOpen(newState);
  };

  const toggleSportelloLavoroDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !sportelloLavoroDropdownOpen;
    closeAllDropdowns();
    setSportelloLavoroDropdownOpen(newState);
  };

  const toggleSegnalatoriDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !segnalatoriDropdownOpen;
    closeAllDropdowns();
    setSegnalatoriDropdownOpen(newState);
  };

  const toggleAbilaDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !abilaDropdownOpen;
    closeAllDropdowns();
    setAbilaDropdownOpen(newState);
  };

  const toggleCompaniesDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !companiesDropdownOpen;
    closeAllDropdowns();
    setCompaniesDropdownOpen(newState);
  };

  const toggleFornitoriDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !fornitoriDropdownOpen;
    closeAllDropdowns();
    setFornitoriDropdownOpen(newState);
  };

  return (
    <div className="dashboard-container loaded">
      <header className="dashboard-header">
        <div className="logo-container">
          <button
            ref={toggleButtonRef}
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
          <div className="logo-box">
            <div className="logo"></div>
          </div>

          <div className="header-title">{headerTitle}</div>
        </div>
        <div className="user-info">
          <div className="user-role-badge">
            {role.toUpperCase().replace('_', ' ')}
          </div>
          <NotificationBell />
          <UserDropdown />
        </div>
      </header>

      <div className="dashboard-content">
        <div ref={sidebarRef} className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          {/* Dashboard */}
          <div
            className={`menu-item ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={() => handleNavigation('/dashboard')}
          >
            <i className="menu-icon">🏠</i>
            <span>Dashboard</span>
          </div>

          {/* Conto - Admin only */}
          {canSeeConto && (
          <div
            className={`menu-item ${isActive('/conto') ? 'active' : ''}`}
            onClick={() => handleNavigation('/conto')}
          >
            <i className="menu-icon">💰</i>
            <span>Conto</span>
            <i className="arrow-icon">▼</i>
          </div>

          )}

          {/* Posta */}
          <div className="menu-item-container">
            <div
              className={`menu-item ${isActive('/posta') ? 'active' : ''}`}
              onClick={togglePostalDropdown}
            >
              <i className="menu-icon">✉️</i>
              <span>Posta</span>
              <i className={`arrow-icon ${postalDropdownOpen ? 'open' : ''}`}>▼</i>
            </div>

            {postalDropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={() => handleNavigation('/posta/in-arrivo')}>
                  <i className="dropdown-icon">📥</i>
                  <span>In Arrivo</span>
                </div>
                <div className="dropdown-item" onClick={() => handleNavigation('/posta/nuovo')}>
                  <i className="dropdown-icon">✏️</i>
                  <span>Nuovo messaggio</span>
                </div>
              </div>
            )}
          </div>

          {/* Approvals - Admin and Super Admin only */}
          {canSeeApprovals && (
            <div
              className={`menu-item ${isActive('/approvals') ? 'active' : ''}`}
              onClick={() => handleNavigation('/approvals')}
            >
              <i className="menu-icon">✅</i>
              <span>Approvals</span>
            </div>
          )}

          {/* Aziende */}
          {canSeeAziende && (
            <div className="menu-item-container">
              <div
                className={`menu-item ${isActive('/companies') ? 'active' : ''}`}
                onClick={toggleCompaniesDropdown}
              >
                <i className="menu-icon">🏢</i>
                <span>Aziende</span>
                <i className={`arrow-icon ${companiesDropdownOpen ? 'open' : ''}`}>▼</i>
              </div>

              {companiesDropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-item" onClick={() => handleNavigation('/companies')}>
                    <i className="dropdown-icon">📋</i>
                    <span>Elenco</span>
                  </div>
                  {canCreateAzienda && (
                    <>
                      <div className="dropdown-item" onClick={() => handleNavigation('/companies/new')}>
                        <i className="dropdown-icon">➕</i>
                        <span>Crea</span>
                      </div>
                      {canUploadAziende && (
                        <div className="dropdown-item" onClick={() => handleNavigation('/companies/upload')}>
                          <i className="dropdown-icon">📤</i>
                          <span>Upload XLSX</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Users - Admin and Super Admin only */}
          {canSeeUsers && (
            <div
              className={`menu-item ${isActive('/users') ? 'active' : ''}`}
              onClick={() => handleNavigation('/users')}
            >
              <i className="menu-icon">👥</i>
              <span>Utenti</span>
            </div>
          )}

          {/* Responsabile Territoriale (admin area) */}
          {canSeeResponsabileMenu && (
            <div className="menu-item-container">
              <div
                className={`menu-item ${isActive('/agenti') || isActive('/abila') ? 'active' : ''}`}
                onClick={toggleAbilaDropdown}
              >
                <i className="menu-icon">📊</i>
                <span>Responsabile Territoriale</span>
                <i className={`arrow-icon ${abilaDropdownOpen ? 'open' : ''}`}>▼</i>
              </div>

              {abilaDropdownOpen && (
                <div className="dropdown-menu">
                  {canCreateResponsabile && (
                    <div className="dropdown-item" onClick={() => handleNavigation('/agenti')}>
                      <i className="dropdown-icon">➕</i>
                      <span>Crea</span>
                    </div>
                  )}
                  {canListResponsabile && (
                    <div className="dropdown-item" onClick={() => handleNavigation('/abila/progetti')}>
                      <i className="dropdown-icon">📋</i>
                      <span>Elenco</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sportello Lavoro (visible to Admin/Responsabile) */}
          {canSeeSportelloMenu && (
            <div className="menu-item-container">
              <div
                className={`menu-item ${isActive('/sportello-lavoro') ? 'active' : ''}`}
                onClick={toggleSportelloLavoroDropdown}
              >
                <i className="menu-icon">🏢</i>
                <span>Sportello Lavoro</span>
                <i className={`arrow-icon ${sportelloLavoroDropdownOpen ? 'open' : ''}`}>▼</i>
              </div>

              {sportelloLavoroDropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-item" onClick={() => handleNavigation('/sportello-lavoro')}>
                    <i className="dropdown-icon">📋</i>
                    <span>Elenco</span>
                  </div>
                  {canCreateSportello && (
                    <div className="dropdown-item" onClick={() => handleNavigation('/sportello-lavoro/new')}>
                      <i className="dropdown-icon">➕</i>
                      <span>Crea</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Segnalatori (Admin/Responsabile/Sportello) */}
          {canSeeSegnalatoriMenu && (
            <div className="menu-item-container">
              <div
                className={`menu-item ${isActive('/segnalatori') ? 'active' : ''}`}
                onClick={toggleSegnalatoriDropdown}
              >
                <i className="menu-icon">📢</i>
                <span>Segnalatori</span>
                <i className={`arrow-icon ${segnalatoriDropdownOpen ? 'open' : ''}`}>▼</i>
              </div>

              {segnalatoriDropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-item" onClick={() => handleNavigation('/segnalatori')}>
                    <i className="dropdown-icon">📋</i>
                    <span>Elenco</span>
                  </div>
                  {canCreateSegnalatore && (
                    <div className="dropdown-item" onClick={() => handleNavigation('/segnalatori/new')}>
                      <i className="dropdown-icon">➕</i>
                      <span>Crea</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fornitori */}
          <div className="menu-item-container">
            <div
              className={`menu-item ${isActive('/fornitori') ? 'active' : ''}`}
              onClick={toggleFornitoriDropdown}
            >
              <i className="menu-icon">🌐</i>
              <span>Fornitori</span>
              <i className={`arrow-icon ${fornitoriDropdownOpen ? 'open' : ''}`}>▼</i>
            </div>

            {fornitoriDropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={() => handleNavigation('/fornitori')}>
                  <i className="dropdown-icon">📋</i>
                  <span>Elenco</span>
                </div>
                {canCreateFornitore && (
                  <div className="dropdown-item" onClick={() => handleNavigation('/fornitori/crea')}>
                    <i className="dropdown-icon">➕</i>
                    <span>Crea</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <main className="main-content">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
