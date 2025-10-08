// src/pages/Dashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardStats, initializeDashboard } from '../services/dashboardService';
import { getUtilities, uploadUtility, deleteUtility } from '../services/utilityService';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';
import Alert from './alert';

// Dashboard data interface
interface DashboardData {
  accounts: {
    proselitismo: { balance: number };
    servizi: { balance: number };
  };
  statistics: {
    companies: number;
    actuators: number;
    employees: number;
    suppliers: number;
    unreadMessages: number;
    segnalatori: number;

  };
  projects: {
    requested: number;
    inProgress: number;
    completed: number;
  };
}

interface Utility {
  [x: string]: string;
  _id: string;
  name: string;
  fileUrl: string;
  type: string;
  isPublic: string;
  category: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utilFileInputRef = useRef<HTMLInputElement>(null);
  const materialFileInputRef = useRef<HTMLInputElement>(null);
  const SalutaFileInputRef = useRef<HTMLInputElement>(null);

  const [loaded, setLoaded] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Alert state
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [utilityToDelete, setUtilityToDelete] = useState<{ id: string; name: string } | null>(null);

  // Roles / capabilities for REPORT buttons
  const role = user?.role ?? '';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const showReportAzienda =
    role === 'responsabile_territoriale' || role === 'sportello_lavoro' || isAdmin;
  const showReportSportello =
    role === 'responsabile_territoriale' || isAdmin; // NOT for sportello_lavoro
  const showReportSegnalatori =
    role === 'responsabile_territoriale' || role === 'sportello_lavoro' || isAdmin;
  const showReportResponsabile =
    role === 'admin' || role === 'super_admin' || isAdmin;

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

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('category', 'utilita');
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('type', file.type || 'application/octet-stream');
      formData.append('isPublic', 'true');

      const newUtility = await uploadUtility(formData);
      setUtilities((prev) => [...prev, newUtility]);

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error uploading file:', err);
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handlechecklistUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('category', 'checklist');
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('type', file.type || 'application/octet-stream');
      formData.append('isPublic', 'true');

      const newUtility = await uploadUtility(formData);
      setUtilities((prev) => [...prev, newUtility]);

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error uploading file:', err);
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleMaterialUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('category', 'Materiale');
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('type', file.type || 'application/octet-stream');
      formData.append('isPublic', 'true');

      const newUtility = await uploadUtility(formData);
      setUtilities((prev) => [...prev, newUtility]);

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error uploading file:', err);
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handlesalutaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('category', 'saluta');
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('type', file.type || 'application/octet-stream');
      formData.append('isPublic', 'true');

      const newUtility = await uploadUtility(formData);
      setUtilities((prev) => [...prev, newUtility]);

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error uploading file:', err);
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Handle delete button click - show alert
  const handleDeleteClick = (utilityId: string, utilityName: string) => {
    setUtilityToDelete({ id: utilityId, name: utilityName });
    setShowDeleteAlert(true);
  };

  // Handle confirmed delete
  const handleConfirmDelete = async () => {
    if (!utilityToDelete) return;

    setDeleting(utilityToDelete.id);
    setDeleteError(null);

    try {
      await deleteUtility(utilityToDelete.id);
      setUtilities((prev) => prev.filter((u) => u._id !== utilityToDelete.id));
    } catch (err) {
      console.error('Error deleting file:', err);
      setDeleteError('Failed to delete file. Please try again.');
    } finally {
      setDeleting(null);
      setUtilityToDelete(null);
    }
  };

  // Handle alert close
  const handleAlertClose = () => {
    setShowDeleteAlert(false);
    setUtilityToDelete(null);
  };

  // Handle upload button click
  const handleUploadClick = () => fileInputRef.current?.click();
  const handleUploadClickUtil = () => utilFileInputRef.current?.click();
  const handleUploadClickmat = () => materialFileInputRef.current?.click();
  const handleUploadClicksaluta = () => SalutaFileInputRef.current?.click();

  // Handle file download
  const handleDownload = (utility: Utility) => {
    const link = document.createElement('a');
    link.href = utility.fileUrl;
    link.download = utility.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle navigation
  const handleNavigation = (path: string) => navigate(path);

  // Loading / error states
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

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
                <img
                  src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMiIgc3Rya2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjgiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxMiIgcng9IjIiIGZpbGw9Im5vbmUiPjwvcmVjdD48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iMTYiIGhlaWdodD0iNCIgcng9IjIiIGZpbGw9Im5vbmUiPjwvcmVjdD48cmVjdCB4PSI3IiB5PSIxMiIgd2lkdGg9IjEwIiBoZWlnaHQ9IjQiIHJ4PSIxIiBmaWxsPSJub25lIj48L3JlY3Q+PHBhdGggZD0iTSAxIDIwaDIyIiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMiI+PC9wYXRoPjwvc3ZnPg=="
                  alt="Bank"
                  className="account-icon-img"
                />
              </div>
              <div className="account-content">
                <h3 className="account-title">Conto proselitismo</h3>
                <div className="account-balance">
                  €{dashboardData?.accounts.proselitismo.balance.toFixed(2) || '0.00'}
                </div>
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
                <img
                  src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMiIgc3Rya2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjIiIHk9IjUiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxNCIgcng9IjIiIGZpbGw9Im5vbmUiPjwvcmVjdD48bGluZSB4MT0iMiIgeTE9IjEwIiB4Mj0iMjIiIHkyPSIxMCI+PC9saW5lPjxsaW5lIHgxPSI3IiB5MT0iMTUiIHgyPSIxMiIgeTI9IjE1Ij48L2xpbmU+PC9zdmc+"
                  alt="Card"
                  className="account-icon-img"
                />
              </div>
              <div className="account-content">
                <h3 className="account-title">Conto servizi</h3>
                <div className="account-balance">
                  €{dashboardData?.accounts.servizi.balance.toFixed(2) || '0.00'}
                </div>
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
              


                <div>
                <div className="stat-row">
  <div className="stat-label">Responsabili Territoriali</div>
  <div className="stat-value">{dashboardData?.statistics.suppliers || 0}</div>
</div>

<div className="stat-row">
  <div className="stat-label">Sportelli Lavoro</div>
  <div className="stat-value">{dashboardData?.statistics.actuators || 0}</div>
</div>

<div className="stat-row">
  <div className="stat-label">Segnalatori</div>
  <div className="stat-value">{dashboardData?.statistics.segnalatori || 0}</div>
</div>
</div>
          
            </div>
          </div>

          <div>
            <h1 className="welcome-header">Report</h1>

            <div className="projects-section">
              {showReportAzienda && (
                <div className="project-card-dash" onClick={() => handleNavigation('/companies/new')}>
                  <div className="project-title">+ Aggiungi Nuova azienda</div>
                </div>
              )}
                {showReportResponsabile && (
                <div className="project-card-dash" onClick={() => handleNavigation('/agenti')}>
                <div className="project-title">+ Aggiungi Nuovo Rersponsabili Territoriali </div>
             </div>
)}
              {showReportSegnalatori && (
                <div className="project-card-dash" onClick={() => handleNavigation('/segnalatori/new')}>
                  <div className="project-title">+ Aggiungi Nuovo segnalatori</div>
                </div>
              )}

              {showReportSportello && (
                <div className="project-card-dash" onClick={() => handleNavigation('/sportello-lavoro/new')}>
                  <div className="project-title">+ Aggiungi Nuovo sportello lavoro</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="welcomingwords">
        <div className="notification-banner">
          <div className="notification-title">Benvenuti nel portale del nostro ente bilaterale.</div>
          <p>
            Ricordiamo a tutti i responsabili territoriali e responsabili di sportello lavoro che, per garantire la
            maturazione della competenza sui conti, è fondamentale che l'azienda sia registrata su questo portale e siano
            caricati in anagrafica i seguiti allegati:
          </p>
          <p>- Scheda adesione E.LAV.</p>
          <p>- Documento di identità del Legale Rappresentante</p>
          <p>- Elenco dei dipendenti in formato excel </p>
          <p>
            Vi invitiamo a procedere con la registrazione tempestivamente per assicurare la piena competenza e fruizione dei
            servizi offerti. Grazie per la collaborazione.
          </p>
        </div>
      </div>

      {/* New Utility and Quick Access Sections */}
      <div className="utility-quickaccess-container">
        <div className="Dowenload">
          <h2 className="section-header">Download utilità</h2>
          <div className="utility-section">
            <div className="utility-header">
              {isAdmin && (
                <div className="upload-section">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                  />
                  <button className="upload-button" onClick={handleUploadClick} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </button>
                  {uploadError && (
                    <div className="upload-error">
                      <span className="error-text">{uploadError}</span>
                    </div>
                  )}
                  {deleteError && (
                    <div className="upload-error">
                      <span className="error-text">{deleteError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <ul className="utility-list">
              {utilities.filter((u) => u.category === 'utilita').length > 0 ? (
                utilities
                  .filter((u) => u.category === 'utilita')
                  .map((utility) => (
                    <li key={utility._id} className="utility-item">
                      <span className="utility-icon">●</span>
                      <span className="utility-text">{utility.name}</span>
                      <div className="utility-actions">
                        <button className="download-icon" onClick={() => handleDownload(utility)} title="Download file">
                          ↓
                        </button>
                        {isAdmin && (
                          <button
                            className="delete-icon"
                            onClick={() => handleDeleteClick(utility._id, utility.name)}
                            disabled={deleting === utility._id}
                            title="Delete file"
                          >
                            {deleting === utility._id ? '...' : '×'}
                          </button>
                        )}
                      </div>
                    </li>
                  ))
              ) : (
                <div className="no-utilities">
                  <p>No utilities available yet.</p>
                  {isAdmin && <p>Click "Upload File" to add your first utility.</p>}
                </div>
              )}
            </ul>

            {!isAdmin && (
              <div className="utility-note">
                <p>
                  <small>
                    <i>Note: You can only view and download utilities.</i>
                  </small>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="Dowenload">
          <h2 className="section-header">Materiale Commerciale</h2>
          <div className="utility-section">
            <div className="utility-header">
              {isAdmin && (
                <div className="upload-section">
                  <input
                    type="file"
                    ref={materialFileInputRef}
                    onChange={handleMaterialUpload}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                  />
                  <button className="upload-button" onClick={handleUploadClickmat} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </button>
                  {uploadError && (
                    <div className="upload-error">
                      <span className="error-text">{uploadError}</span>
                    </div>
                  )}
                  {deleteError && (
                    <div className="upload-error">
                      <span className="error-text">{deleteError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <ul className="utility-list">
              {utilities.filter((u) => u.category === 'Materiale').length > 0 ? (
                utilities
                  .filter((u) => u.category === 'Materiale')
                  .map((utility) => (
                    <li key={utility._id} className="utility-item">
                      <span className="utility-icon">●</span>
                      <span className="utility-text">{utility.name}</span>
                      <div className="utility-actions">
                        <button className="download-icon" onClick={() => handleDownload(utility)} title="Download file">
                          ↓
                        </button>
                        {isAdmin && (
                          <button
                            className="delete-icon"
                            onClick={() => handleDeleteClick(utility._id, utility.name)}
                            disabled={deleting === utility._id}
                            title="Delete file"
                          >
                            {deleting === utility._id ? '...' : '×'}
                          </button>
                        )}
                      </div>
                    </li>
                  ))
              ) : (
                <div className="no-utilities">
                  <p>No utilities available yet.</p>
                  {isAdmin && <p>Click "Upload File" to add your first utility.</p>}
                </div>
              )}
            </ul>

            {!isAdmin && (
              <div className="utility-note">
                <p>
                  <small>
                    <i>Note: You can only view and download utilities.</i>
                  </small>
                </p>
              </div>
            )}
          </div>

          <div className="Dowenload" style={{ width: '100%' }}>
            <h2 className="section-header">Salute Amica</h2>
            <div className="utility-section">
              <div className="utility-header">
                {isAdmin && (
                  <div className="upload-section">
                    <input
                      type="file"
                      ref={SalutaFileInputRef}
                      onChange={handlesalutaUpload}
                      style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                    />
                    <button className="upload-button" onClick={handleUploadClicksaluta} disabled={uploading}>
                      {uploading ? 'Uploading...' : 'Upload File'}
                    </button>
                    {uploadError && (
                      <div className="upload-error">
                        <span className="error-text">{uploadError}</span>
                      </div>
                    )}
                    {deleteError && (
                      <div className="upload-error">
                        <span className="error-text">{deleteError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <ul className="utility-list">
                {utilities.filter((u) => u.category === 'saluta').length > 0 ? (
                  utilities
                    .filter((u) => u.category === 'saluta')
                    .map((utility) => (
                      <li key={utility._id} className="utility-item">
                        <span className="utility-icon">●</span>
                        <span className="utility-text">{utility.name}</span>
                        <div className="utility-actions">
                          <button className="download-icon" onClick={() => handleDownload(utility)} title="Download file">
                            ↓
                          </button>
                          {isAdmin && (
                            <button
                              className="delete-icon"
                              onClick={() => handleDeleteClick(utility._id, utility.name)}
                              disabled={deleting === utility._id}
                              title="Delete file"
                            >
                              {deleting === utility._id ? '...' : '×'}
                            </button>
                          )}
                        </div>
                      </li>
                    ))
                ) : (
                  <div className="no-utilities">
                    <p>No utilities available yet.</p>
                    {isAdmin && <p>Click "Upload File" to add your first utility.</p>}
                  </div>
                )}
              </ul>

              {!isAdmin && (
                <div className="utility-note">
                  <p>
                    <small>
                      <i>Note: You can only view and download utilities.</i>
                    </small>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="Dowenload">
          <h2 className="section-header">Checklist Documentazione</h2>
          <div className="utility-section">
            <div className="utility-header">
              {isAdmin && (
                <div className="upload-section">
                  <input
                    type="file"
                    ref={utilFileInputRef}
                    onChange={handlechecklistUpload}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                  />
                  <button className="upload-button" onClick={handleUploadClickUtil} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </button>
                  {uploadError && (
                    <div className="upload-error">
                      <span className="error-text">{uploadError}</span>
                    </div>
                  )}
                  {deleteError && (
                    <div className="upload-error">
                      <span className="error-text">{deleteError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <ul className="utility-list">
              {utilities.filter((u) => u.category === 'checklist').length > 0 ? (
                utilities
                  .filter((u) => u.category === 'checklist')
                  .map((utility) => (
                    <li key={utility._id} className="utility-item">
                      <span className="utility-icon">●</span>
                      <span className="utility-text">{utility.name}</span>
                      <div className="utility-actions">
                        <button className="download-icon" onClick={() => handleDownload(utility)} title="Download file">
                          ↓
                        </button>
                        {isAdmin && (
                          <button
                            className="delete-icon"
                            onClick={() => handleDeleteClick(utility._id, utility.name)}
                            disabled={deleting === utility._id}
                            title="Delete file"
                          >
                            {deleting === utility._id ? '...' : '×'}
                          </button>
                        )}
                      </div>
                    </li>
                  ))
              ) : (
                <div className="no-utilities">
                  <p>No utilities available yet.</p>
                  {isAdmin && <p>Click "Upload File" to add your first utility.</p>}
                </div>
              )}
            </ul>

            {!isAdmin && (
              <div className="utility-note">
                <p>
                  <small>
                    <i>Note: You can only view and download utilities.</i>
                  </small>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Alert */}
      <Alert
        isOpen={showDeleteAlert}
        onClose={handleAlertClose}
        onConfirm={handleConfirmDelete}
        title="Conferma eliminazione"
        message={`Sei sicuro di voler eliminare "${utilityToDelete?.name}"? Questa azione non può essere annullata.`}
        type="warning"
        confirmText="Elimina"
        cancelText="Annulla"
        showCancel={true}
      />
    </div>
  );
};

export default Dashboard;
