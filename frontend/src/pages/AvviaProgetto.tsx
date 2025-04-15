import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProjectTemplates, ProjectTemplate, createProjectsFromTemplates } from '../services/projectService';
import { getCompanies } from '../services/companyService';
import '../styles/ativ.css';

const AvviaProgetto: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<{ [key: string]: number }>({});
  

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const data = await getProjectTemplates();
        setTemplates(data);
        setFilteredTemplates(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching project templates:', err);
        setError('Impossibile caricare i progetti. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  
  useEffect(() => {
    let result = templates;
    
    // Apply category filter
    if (selectedCategory) {
      result = result.filter(template => template.category === selectedCategory);
    }
    
    // Apply subcategory filter
    if (selectedSubcategory) {
      result = result.filter(template => template.subcategory === selectedSubcategory);
    }
    
    // Apply type filter
    if (selectedType) {
      result = result.filter(template => template.type === selectedType);
    }
    
    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(template => 
        template.code.toLowerCase().includes(term) || 
        template.title.toLowerCase().includes(term) || 
        template.description.toLowerCase().includes(term)
      );
    }
    
    setFilteredTemplates(result);
  }, [templates, selectedCategory, selectedSubcategory, selectedType, searchTerm]);

  // Get unique values for filters
  const getUniqueCategories = () => {
    return [...new Set(templates.map(t => t.category))].filter(Boolean) as string[];
  };
  
  const getUniqueSubcategories = () => {
    return [...new Set(templates.map(t => t.subcategory))].filter(Boolean) as string[];
  };
  
  const getUniqueTypes = () => {
    return [...new Set(templates.map(t => t.type))].filter(Boolean) as string[];
  };

  // Handle template selection
  const handleSelectTemplate = (templateId: string, quantity: number) => {
    if (quantity > 0) {
      setSelectedTemplates({
        ...selectedTemplates,
        [templateId]: quantity
      });
    } else {
      const updated = { ...selectedTemplates };
      delete updated[templateId];
      setSelectedTemplates(updated);
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    // Check if any template is selected
    if (Object.keys(selectedTemplates).length === 0) {
      alert('Seleziona almeno un progetto prima di procedere');
      return;
    }
    
    // Collect selected templates' data
    const selectedItems = Object.keys(selectedTemplates).map(templateId => {
      const template = templates.find(t => t._id === templateId);
      return {
        projectId: templateId,
        quantity: selectedTemplates[templateId],
        code: template?.code,
        title: template?.title,
        minPrice: template?.minPrice,
        maxPrice: template?.maxPrice
      };
    });
    
    // Navigate to the company selection page with the selected templates
    navigate('/projects/new', { state: { selectedTemplates: selectedItems } });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedType('');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Caricamento progetti...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Si è verificato un errore</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Riprova</button>
      </div>
    );
  }

  return (
    <div className="avvia-progetto-container">
      <header className="page-header">
        <h1>Abila</h1>
        <p className="subtitle">Seleziona i progetti da avviare</p>
      </header>

      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Categorie</label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              <option value="">Scegli le categorie</option>
              {getUniqueCategories().map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Sottocategorie</label>
            <select 
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              className="filter-select"
            >
              <option value="">Scegli le sottocategorie</option>
              {getUniqueSubcategories().map(subcategory => (
                <option key={subcategory} value={subcategory}>{subcategory}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Tipologie</label>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="filter-select"
            >
              <option value="">Scegli le tipologie</option>
              {getUniqueTypes().map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="search-group">
            <input
              type="text"
              placeholder="Cerca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="action-buttons">
          <button 
            className="proceed-button"
            onClick={handleSubmit}
          >
            Procedi con la richiesta
          </button>
          
          <button 
            className="reset-filters-button"
            onClick={handleResetFilters}
          >
            Reset filtri
          </button>
        </div>
      </div>

      <div className="projects-table-container">
        <table className="projects-table">
          <thead>
            <tr>
              <th className="select-column"></th>
              <th>Codice</th>
              <th className="description-column">Descrizione</th>
              <th>Prezzo min</th>
              <th>Prezzo max</th>
              <th>Quantità</th>
            </tr>
          </thead>
          <tbody>
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map(template => (
                <tr key={template._id}>
                  <td className="select-column">
                    <input 
                      type="checkbox"
                      checked={!!selectedTemplates[template._id]}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSelectTemplate(template._id, 1);
                        } else {
                          handleSelectTemplate(template._id, 0);
                        }
                      }}
                    />
                  </td>
                  <td className="code-column">
                    <strong>{template.code}</strong>
                    <div className="template-title">{template.title}</div>
                    <div className="template-description-mobile">{template.description}</div>
                  </td>
                  <td className="description-column">{template.description}</td>
                  <td className="price-column">{template.minPrice.toLocaleString('it-IT')} €</td>
                  <td className="price-column">{template.maxPrice.toLocaleString('it-IT')} €</td>
                  <td className="quantity-column">
                    <input 
                      type="number"
                      min="0"
                      value={selectedTemplates[template._id] || ''}
                      onChange={(e) => handleSelectTemplate(template._id, parseInt(e.target.value) || 0)}
                      disabled={!selectedTemplates[template._id]}
                      className="quantity-input"
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="no-results">
                  Nessun progetto trovato. Riprova modificando i filtri.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AvviaProgetto;