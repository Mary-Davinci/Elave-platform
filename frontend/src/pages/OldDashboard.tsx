// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardStats, initializeDashboard } from '../services/dashboardService';
import { getUtilities } from '../services/utilityService';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

// Dashboard data interface
interface DashboardData {
  accounts: {
    proselitismo: {
      balance: number
    },
    servizi: {
      balance: number
    }
  },
  statistics: {
    companies: number,
    actuators: number,
    employees: number,
    suppliers: number,
    unreadMessages: number
  },
  projects: {
    requested: number,
    inProgress: number,
    completed: number
  }
}

interface Utility {
  _id: string;
  name: string;
  fileUrl: string;
  type: string;
  isPublic: boolean;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Initialize dashboard if needed
        try {
          await initializeDashboard();
        } catch (initError) {
          console.log('Dashboard may already be initialized');
        }
        
        // Get dashboard data
        const data = await getDashboardStats();
        setDashboardData(data);
        
        // Get utilities data
        const utilitiesData = await getUtilities();
        setUtilities(utilitiesData);
        
        setLoaded(true);
        setLoading(false);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard data. Please refresh the page.');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Handle navigation
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  // Show error state if data fetch failed
  if (error) {
    return (
      <div className="error-container">
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  // Get user's name for display
  const displayName = user?.username || user?.email?.split('@')[0] || 'User';

  return (
    <div className={`dashboard-page ${loaded ? 'loaded' : ''}`}>
      <div className="welcome-section"></div>   
      <div className="content-grid">
        <div className="accounts-section-div">
          <h1 className="welcome-header">Benvenuto {displayName}</h1>
          <div className="accounts-section">
            <div className="left-account">
              <div className="account-icon">
                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSI4IiB3aWR0aD0iMTgiIGhlaWdodD0iMTIiIHJ4PSIyIiBmaWxsPSJub25lIj48L3JlY3Q+PHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjQiIHJ4PSIyIiBmaWxsPSJub25lIj48L3JlY3Q+PHJlY3QgeD0iNyIgeT0iMTIiIHdpZHRoPSIxMCIgaGVpZ2h0PSI0IiByeD0iMSIgZmlsbD0ibm9uZSI+PC9yZWN0PjxwYXRoIGQ9Ik0xIDIwaDIyIiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMiI+PC9wYXRoPjwvc3ZnPg==" alt="Bank" className="account-icon-img" />
              </div>
              <div className="account-content">
                <h3 className="account-title">Conto proselitismo</h3>
                <div className="account-balance">€{dashboardData?.accounts.proselitismo.balance.toFixed(2) || '0.00'}</div>
                <button className="account-button" onClick={() => handleNavigation('/conto/proselitismo')}>
                  Accedi al conto 
                  <span className="arrow-circle">
                    <span className="arrow-right">→</span>
                  </span>
                </button>
              </div>
            </div>
            
            <div className="right-account">
              <div className="account-icon">
                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIyIiB5PSI1IiB3aWR0aD0iMjAiIGhlaWdodD0iMTQiIHJ4PSIyIiBmaWxsPSJub25lIj48L3JlY3Q+PGxpbmUgeDE9IjIiIHkxPSIxMCIgeDI9IjIyIiB5Mj0iMTAiPjwvbGluZT48bGluZSB4MT0iNyIgeTE9IjE1IiB4Mj0iMTIiIHkyPSIxNSI+PC9saW5lPjwvc3ZnPg==" alt="Card" className="account-icon-img" />
              </div>
              <div className="account-content">
                <h3 className="account-title">Conto servizi</h3>
                <div className="account-balance">€{dashboardData?.accounts.servizi.balance.toFixed(2) || '0.00'}</div>
                <button className="account-button" onClick={() => handleNavigation('/conto/servizi')}>
                  Accedi al conto 
                  <span className="arrow-circle">
                    <span className="arrow-right">→</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="stats-projects-container">
          <div>
            <h1 className="welcome-header">Statistiche</h1>
            
            <div className="stats-section">
              <div className="stat-row">
                <div className="stat-label">Aziende</div>
                <div className="stat-value green">{dashboardData?.statistics.companies || 0}</div>
              </div>

              {isAdmin && ( 
                <div className="stat-row">
                  <div className="stat-label">Attuatori</div>
                  <div className="stat-value green">{dashboardData?.statistics.actuators || 0}</div>
                </div>
              )}
              <div className="stat-row">
                <div className="stat-label">Dipendenti inseriti</div>
                <div className="stat-value">{dashboardData?.statistics.employees || 0}</div>
              </div>
              <div className="stat-row">
                <div className="stat-label">Fornitori</div>
                <div className="stat-value">{dashboardData?.statistics.suppliers || 0}</div>
              </div>
              <div className="stat-row">
                <div className="stat-label">Messaggi di posta non letti</div>
                <div className="stat-value">{dashboardData?.statistics.unreadMessages || 0}</div>
              </div>
            </div>
          </div>
          
          <div>
            <h1 className="welcome-header">Report</h1>
            
            <div className="projects-section">
              <div className="project-card-dash">
                <div className="project-number">{dashboardData?.projects.requested || 0}</div>
                <div className="project-title">Progetti richiesti</div>
              </div>
              
              <div className="project-card-dash">
                <div className="project-number">{dashboardData?.projects.inProgress || 0}</div>
                <div className="project-title">Progetti da concludere</div>
              </div>
              
              <div className="project-card-dash">
                <div className="project-number">{dashboardData?.projects.completed || 0}</div>
                <div className="project-title">Progetti conclusi</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="welcomingwords">
        <div className="notification-banner">
          <div className="notification-title">Benvenuti nel portale del nostro ente bilaterale.</div>
          <p>Ricordiamo a tutti i responsabili territoriali e responsabili di sportello lavoro che, per garantire la maturazione della competenza sui conti, è fondamentale che l'azienda sia registrata su questo portale e siano caricati in anagrafica i seguiti allegati:</p>
          <p>- Scheda adesione E.LAV.</p>
          <p>- Documento di identità del Legale Rappresentante</p>
          <p>- Elenco dei dipendenti in formato excel </p>
          <p>Vi invitiamo a procedere con la registrazione tempestivamente per assicurare la piena competenza e fruizione dei servizi offerti. Grazie per la collaborazione. </p>
        </div>
      </div>
      
      {/* New Utility and Quick Access Sections */}
      <div className="utility-quickaccess-container">
        <div className='Dowenload'>
          <h2 className="section-header">Download utilità</h2>
          <div className="utility-section">
            <ul className="utility-list">
              {utilities.length > 0 ? (
                utilities.map((utility) => (
                  <li key={utility._id} className="utility-item">
                    <span className="utility-icon">●</span>
                    <span className="utility-text">{utility.name}</span>
                    <a href={utility.fileUrl} download className="download-icon">↓</a>
                  </li>
                ))
              ) : (
                <li className="utility-item">
                  <span className="utility-text">No utilities available</span>
                </li>
              )}
            </ul>
            {!isAdmin && (
              <div className="utility-note">
                <p><small><i>Note: You can only view and download utilities.</i></small></p>
              </div>
            )}
          </div>
        </div>
        
        <div className='Addnew'>
          <h2 className="section-header">Accessi veloci</h2>
          <div className="quickaccess-section">
            <div className="quickaccess-buttons">
              <button className="quickaccess-button dark-green" onClick={() => handleNavigation('/companies/new')}>
                <span className="button-icon">📋</span>
                <span className="button-text">Nuova azienda</span>
              </button>
              
              <button className="quickaccess-button orange" onClick={() => handleNavigation('/projects/new')}>
                <span className="button-icon">🛡️</span>
                <span className="button-text">Nuovo progetto Abila</span>
              </button>
              
              <button className="quickaccess-button red" onClick={() => handleNavigation('/crm-analysis')}>
                <span className="button-icon">📊</span>
                <span className="button-text">Analisi CRM</span>
              </button>
              
              <button className="quickaccess-button navy" onClick={() => handleNavigation('/download/companies-template')}>
                <span className="button-icon">📁</span>
                <span className="button-text">Scarica file per upload massivo di aziende</span>
              </button>
              
              <button className="quickaccess-button orange" onClick={() => handleNavigation('/download/ccnl-template')}>
                <span className="button-icon">📄</span>
                <span className="button-text">Scarica file CCNL da abbinare alla colonna "M" del file di esempio aziende</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
