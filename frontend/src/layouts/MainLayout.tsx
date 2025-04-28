// src/layouts/MainLayout.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Dashboard.css';
import '../styles/UserDropdown.css';
import UserDropdown from '../pages/UserDropdown';

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
  const [segnalatoriDropdownOpen, setSegnalatoriDropdownOpen] = useState(false);
  const [abilaDropdownOpen, setAbilaDropdownOpen] = useState(false);
  const [companiesDropdownOpen, setCompaniesDropdownOpen] = useState(false);
  const [analisiDropdownOpen, setAnalisiDropdownOpen] = useState(false);
  const [fornitoriDropdownOpen, setFornitoriDropdownOpen] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    // Handle clicks outside the sidebar to close it
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current && 
        !sidebarRef.current.contains(event.target as Node) &&
        toggleButtonRef.current && 
        !toggleButtonRef.current.contains(event.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Handle navigation
  const handleNavigation = (path: string) => {
    navigate(path);
    setSidebarOpen(false); 
  };




  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };


  const togglePostalDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPostalDropdownOpen(!postalDropdownOpen);
    
    setSegnalatoriDropdownOpen(false);
    setAbilaDropdownOpen(false);
    setCompaniesDropdownOpen(false);
    setAnalisiDropdownOpen(false);
    setFornitoriDropdownOpen(false);
  };
  
  const toggleSegnalatoriDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSegnalatoriDropdownOpen(!segnalatoriDropdownOpen);
    
    
    setPostalDropdownOpen(false);
    setAbilaDropdownOpen(false);
    setCompaniesDropdownOpen(false);
    setAnalisiDropdownOpen(false);
    setFornitoriDropdownOpen(false);
  };
  
  const toggleAbilaDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAbilaDropdownOpen(!abilaDropdownOpen);
    
    setPostalDropdownOpen(false);
    setSegnalatoriDropdownOpen(false);
    setCompaniesDropdownOpen(false);
    setAnalisiDropdownOpen(false);
    setFornitoriDropdownOpen(false);
  };
  
  const toggleCompaniesDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCompaniesDropdownOpen(!companiesDropdownOpen);
    
    
    setPostalDropdownOpen(false);
    setSegnalatoriDropdownOpen(false);
    setAbilaDropdownOpen(false);
    setAnalisiDropdownOpen(false);
    setFornitoriDropdownOpen(false);
  };
  
  const toggleAnalisiDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnalisiDropdownOpen(!analisiDropdownOpen);
    
    setPostalDropdownOpen(false);
    setSegnalatoriDropdownOpen(false);
    setAbilaDropdownOpen(false);
    setCompaniesDropdownOpen(false);
    setFornitoriDropdownOpen(false);
  };
  
  const toggleFornitoriDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFornitoriDropdownOpen(!fornitoriDropdownOpen);
    
  
    setPostalDropdownOpen(false);
    setSegnalatoriDropdownOpen(false);
    setAbilaDropdownOpen(false);
    setCompaniesDropdownOpen(false);
    setAnalisiDropdownOpen(false);
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
            <span className="logo">E.lav</span>
          </div>


          <div className="header-title">
            {location.pathname.split('/')[1]?.charAt(0).toUpperCase() + location.pathname.split('/')[1]?.slice(1) || 'Dashboard'}
          </div>
        </div>
        <div className="user-info">
          <button className="notification-button">
            <i className="notification-icon">🔔</i>
          </button>
          <UserDropdown />
        </div>
      </header>
      
      <div className="dashboard-content">
        <div 
          ref={sidebarRef}
          className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        >
          <div 
            className={`menu-item ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={() => handleNavigation('/dashboard')}
          >
            <i className="menu-icon">🏠</i>
            <span>Dashboard</span>
          </div>
          <div 
            className={`menu-item ${isActive('/conto') ? 'active' : ''}`}
            onClick={() => handleNavigation('/conto')}
          >
            <i className="menu-icon">💰</i>
            <span>Conto</span>
            <i className="arrow-icon">▼</i>
          </div>
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
                <div 
                  className="dropdown-item"
                  onClick={() => handleNavigation('/posta/in-arrivo')}
                >
                  <i className="dropdown-icon">📥</i>
                  <span>In Arrivo</span>
                </div>
                <div 
                  className="dropdown-item"
                  onClick={() => handleNavigation('/posta/nuovo')}
                >
                  <i className="dropdown-icon">✏️</i>
                  <span>Nuovo messaggio</span>
                </div>
              </div>
            )}
          </div>

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
                <div 
                  className="dropdown-item"
                  onClick={() => handleNavigation('/companies')}
                >
                  <i className="dropdown-icon">📋</i>
                  <span>Elenco</span>
                </div>
                <div 
                  className="dropdown-item"
                  onClick={() => handleNavigation('/companies/new')}
                >
                  <i className="dropdown-icon">➕</i>
                  <span>Crea</span>
                </div>
                <div 
                  className="dropdown-item"
                  onClick={() => handleNavigation('/companies/upload')}
                >
                  <i className="dropdown-icon">📤</i>
                  <span>Upload XLSX</span>
                </div>
              </div>
            )}
          </div>

          {isAdmin && (
            <div 
              className={`menu-item ${isActive('/users') ? 'active' : ''}`}
              onClick={() => handleNavigation('/users')}
            >
              <i className="menu-icon">👥</i>
              <span>Utenti</span>
              <i className="arrow-icon">▼</i>
            </div>
          )}
          
          {isAdmin && (
            <div>
              <div 
                className={`menu-item ${isActive('/attuatori') ? 'active' : ''}`}
                onClick={() => handleNavigation('/attuatori')}
              >
                <i className="menu-icon">🔄</i>
                <span>Attuatori</span>
                <i className="arrow-icon">▼</i>
              </div>
              <div className="menu-item-container">
                <div 
                  className={`menu-item ${isActive('/segnalatori') ? 'active' : ''}`}
                  onClick={toggleSegnalatoriDropdown}
                >
                  <i className="menu-icon">📢</i>
                  <span>Segnalatori SA</span>
                  <i className={`arrow-icon ${segnalatoriDropdownOpen ? 'open' : ''}`}>▼</i>
                </div>
                
                {segnalatoriDropdownOpen && (
                  <div className="dropdown-menu">
                    <div 
                      className="dropdown-item"
                      onClick={() => handleNavigation('/segnalatori')}
                    >
                      <i className="dropdown-icon">📋</i>
                      <span>Elenco</span>
                    </div>
                    <div 
                      className="dropdown-item"
                      onClick={() => handleNavigation('/segnalatori/new')}
                    >
                      <i className="dropdown-icon">➕</i>
                      <span>Crea</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


          <div className="menu-item-container">
            <div 
              className={`menu-item ${isActive('/abila') ? 'active' : ''}`}
              onClick={toggleAbilaDropdown}
            >
              <i className="menu-icon">📊</i>
              <span>Abila</span>
              <i className={`arrow-icon ${abilaDropdownOpen ? 'open' : ''}`}>▼</i>
            </div>
            
            {abilaDropdownOpen && (
              <div className="dropdown-menu">
                <div 
                  className="dropdown-item"
                  onClick={() => handleNavigation('/abila/avvia-progetto')}
                >
                  <i className="dropdown-icon">➕</i>
                  <span>Avvia un progetto</span>
                </div>
                <div 
                  className="dropdown-item"
                  onClick={() => handleNavigation('/abila/progetti')}
                >
                  <i className="dropdown-icon">📋</i>
                  <span>Elenco progetti</span>
                </div>
              </div>
            )}
          </div>


          <div className="menu-item-container">
            <div 
              className={`menu-item ${isActive('/analisi') ? 'active' : ''}`}
              onClick={toggleAnalisiDropdown}
            >
              <i className="menu-icon">📈</i>
              <span>Analisi</span>
              <i className={`arrow-icon ${analisiDropdownOpen ? 'open' : ''}`}>▼</i>
            </div>
            
            {analisiDropdownOpen && (
              <div className="dropdown-menu">
                <div 
                  className="dropdown-item"
                  onClick={() => handleNavigation('/analisi/crm')}
                >
                  <i className="dropdown-icon">💹</i>
                  <span>CRM</span>
                </div>
              </div>
            )}
          </div>


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
                <div 
                  className="dropdown-item"
                  onClick={() => handleNavigation('/fornitori')}
                >
                  <i className="dropdown-icon">📋</i>
                  <span>Elenco</span>
                </div>
                <div 
                  className="dropdown-item"
                  onClick={() => handleNavigation('/fornitori/crea')}
                >
                  <i className="dropdown-icon">➕</i>
                  <span>Crea</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;