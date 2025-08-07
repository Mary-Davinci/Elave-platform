// src/pages/CompanyDetail.tsx - Updated version
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCompanyById } from '../services/companyService';
import { getEmployeesByCompany } from '../services/employeeService';
import { Company, Employee } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';
import Employees from './Employees';
import '../styles/CompanyDetail.css';

const CompanyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [companyEmployees, setCompanyEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees'>('dashboard');
  const [employeesLoading, setEmployeesLoading] = useState(false);

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
                <span className="label">Codice INPS: {company.inpsCode}</span>
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
    </div>
  );
};

export default CompanyDetail;