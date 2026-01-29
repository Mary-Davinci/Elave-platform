// src/pages/Companies.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCompanies, deleteCompany } from '../services/companyService';
import { Company } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Companies.css';

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [dropdownPositions, setDropdownPositions] = useState({});
  

  const [searchInputs, setSearchInputs] = useState({
    date: '',
    matricola: '',
    businessName: '',
    vatNumber: '',
    territorialManager: '',
    sportelloLavoro: '',
    status: ''
  });

  
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);

 
  const [filterOptions, setFilterOptions] = useState<Record<string, Set<string>>>({
    date: new Set(),
    matricola: new Set(),
    businessName: new Set(),
    vatNumber: new Set(),
    territorialManager: new Set(),
    sportelloLavoro: new Set(),
    status: new Set(),
  });

  
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    date: [],
    matricola: [],
    businessName: [],
    vatNumber: [],
    territorialManager: [],
    sportelloLavoro: [],
    status: [],
  });

  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getTerritorialManager = (company: Company) =>
    company.territorialManager ||
    company.contractDetails?.territorialManager ||
    '-';

  const getSportelloLavoro = (company: Company) =>
    company.contactInfo?.laborConsultant || '-';

  const getMatricolaInps = (company: Company) =>
    company.inpsCode || company.matricola || '-';

  
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

    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const data = await getCompanies();
        setCompanies(data);
        setFilteredCompanies(data);
        
        
        const options: Record<string, Set<string>> = {
          date: new Set(),
          matricola: new Set(),
          businessName: new Set(),
          vatNumber: new Set(),
          territorialManager: new Set(),
          sportelloLavoro: new Set(),
          status: new Set(['Attivo', 'Inattivo']),
        };

        data.forEach(company => {
          options.date.add(new Date(company.createdAt).toLocaleDateString());
          const matricolaInps = getMatricolaInps(company);
          if (matricolaInps !== '-') options.matricola.add(matricolaInps);
          options.businessName.add(company.businessName);
          options.vatNumber.add(company.vatNumber);
          options.territorialManager.add(getTerritorialManager(company));
          options.sportelloLavoro.add(getSportelloLavoro(company));
        });

        setFilterOptions(options);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching companies:', err);
        setError('Failed to load companies');
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [isAuthenticated, navigate]);

 
  useEffect(() => {
    let result = companies;

    
    if (searchInputs.date) {
      result = result.filter(company => 
        new Date(company.createdAt).toLocaleDateString().toLowerCase().includes(searchInputs.date.toLowerCase())
      );
    }
    
    if (searchInputs.matricola) {
      result = result.filter(company => 
        getMatricolaInps(company).toLowerCase().includes(searchInputs.matricola.toLowerCase())
      );
    }
    
    if (searchInputs.businessName) {
      result = result.filter(company => 
        company.businessName.toLowerCase().includes(searchInputs.businessName.toLowerCase())
      );
    }
    
    if (searchInputs.vatNumber) {
      result = result.filter(company => 
        company.vatNumber.toLowerCase().includes(searchInputs.vatNumber.toLowerCase())
      );
    }
    
    if (searchInputs.territorialManager) {
      result = result.filter(company =>
        getTerritorialManager(company).toLowerCase().includes(searchInputs.territorialManager.toLowerCase())
      );
    }
    
    if (searchInputs.sportelloLavoro) {
      result = result.filter(company =>
        getSportelloLavoro(company).toLowerCase().includes(searchInputs.sportelloLavoro.toLowerCase())
      );
    }
    
    if (searchInputs.status) {
      result = result.filter(company => {
        const status = company.isActive ? 'Attivo' : 'Inattivo';
        return status.toLowerCase().includes(searchInputs.status.toLowerCase());
      });
    }

    
    Object.entries(selectedFilters).forEach(([field, values]) => {
      if (values.length > 0) {
        if (field === 'date') {
          result = result.filter(company => 
            values.includes(new Date(company.createdAt).toLocaleDateString())
          );
        } else if (field === 'matricola') {
          result = result.filter(company => 
            values.includes(getMatricolaInps(company))
          );
        } else if (field === 'businessName') {
          result = result.filter(company => 
            values.includes(company.businessName)
          );
        } else if (field === 'vatNumber') {
          result = result.filter(company => 
            values.includes(company.vatNumber)
          );
        } else if (field === 'territorialManager') {
          result = result.filter(company =>
            values.includes(getTerritorialManager(company))
          );
        } else if (field === 'sportelloLavoro') {
          result = result.filter(company =>
            values.includes(getSportelloLavoro(company))
          );
        } else if (field === 'status') {
          result = result.filter(company => 
            values.includes(company.isActive ? 'Attivo' : 'Inattivo')
          );
        }
      }
    });

    setFilteredCompanies(result);
  }, [searchInputs, selectedFilters, companies]);

  
  useEffect(() => {
    const handleResize = () => {
      if (activeFilterDropdown) {
        positionFilterDropdown(activeFilterDropdown);
      }
    };
  
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeFilterDropdown, positionFilterDropdown]);
  
  useEffect(() => {
    const handleScroll = () => {
      if (activeFilterDropdown) {
        positionFilterDropdown(activeFilterDropdown);
      }
    };
  
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeFilterDropdown, positionFilterDropdown]);

  const handleAddCompany = () => {
    navigate('/companies/new');
  };

  const handleViewCompany = (id: string) => {
    navigate(`/companies/${id}`);
  };

  const handleEditCompany = (id: string) => {
    navigate(`/companies/edit/${id}`);
  };

  const handleDeleteCompany = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa azienda?')) {
      try {
        await deleteCompany(id);
        setCompanies(companies.filter(company => company._id !== id));
      } catch (err) {
        console.error('Error deleting company:', err);
        setError('Failed to delete company');
      }
    }
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading companies...</p>
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
        <h1>Aziende</h1>
        <div className="header-actions">
          <button className="add-button" onClick={handleAddCompany}>
            Crea Azienda
          </button>
          <button className="upload-button" onClick={() => navigate('/companies/upload')}>
            <span className="upload-icon">⬆️</span> Importa da XLSX
          </button>
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="no-data">
          <p>Nessuna azienda trovata. Clicca "Crea Azienda" per crearne una.</p>
        </div>
      ) : (
        <div className="companies-table-container">
          <div className="companies-table-wrapper">
          <table className="companies-table">
            <thead>
              <tr>
                <th>
                  <div className="th-content">
                    <div className="th-header">
                      <span>Data</span>
                      <button
                        className="filter-button"
                        onClick={() => toggleFilterDropdown('date')}
                        title="Filtra per data"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="search-bar-container">
                      <input
                        type="text"
                        placeholder="Cerca..."
                        value={searchInputs.date}
                        onChange={(e) => handleSearchChange(e, 'date')}
                        className="search-input-com"
                      />
                      <span className="search-icon-comp">🔍</span>
                    </div>
                    {activeFilterDropdown === 'date' && (
                      <div className="filter-dropdown">
                        <div className="filter-options">
                          <label className="filter-option">
                            <input
                              type="checkbox"
                              onChange={(e) => handleSelectAll('date', e.target.checked)}
                              checked={selectedFilters.date.length === filterOptions.date.size && filterOptions.date.size > 0}
                            />
                            Select All
                          </label>
                          {Array.from(filterOptions.date).map((value) => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={selectedFilters.date.includes(value)}
                                onChange={(e) => handleFilterChange('date', value, e.target.checked)}
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
                <th>
                  <div className="th-content">
                    <div className="th-header">
                      <span>Matricola INPS</span>
                      <button
                        className="filter-button"
                        onClick={() => toggleFilterDropdown('matricola')}
                        title="Filtra per matricola INPS"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="search-bar-container">
                      <input
                        type="text"
                        placeholder="Cerca..."
                        value={searchInputs.matricola}
                        onChange={(e) => handleSearchChange(e, 'matricola')}
                        className="search-input-com"
                      />
                      <span className="search-icon">🔍</span>
                    </div>
                    {activeFilterDropdown === 'matricola' && (
                      <div className="filter-dropdown">
                        <div className="filter-options">
                          <label className="filter-option">
                            <input
                              type="checkbox"
                              onChange={(e) => handleSelectAll('matricola', e.target.checked)}
                              checked={selectedFilters.matricola.length === filterOptions.matricola.size && filterOptions.matricola.size > 0}
                            />
                            Select All
                          </label>
                          {Array.from(filterOptions.matricola).map((value) => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={selectedFilters.matricola.includes(value)}
                                onChange={(e) => handleFilterChange('matricola', value, e.target.checked)}
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
                <th>
                  <div className="th-content">
                    <div className="th-header">
                      <span>Ragione Sociale</span>
                      <button
                        className="filter-button"
                        onClick={() => toggleFilterDropdown('businessName')}
                        title="Filtra per ragione sociale"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="search-bar-container">
                      <input
                        type="text"
                        placeholder="Cerca..."
                        value={searchInputs.businessName}
                        onChange={(e) => handleSearchChange(e, 'businessName')}
                        className="search-input-com"
                      />
                      <span className="search-icon-comp">🔍</span>
                    </div>
                    {activeFilterDropdown === 'businessName' && (
                      <div className="filter-dropdown">
                        <div className="filter-options">
                          <label className="filter-option">
                            <input
                              type="checkbox"
                              onChange={(e) => handleSelectAll('businessName', e.target.checked)}
                              checked={selectedFilters.businessName.length === filterOptions.businessName.size && filterOptions.businessName.size > 0}
                            />
                            Select All
                          </label>
                          {Array.from(filterOptions.businessName).map((value) => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={selectedFilters.businessName.includes(value)}
                                onChange={(e) => handleFilterChange('businessName', value, e.target.checked)}
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
                <th>
                  <div className="th-content">
                    <div className="th-header">
                      <span>Partita IVA</span>
                      <button
                        className="filter-button"
                        onClick={() => toggleFilterDropdown('vatNumber')}
                        title="Filtra per partita IVA"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="search-bar-container">
                      <input
                        type="text"
                        placeholder="Cerca..."
                        value={searchInputs.vatNumber}
                        onChange={(e) => handleSearchChange(e, 'vatNumber')}
                        className="search-input-com"
                      />
                      <span className="search-icon-comp">🔍</span>
                    </div>
                    {activeFilterDropdown === 'vatNumber' && (
                      <div className="filter-dropdown">
                        <div className="filter-options">
                          <label className="filter-option">
                            <input
                              type="checkbox"
                              onChange={(e) => handleSelectAll('vatNumber', e.target.checked)}
                              checked={selectedFilters.vatNumber.length === filterOptions.vatNumber.size && filterOptions.vatNumber.size > 0}
                            />
                            Select All
                          </label>
                          {Array.from(filterOptions.vatNumber).map((value) => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={selectedFilters.vatNumber.includes(value)}
                                onChange={(e) => handleFilterChange('vatNumber', value, e.target.checked)}
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
                <th>
                  <div className="th-content">
                    <div className="th-header">
                      <span>Responsabile Territoriale</span>
                      <button
                        className="filter-button"
                        onClick={() => toggleFilterDropdown('territorialManager')}
                        title="Filtra per responsabile territoriale"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="search-bar-container">
                      <input
                        type="text"
                        placeholder="Cerca..."
                        value={searchInputs.territorialManager}
                        onChange={(e) => handleSearchChange(e, 'territorialManager')}
                        className="search-input-com"
                      />
                      <span className="search-icon-comp">🔍</span>
                    </div>
                    {activeFilterDropdown === 'territorialManager' && (
                      <div className="filter-dropdown">
                        <div className="filter-options">
                          <label className="filter-option">
                            <input
                              type="checkbox"
                              onChange={(e) => handleSelectAll('territorialManager', e.target.checked)}
                              checked={selectedFilters.territorialManager.length === filterOptions.territorialManager.size && filterOptions.territorialManager.size > 0}
                            />
                            Select All
                          </label>
                          {Array.from(filterOptions.territorialManager).map((value) => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={selectedFilters.territorialManager.includes(value)}
                                onChange={(e) => handleFilterChange('territorialManager', value, e.target.checked)}
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
                <th>
                  <div className="th-content">
                    <div className="th-header">
                      <span>Sportello Lavoro</span>
                      <button
                        className="filter-button"
                        onClick={() => toggleFilterDropdown('sportelloLavoro')}
                        title="Filtra per sportello lavoro"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="search-bar-container">
                      <input
                        type="text"
                        placeholder="Cerca..."
                        value={searchInputs.sportelloLavoro}
                        onChange={(e) => handleSearchChange(e, 'sportelloLavoro')}
                        className="search-input-com"
                      />
                      <span className="search-icon-comp">🔍</span>
                    </div>
                    {activeFilterDropdown === 'sportelloLavoro' && (
                      <div className="filter-dropdown">
                        <div className="filter-options">
                          <label className="filter-option">
                            <input
                              type="checkbox"
                              onChange={(e) => handleSelectAll('sportelloLavoro', e.target.checked)}
                              checked={selectedFilters.sportelloLavoro.length === filterOptions.sportelloLavoro.size && filterOptions.sportelloLavoro.size > 0}
                            />
                            Select All
                          </label>
                          {Array.from(filterOptions.sportelloLavoro).map((value) => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={selectedFilters.sportelloLavoro.includes(value)}
                                onChange={(e) => handleFilterChange('sportelloLavoro', value, e.target.checked)}
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
                <th>
                  <div className="th-content">
                    <div className="th-header">
                      <span>Status</span>
                      <button
                        className="filter-button"
                        onClick={() => toggleFilterDropdown('status')}
                        title="Filtra per status"
                      >
                        ▼
                      </button>
                    </div>

                    <div className="search-bar-container">
                      <input
                        type="text"
                        placeholder="Cerca..."
                        value={searchInputs.status}
                        onChange={(e) => handleSearchChange(e, 'status')}
                        className="search-input-com"
                      />
                      <span className="search-icon-comp">🔍</span>
                    </div>
                    
                    {activeFilterDropdown === 'status' && (
                      <div className="filter-dropdown">
                        <div className="filter-options">
                          <label className="filter-option">
                            <input
                              type="checkbox"
                              onChange={(e) => handleSelectAll('status', e.target.checked)}
                              checked={selectedFilters.status.length === filterOptions.status.size && filterOptions.status.size > 0}
                            />
                            Select All
                          </label>
                          {Array.from(filterOptions.status).map((value) => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={selectedFilters.status.includes(value)}
                                onChange={(e) => handleFilterChange('status', value, e.target.checked)}
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
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => (
                <tr key={company._id}>
                  <td>{new Date(company.createdAt).toLocaleDateString()}</td>
                  <td>{getMatricolaInps(company)}</td>
                  <td>{company.businessName}</td>
                  <td>{company.vatNumber}</td>
                  <td>{getTerritorialManager(company)}</td>
                  <td>{getSportelloLavoro(company)}</td>
                  <td>
                    <span className={`status-badge ${company.isActive ? 'active' : 'inactive'}`}>
                      {company.isActive ? 'Attivo' : 'Inattivo'}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      className="view-button"
                      onClick={() => handleViewCompany(company._id)}
                      title="Visualizza dettagli"
                    >
                      👁️
                    </button>
                    <button 
                      className="edit-button"
                      onClick={() => handleEditCompany(company._id)}
                      title="Modifica azienda"
                    >
                      ✏️
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteCompany(company._id)}
                      title="Elimina azienda"
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

export default Companies;
