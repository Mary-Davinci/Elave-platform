// src/pages/CompanyDetail.tsx - Updated version
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCompanyById,
  getCompanyDocumentPreviewUrl,
  deleteCompanyDocument,
} from '../services/companyService';
import { getEmployeesByCompany } from '../services/employeeService';
import { Company, Employee } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';
import Employees from './Employees';
import '../styles/CompanyDetail.css';

type CompanyDocumentKey =
  | 'signedContractFile'
  | 'privacyNoticeFile'
  | 'legalRepresentativeDocumentFile'
  | 'chamberOfCommerceFile';

const CompanyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [companyEmployees, setCompanyEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees'>('dashboard');
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [pendingDocDelete, setPendingDocDelete] = useState<{ key: CompanyDocumentKey; label: string } | null>(null);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const isAdminUser = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchCompanyData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch company details
        const companyData = await getCompanyById(id);
        setCompany(companyData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching company data:', err);
        setError('Failed to load company data');
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [id, isAuthenticated, navigate]);

  // Load employees when switching to employees tab
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!id || activeTab !== 'employees') return;
      
      try {
        setEmployeesLoading(true);
        const employeesData = await getEmployeesByCompany(id);
        setCompanyEmployees(employeesData);
      } catch (err) {
        console.error('Error fetching employees:', err);
        // Don't set error here - let the Employees component handle it
      } finally {
        setEmployeesLoading(false);
      }
    };

    fetchEmployees();
  }, [id, activeTab]);

  useEffect(() => {
    const loadDocumentUrls = async () => {
      if (!id || !company?.companyDocuments) {
        setDocumentUrls({});
        return;
      }

      const keys = [
        'signedContractFile',
        'privacyNoticeFile',
        'legalRepresentativeDocumentFile',
        'chamberOfCommerceFile',
      ] as const;

      const entries = await Promise.all(
        keys.map(async (key) => {
          if (!company.companyDocuments?.[key]) return [key, ''] as const;
          try {
            const url = await getCompanyDocumentPreviewUrl(id, key);
            return [key, url] as const;
          } catch {
            return [key, ''] as const;
          }
        })
      );

      setDocumentUrls(Object.fromEntries(entries));
    };

    loadDocumentUrls();
  }, [company, id]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Caricamento dettagli azienda...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="error-container">
        <h2>Si è verificato un errore</h2>
        <p>{error || 'Company not found'}</p>
        <button onClick={() => navigate('/companies')}>Torna alle aziende</button>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const companyDocuments: Array<{
    key: CompanyDocumentKey;
    label: string;
    file: any;
  }> = [
    {
      key: 'signedContractFile',
      label: 'Contratto firmato',
      file: company.companyDocuments?.signedContractFile,
    },
    {
      key: 'privacyNoticeFile',
      label: 'Informativa privacy',
      file: company.companyDocuments?.privacyNoticeFile,
    },
    {
      key: 'legalRepresentativeDocumentFile',
      label: 'Documento legale rappresentante',
      file: company.companyDocuments?.legalRepresentativeDocumentFile,
    },
    {
      key: 'chamberOfCommerceFile',
      label: 'Visura camerale',
      file: company.companyDocuments?.chamberOfCommerceFile,
    },
  ];

  const handleDeleteDocument = async (documentKey: CompanyDocumentKey, label: string) => {
    if (!isAdminUser) return;
    setPendingDocDelete({ key: documentKey, label });
  };

  const confirmDeleteDocument = async () => {
    if (!id || !pendingDocDelete || deletingDoc) return;
    const { key } = pendingDocDelete;
    if (!isAdminUser) return;
    try {
      setDeletingDoc(true);
      await deleteCompanyDocument(id, key);
      setCompany((prev) => {
        if (!prev) return prev;
        const next = { ...(prev as any) };
        next.companyDocuments = { ...(prev.companyDocuments || {}) };
        delete next.companyDocuments[key];
        return next;
      });
      setDocumentUrls((prev) => ({ ...prev, [key]: '' }));
      setPendingDocDelete(null);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Errore durante eliminazione documento.');
    } finally {
      setDeletingDoc(false);
    }
  };

  return (
    <div className="company-detail-container">
      <h1 className="page-title">{company.businessName}</h1>
      
      <div className="company-info-card">
        <div className="company-header">
          <div className="company-name-section">
            <h2>{company.businessName}</h2>
            <p className="active-status">Attiva dal {company.createdAt ? formatDate(company.createdAt) : 'N/A'}</p>
            <div className="financial-info">
              <p>Totale versato: {/*company.totalPaid ||*/ '0,00'} €</p>
              <p>Totale ricevuto: {/*company.totalReceived || */'0,00'} €</p>
            </div>
          </div>
        </div>
        
        <div className="company-details-grid">
          <div className="details-section">
            <h3>Dettagli</h3>
            <ul className="details-list">
              <li>
                <span className="icon">📍</span>
                <span className="label">{company.address?.street || ''}, {company.address?.postalCode || ''}, {company.address?.city || ''} ({company.address?.province || ''})</span>
              </li>
              <li>
                <span className="icon">🏢</span>
                <span className="label">Partita IVA: {company.vatNumber}</span>
              </li>
              <li>
                <span className="icon">📝</span>
                <span className="label">Codice Fiscale: {company.fiscalCode}</span>
              </li>
              <li>
                <span className="icon">🔢</span>
                <span className="label">Matricola INPS: {company.inpsCode}</span>
              </li>
            </ul>
          </div>
          
          <div className="contacts-section">
            <h3>Anagrafica</h3>
            <ul className="contacts-list">
              <li>
                <span className="icon">📱</span>
                <span className="label">Cellulare: {company.contactInfo?.mobile || 'N/A'}</span>
              </li>
              <li>
                <span className="icon">☎️</span>
                <span className="label">Telefono: {company.contactInfo?.phoneNumber || 'N/A'}</span>
              </li>
              <li>
                <span className="icon">📧</span>
                <span className="label">Email: {company.contactInfo?.email || 'N/A'}</span>
              </li>
              <li>
                <span className="icon">📨</span>
                <span className="label">PEC: {company.contactInfo?.pec || 'N/A'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`tab ${activeTab === 'employees' ? 'active' : ''}`}
              onClick={() => setActiveTab('employees')}
            >
              Dipendenti
            </button>
          </div>
          
          <div className="tab-content">
            {activeTab === 'dashboard' && (
              <div className="dashboard-content">
                <div className="dashboard-stats">
                  <div className="stat-card">
                    <h4>Totale Dipendenti</h4>
                    <p className="stat-value">{companyEmployees.length || company.employees || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h4>CCNL</h4>
                    <p className="stat-value">{company.contractDetails?.ccnlType || 'N/A'}</p>
                  </div>
                  <div className="stat-card">
                    <h4>Ente Bilaterale</h4>
                    <p className="stat-value">{company.contractDetails?.bilateralEntity || 'N/A'}</p>
                  </div>
                  <div className="stat-card">
                    <h4>Dipendenti Attivi</h4>
                    <p className="stat-value">{companyEmployees.filter(emp => emp.stato === 'attivo').length}</p>
                  </div>
                </div>
                
                {/* Additional dashboard content can be added here */}
                <div className="dashboard-additional">
                  <div className="info-section">
                    <h4>Informazioni Contrattuali</h4>
                    <ul>
                      <li><strong>Tipo Contratto:</strong> {company.contractDetails?.contractType || 'N/A'}</li>
                      <li><strong>Fondo Sani:</strong> {company.contractDetails?.hasFondoSani ? 'Sì' : 'No'}</li>
                      <li><strong>EBAP:</strong> {company.contractDetails?.useEbapPayment ? 'Sì' : 'No'}</li>
                      <li><strong>Settore:</strong> {company.industry || 'N/A'}</li>
                    </ul>
                  </div>
                  <div className="info-section company-documents-section">
                    <h4>Documenti azienda</h4>
                    <ul className="company-documents-list">
                      {companyDocuments.map((item) => {
                        const url = documentUrls[item.key] || null;
                        return (
                          <li key={item.key}>
                            <strong>{item.label}:</strong>{' '}
                            {url ? (
                              <>
                                <a href={url} target="_blank" rel="noreferrer">
                                  {item.file?.originalName || 'Scarica documento'}
                                </a>
                                {isAdminUser && (
                                  <button
                                    type="button"
                                    className="bin-button"
                                    onClick={() => handleDeleteDocument(item.key, item.label)}
                                    aria-label={`Elimina ${item.label}`}
                                    title={`Elimina ${item.label}`}
                                  >
                                    <svg
                                      className="bin-top"
                                      viewBox="0 0 39 7"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <line y1="5" x2="39" y2="5" stroke="white" strokeWidth="4" />
                                      <line x1="12" y1="1.5" x2="26.0357" y2="1.5" stroke="white" strokeWidth="3" />
                                    </svg>
                                    <svg
                                      className="bin-bottom"
                                      viewBox="0 0 33 39"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <mask id="path-1-inside-1_8_19" fill="white">
                                        <path d="M2 5H31V35.5C31 37.433 29.433 39 27.5 39H5.5C3.567 39 2 37.433 2 35.5V5Z" />
                                      </mask>
                                      <path
                                        d="M2 5H31H2ZM32 5V35.5C32 37.985 29.985 40 27.5 40H5.5C3.015 40 1 37.985 1 35.5V5H3V35.5C3 36.881 4.119 38 5.5 38H27.5C28.881 38 30 36.881 30 35.5V5H32Z"
                                        fill="white"
                                        mask="url(#path-1-inside-1_8_19)"
                                      />
                                      <path d="M12 11L12 31" stroke="white" strokeWidth="4" />
                                      <path d="M21 11L21 31" stroke="white" strokeWidth="4" />
                                    </svg>
                                    <svg
                                      className="garbage"
                                      viewBox="0 0 14 16"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M6.5 1L7.5 1L8 2H12V3.5H2V2H6L6.5 1ZM3.2 5H10.8L10.2 14.2C10.15 14.95 9.52 15.5 8.76 15.5H5.24C4.48 15.5 3.85 14.95 3.8 14.2L3.2 5Z"
                                        fill="white"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </>
                            ) : (
                              <span>Non caricato</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'employees' && (
              <div className="employees-content">
                {employeesLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    Caricamento dipendenti...
                  </div>
                ) : (
                  <Employees 
                    companyId={company._id} 
                    employees={companyEmployees}
                  />
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="action-buttons">
          <button 
            className="edit-company-button"
            onClick={() => navigate(`/companies/edit/${company._id}`)}
          >
            ✏️ Modifica Azienda
          </button>
        </div>
        
        {/* Button at the bottom of page to edit company - matches your screenshot */}
        {activeTab === 'employees' && (
          <div className="edit-company-floating-button">
            <button onClick={() => navigate(`/companies/edit/${company._id}`)}>
              <span className="edit-icon">✏️</span> Modifica Azienda
            </button>
          </div>
        )}
      </div>
      {pendingDocDelete && (
        <div className="company-confirm-modal-overlay" onClick={() => !deletingDoc && setPendingDocDelete(null)}>
          <div className="company-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="company-confirm-modal-title">Conferma eliminazione documento</h3>
            <p className="company-confirm-modal-text">
              Vuoi eliminare il documento <strong>{pendingDocDelete.label}</strong>?
            </p>
            <p className="company-confirm-modal-note">
              L'operazione rimuove il file dal bucket e dal database.
            </p>
            <div className="company-confirm-modal-actions">
              <button type="button" className="company-confirm-modal-cancel" onClick={() => setPendingDocDelete(null)} disabled={deletingDoc}>
                Annulla
              </button>
              <button type="button" className="company-confirm-modal-danger" onClick={confirmDeleteDocument} disabled={deletingDoc}>
                {deletingDoc ? 'Elimino...' : 'Conferma eliminazione'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDetail;
