import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCompanies } from '../services/companyService';
import { createProjectsFromTemplates } from '../services/projectService';
import '../styles/ProjectDetails.css';

interface SelectedTemplate {
  projectId: string;
  quantity: number;
  code?: string;
  title?: string;
  minPrice?: number;
  maxPrice?: number;
}

interface Company {
  _id: string;
  businessName: string;
  companyName: string;
  vatNumber: string;
}

const ProjectDetails: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get selected templates from location state
  const selectedTemplates: SelectedTemplate[] = location.state?.selectedTemplates || [];
  
  // Check if we have selected templates
  useEffect(() => {
    if (!selectedTemplates || selectedTemplates.length === 0) {
      navigate('/abila/avvia-progetto');
    }
  }, [selectedTemplates, navigate]);
  
  // Load companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const data = await getCompanies();
        setCompanies(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching companies:', err);
        setError('Impossibile caricare le aziende. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompanies();
  }, []);
  
  // Calculate total
  const calculateTotal = () => {
    return selectedTemplates.reduce((total, template) => {
      const price = template.minPrice || 0;
      return total + (price * template.quantity);
    }, 0);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany) {
      setError('Seleziona un\'azienda prima di procedere');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Format template data for API
      const templateData = selectedTemplates.map(template => ({
        projectId: template.projectId,
        quantity: template.quantity
      }));
      
      // Create projects
      const result = await createProjectsFromTemplates(templateData, selectedCompany);
      
      // Show success message
      alert(`${result.length} progetti creati con successo!`);
      
      // Navigate to projects list
      navigate('/projects');
    } catch (err: any) {
      console.error('Error creating projects:', err);
      setError(err.message || 'Si è verificato un errore durante la creazione dei progetti');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Caricamento...</p>
      </div>
    );
  }
  
  return (
    <div className="project-details-container">
      <header className="page-header">
        <h1>Dettagli Progetto</h1>
        <p className="subtitle">Seleziona l'azienda e conferma i dettagli</p>
      </header>
      
      {error && (
        <div className="error-alert">
          <p>{error}</p>
        </div>
      )}
      
      <div className="details-form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>Seleziona l'azienda</h2>
            <div className="form-group">
              <label htmlFor="company">Azienda <span className="required">*</span></label>
              <select 
                id="company"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                required
                className="form-select"
              >
                <option value="">Seleziona un'azienda</option>
                {companies.map(company => (
                  <option key={company._id} value={company._id}>
                    {company.businessName} - {company.vatNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-section">
            <h2>Riepilogo Progetti Selezionati</h2>
            <div className="selected-projects-table">
              <table>
                <thead>
                  <tr>
                    <th>Codice</th>
                    <th>Titolo</th>
                    <th>Prezzo</th>
                    <th>Quantità</th>
                    <th>Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTemplates.map((template, index) => (
                    <tr key={index}>
                      <td>{template.code}</td>
                      <td>{template.title}</td>
                      <td>{template.minPrice?.toLocaleString('it-IT')} €</td>
                      <td>{template.quantity}</td>
                      <td>{((template.minPrice || 0) * template.quantity).toLocaleString('it-IT')} €</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="total-label">Totale</td>
                    <td className="total-value">{calculateTotal().toLocaleString('it-IT')} €</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="back-button"
              onClick={() => navigate('/abila/avvia-progetto')}
            >
              Torna alla selezione
            </button>
            <button 
              type="submit" 
              className="submit-button"
              disabled={submitting || !selectedCompany}
            >
              {submitting ? 'Creazione in corso...' : 'Crea Progetti'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectDetails;