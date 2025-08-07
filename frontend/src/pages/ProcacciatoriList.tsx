import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProcacciatoreFormData } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';
import { procacciatoreService, ProcacciatoreResponse } from '../services/procacciatoreService';
import '../styles/Companies.css';

interface Procacciatore extends ProcacciatoreFormData {
  _id: string;
  createdAt: string;
  isActive?: boolean;
  contractFile?: string;
  idDocumentFile?: string;
}

const ProcacciatoriList: React.FC = () => {
  const [procacciatori, setProcacciatori] = useState<ProcacciatoreResponse[]>([]);
  const [filteredProcacciatori, setFilteredProcacciatori] = useState<ProcacciatoreResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [dropdownPositions, setDropdownPositions] = useState({});
  
  // Search inputs for each column
  const [searchInputs, setSearchInputs] = useState({
    date: '',
    fullName: '',
    email: '',
    phone: '',
    city: '',
    province: '',
    taxCode: '',
    percentage: '',
    specialization: '',
    status: ''
  });

  // Track which filter dropdown is currently open
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);

  // State to store unique values for each column for filter dropdowns
  const [filterOptions, setFilterOptions] = useState<Record<string, Set<string>>>({
    date: new Set(),
    fullName: new Set(),
    email: new Set(),
    phone: new Set(),
    city: new Set(),
    province: new Set(),
    taxCode: new Set(),
    percentage: new Set(),
    specialization: new Set(),
    status: new Set(),
  });

  // State to track selected filter values
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    date: [],
    fullName: [],
    email: [],
    phone: [],
    city: [],
    province: [],
    taxCode: [],
    percentage: [],
    specialization: [],
    status: [],
  });

  // Ref for detecting clicks outside filter dropdowns
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position filter dropdown function
  const positionFilterDropdown = useCallback((field: string) => {
    if (activeFilterDropdown === field) {
      const buttonElement = document.querySelector(`button[title="Filtra per ${field}"]`);
      const filterDropdown = document.querySelector('.filter-dropdown') as HTMLElement;
      
      if (buttonElement && filterDropdown) {
        const rect = buttonElement.getBoundingClientRect();
        
        const top = rect.bottom + window.scrollY + 5;
        const left = Math.max(rect.left + window.scrollX - 200 + rect.width, 10);
        
        const rightEdge = left + 250;
        const windowWidth = window.innerWidth;
        const finalLeft = rightEdge > windowWidth ? windowWidth - 260 : left;
        
        filterDropdown.style.top = `${top}px`;
        filterDropdown.style.left = `${finalLeft}px`;
        
        setDropdownPositions({
          ...dropdownPositions,
          [field]: { top, left: finalLeft }
        });
      }
    }
  }, [activeFilterDropdown, dropdownPositions]);

  // Toggle filter dropdown function
  const toggleFilterDropdown = useCallback((field: string) => {
    const newActiveFilter = activeFilterDropdown === field ? null : field;
    setActiveFilterDropdown(newActiveFilter);
    
    if (newActiveFilter) {
      setTimeout(() => {
        positionFilterDropdown(field);
      }, 0);
    }
  }, [activeFilterDropdown, positionFilterDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveFilterDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchProcacciatori = async () => {
      try {
        setLoading(true);
        
        // Use service instead of direct fetch
        const data = await procacciatoreService.getAllProcacciatori();
        
        setProcacciatori(data);
        setFilteredProcacciatori(data);
        
        // Populate filter options based on data
        const options: Record<string, Set<string>> = {
          date: new Set(),
          fullName: new Set(),
          email: new Set(),
          phone: new Set(),
          city: new Set(),
          province: new Set(),
          taxCode: new Set(),
          percentage: new Set(),
          specialization: new Set(),
          status: new Set(['Attivo', 'Inattivo']),
        };

        data.forEach((procacciatore: ProcacciatoreResponse) => {
          options.date.add(new Date(procacciatore.createdAt).toLocaleDateString());
          options.fullName.add(procacciatoreService.formatFullName(procacciatore.firstName, procacciatore.lastName));
          options.email.add(procacciatore.email);
          if (procacciatore.phone) options.phone.add(procacciatore.phone);
          options.city.add(procacciatore.city);
          options.province.add(procacciatore.province);
          options.taxCode.add(procacciatore.taxCode);
          options.percentage.add(procacciatore.agreementPercentage.toString());
          if (procacciatore.specialization) options.specialization.add(procacciatore.specialization);
        });

        setFilterOptions(options);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching procacciatori:', err);
        setError(err.message || 'Failed to load procacciatori');
        setLoading(false);
      }
    };

    fetchProcacciatori();
  }, [isAuthenticated, navigate]);

  // Apply filters and search when criteria change
  useEffect(() => {
    let result = procacciatori;

    // Apply search inputs
    if (searchInputs.date) {
      result = result.filter(procacciatore => 
        new Date(procacciatore.createdAt).toLocaleDateString().toLowerCase().includes(searchInputs.date.toLowerCase())
      );
    }
    
    if (searchInputs.fullName) {
      result = result.filter(procacciatore => 
        procacciatoreService.formatFullName(procacciatore.firstName, procacciatore.lastName).toLowerCase().includes(searchInputs.fullName.toLowerCase())
      );
    }
    
    if (searchInputs.email) {
      result = result.filter(procacciatore => 
        procacciatore.email.toLowerCase().includes(searchInputs.email.toLowerCase())
      );
    }
    
    if (searchInputs.phone) {
      result = result.filter(procacciatore => 
        (procacciatore.phone || '').toLowerCase().includes(searchInputs.phone.toLowerCase())
      );
    }
    
    if (searchInputs.city) {
      result = result.filter(procacciatore => 
        procacciatore.city.toLowerCase().includes(searchInputs.city.toLowerCase())
      );
    }
    
    if (searchInputs.province) {
      result = result.filter(procacciatore => 
        procacciatore.province.toLowerCase().includes(searchInputs.province.toLowerCase())
      );
    }
    
    if (searchInputs.taxCode) {
      result = result.filter(procacciatore => 
        procacciatore.taxCode.toLowerCase().includes(searchInputs.taxCode.toLowerCase())
      );
    }
    
    if (searchInputs.percentage) {
      result = result.filter(procacciatore => 
        procacciatore.agreementPercentage.toString().includes(searchInputs.percentage)
      );
    }
    
    if (searchInputs.specialization) {
      result = result.filter(procacciatore => 
        (procacciatore.specialization || '').toLowerCase().includes(searchInputs.specialization.toLowerCase())
      );
    }
    
    if (searchInputs.status) {
      result = result.filter(procacciatore => {
        const status = procacciatore.isActive !== false ? 'Attivo' : 'Inattivo';
        return status.toLowerCase().includes(searchInputs.status.toLowerCase());
      });
    }

    // Apply dropdown filters
    Object.entries(selectedFilters).forEach(([field, values]) => {
      if (values.length > 0) {
        if (field === 'date') {
          result = result.filter(procacciatore => 
            values.includes(new Date(procacciatore.createdAt).toLocaleDateString())
          );
        } else if (field === 'fullName') {
          result = result.filter(procacciatore => 
            values.includes(procacciatoreService.formatFullName(procacciatore.firstName, procacciatore.lastName))
          );
        } else if (field === 'email') {
          result = result.filter(procacciatore => 
            values.includes(procacciatore.email)
          );
        } else if (field === 'phone') {
          result = result.filter(procacciatore => 
            values.includes(procacciatore.phone || '-')
          );
        } else if (field === 'city') {
          result = result.filter(procacciatore => 
            values.includes(procacciatore.city)
          );
        } else if (field === 'province') {
          result = result.filter(procacciatore => 
            values.includes(procacciatore.province)
          );
        } else if (field === 'taxCode') {
          result = result.filter(procacciatore => 
            values.includes(procacciatore.taxCode)
          );
        } else if (field === 'percentage') {
          result = result.filter(procacciatore => 
            values.includes(procacciatore.agreementPercentage.toString())
          );
        } else if (field === 'specialization') {
          result = result.filter(procacciatore => 
            values.includes(procacciatore.specialization || '-')
          );
        } else if (field === 'status') {
          result = result.filter(procacciatore => 
            values.includes(procacciatore.isActive !== false ? 'Attivo' : 'Inattivo')
          );
        }
      }
    });

    setFilteredProcacciatori(result);
  }, [searchInputs, selectedFilters, procacciatori]);

  const handleAddProcacciatore = () => {
    navigate('/procacciatori/new');
  };

  const handleViewProcacciatore = (id: string) => {
    navigate(`/procacciatori/${id}`);
  };

  const handleEditProcacciatore = (id: string) => {
    navigate(`/procacciatori/edit/${id}`);
  };

  const handleDeleteProcacciatore = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo Procacciatore?')) {
      try {
        // Use service instead of direct fetch
        await procacciatoreService.deleteProcacciatore(id);
        setProcacciatori(procacciatori.filter(procacciatore => procacciatore._id !== id));
      } catch (err: any) {
        console.error('Error deleting procacciatore:', err);
        setError(err.message || 'Failed to delete procacciatore');
      }
    }
  };

  const handleExportCSV = () => {
    procacciatoreService.exportToCSV(filteredProcacciatori);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    setSearchInputs({
      ...searchInputs,
      [field]: e.target.value
    });
  };

  const handleFilterChange = (field: string, value: string, checked: boolean) => {
    setSelectedFilters(prev => {
      const newValues = [...prev[field]];
      if (checked) {
        newValues.push(value);
      } else {
        const index = newValues.indexOf(value);
        if (index > -1) {
          newValues.splice(index, 1);
        }
      }
      return { ...prev, [field]: newValues };
    });
  };

  const handleSelectAll = (field: string, checked: boolean) => {
    if (checked) {
      setSelectedFilters(prev => ({
        ...prev,
        [field]: Array.from(filterOptions[field])
      }));
    } else {
      setSelectedFilters(prev => ({
        ...prev,
        [field]: []
      }));
    }
  };

  const handleFilterOk = () => {
    setActiveFilterDropdown(null);
  };

  const handleFilterCancel = () => {
    setActiveFilterDropdown(null);
  };

  const renderFilterDropdown = (field: string, displayName: string) => (
    <th key={field}>
      <div className="th-content">
        <div className="th-header">
          <span>{displayName}</span>
          <button
            className="filter-button"
            onClick={() => toggleFilterDropdown(field)}
            title={`Filtra per ${displayName.toLowerCase()}`}
          >
            ▼
          </button>
        </div>
        <div className="search-bar-container">
          <input
            type="text"
            placeholder="Cerca..."
            value={searchInputs[field as keyof typeof searchInputs]}
            onChange={(e) => handleSearchChange(e, field)}
            className="search-input-com"
          />
          <span className="search-icon-comp">🔍</span>
        </div>
        {activeFilterDropdown === field && (
          <div className="filter-dropdown">
            <div className="filter-options">
              <label className="filter-option">
                <input
                  type="checkbox"
                  onChange={(e) => handleSelectAll(field, e.target.checked)}
                  checked={selectedFilters[field].length === filterOptions[field].size && filterOptions[field].size > 0}
                />
                Select All
              </label>
              {Array.from(filterOptions[field]).map((value) => (
                <label key={value} className="filter-option">
                  <input
                    type="checkbox"
                    checked={selectedFilters[field].includes(value)}
                    onChange={(e) => handleFilterChange(field, value, e.target.checked)}
                  />
                  {value}
                </label>
              ))}
            </div>
            <div className="filter-actions">
              <button onClick={handleFilterOk} className="filter-ok-button">OK</button>
              <button onClick={handleFilterCancel} className="filter-cancel-button">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Procacciatori...</p>
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

  return (
    <div className="companies-container" ref={dropdownRef}>
      <div className="companies-header">
        <h1>Procacciatori</h1>
        <div className="header-actions">
          <button className="add-button" onClick={handleAddProcacciatore}>
            Aggiungi Procacciatore
          </button>
          <button className="upload-button" onClick={() => navigate('/procacciatori/upload')}>
            <span className="upload-icon">⬆️</span> Importa da XLSX
          </button>
          <button className="export-button" onClick={handleExportCSV}>
            <span className="export-icon">📥</span> Esporta CSV
          </button>
        </div>
      </div>

      {procacciatori.length === 0 ? (
        <div className="no-data">
          <p>Nessun Procacciatore trovato. Clicca "Aggiungi Procacciatore" per crearne uno.</p>
        </div>
      ) : (
        <div className="companies-table-container">
          <div className="companies-table-wrapper">
            <table className="companies-table">
              <thead>
                <tr>
                  {renderFilterDropdown('date', 'Data')}
                  {renderFilterDropdown('fullName', 'Nome Completo')}
                  {renderFilterDropdown('email', 'Email')}
                  {renderFilterDropdown('phone', 'Telefono')}
                  {renderFilterDropdown('city', 'Città')}
                  {renderFilterDropdown('province', 'Provincia')}
                  {renderFilterDropdown('taxCode', 'Codice Fiscale')}
                  {renderFilterDropdown('percentage', 'Percentuale')}
                  {renderFilterDropdown('specialization', 'Specializzazione')}
                  {renderFilterDropdown('status', 'Status')}
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcacciatori.map((procacciatore) => (
                  <tr key={procacciatore._id}>
                    <td>{new Date(procacciatore.createdAt).toLocaleDateString()}</td>
                    <td>{procacciatoreService.formatFullName(procacciatore.firstName, procacciatore.lastName)}</td>
                    <td>{procacciatore.email}</td>
                    <td>{procacciatore.phone || '-'}</td>
                    <td>{procacciatore.city}</td>
                    <td>{procacciatore.province}</td>
                    <td>{procacciatore.taxCode}</td>
                    <td>{procacciatoreService.formatPercentage(procacciatore.agreementPercentage)}</td>
                    <td>{procacciatore.specialization || '-'}</td>
                    <td>
                      <span className={`status-badge ${procacciatore.isActive !== false ? 'active' : 'inactive'}`}>
                        {procacciatore.isActive !== false ? 'Attivo' : 'Inattivo'}
                      </span>
                    </td>
                    <td className="actions">
                      <button 
                        className="view-button"
                        onClick={() => handleViewProcacciatore(procacciatore._id)}
                        title="Visualizza dettagli"
                      >
                        👁️
                      </button>
                      <button 
                        className="edit-button"
                        onClick={() => handleEditProcacciatore(procacciatore._id)}
                        title="Modifica procacciatore"
                      >
                        ✏️
                      </button>
                      <button 
                        className="delete-button"
                        onClick={() => handleDeleteProcacciatore(procacciatore._id)}
                        title="Elimina procacciatore"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcacciatoriList;