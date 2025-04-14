// src/pages/CompanyDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCompanyById } from '../services/companyService';
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

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchCompanyData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await getCompanyById(id);
        setCompany(data);
        
        // In a real application, you would fetch employees here
        // For now, we're using an empty array which will be populated by the Employees component
        // Example API call would be:
        // const employeesData = await getEmployeesByCompanyId(id);
        // setCompanyEmployees(employeesData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching company data:', err);
        setError('Failed to load company data');
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [id, isAuthenticated, navigate]);

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
                    <p className="stat-value">{company.employees || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h4>CCNL</h4>
                    <p className="stat-value">{company.contractDetails?.ccnlType || 'N/A'}</p>
                  </div>
                  <div className="stat-card">
                    <h4>Ente Bilaterale</h4>
                    <p className="stat-value">{company.contractDetails?.bilateralEntity || 'N/A'}</p>
                  </div>
                </div>
                
                {/* Additional dashboard content can be added here */}
              </div>
            )}
            
            {activeTab === 'employees' && (
              <div className="employees-content">
                <Employees 
                  companyId={company._id} 
                  employees={companyEmployees}
                />
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