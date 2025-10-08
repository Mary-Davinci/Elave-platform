// src/pages/Agenti.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAgenti, deleteAgente } from '../services/agentiService';
import { Agente } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Companies.css';

const Agenti: React.FC = () => {
  const [agenti, setAgenti] = useState<Agente[]>([]);
  const [filteredAgenti, setFilteredAgenti] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [dropdownPositions, setDropdownPositions] = useState({});
  
  // Search inputs for each column
  const [searchInputs, setSearchInputs] = useState({
    date: '',
    businessName: '',
    vatNumber: '',
    province: '',
    commission: '',
    email: '',
    status: ''
  });

   
  // Track which filter dropdown is currently open
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);

  // State to store unique values for each column for filter dropdowns
  const [filterOptions, setFilterOptions] = useState<Record<string, Set<string>>>({
    date: new Set(),
    businessName: new Set(),
    vatNumber: new Set(),
    province: new Set(),
    commission: new Set(),
    email: new Set(),
    status: new Set(),
  });

  // State to track selected filter values
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    date: [],
    businessName: [],
    vatNumber: [],
    province: [],
    commission: [],
    email: [],
    status: [],
  });

  // Ref for detecting clicks outside filter dropdowns
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position filter dropdown function
  const positionFilterDropdown = useCallback((field: string) => {
    if (activeFilterDropdown === field) {
      // Get the button element that triggered the dropdown
      const buttonElement = document.querySelector(`button[title="Filtra per ${field}"]`);
      const filterDropdown = document.querySelector('.filter-dropdown') as HTMLElement;
      
      if (buttonElement && filterDropdown) {
        const rect = buttonElement.getBoundingClientRect();
        
        // Calculate position to place dropdown below the button
        const top = rect.bottom + window.scrollY + 5; // Adding 5px for spacing
        const left = Math.max(rect.left + window.scrollX - 200 + rect.width, 10); // Center it with min 10px from edge
        
        // Make sure dropdown stays in viewport
        const rightEdge = left + 250;
        const windowWidth = window.innerWidth;
        const finalLeft = rightEdge > windowWidth ? windowWidth - 260 : left;
        
        // Set position
        filterDropdown.style.top = `${top}px`;
        filterDropdown.style.left = `${finalLeft}px`;
        
        // Save position to state (optional)
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
    
    // Position it on the next render cycle
    if (newActiveFilter) {
      setTimeout(() => {
        positionFilterDropdown(field);
      }, 0);
    }
  }, [activeFilterDropdown, positionFilterDropdown]);

  useEffect(() => {
    // Close dropdown when clicking outside
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

  const fetchAgenti = async () => {
    try {
      setLoading(true);
      //const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      const data = await getAgenti(); 
      setAgenti(data);
      setFilteredAgenti(data);

      const options: Record<string, Set<string>> = {
        date: new Set(),
        businessName: new Set(),
        vatNumber: new Set(),
        province: new Set(),
        commission: new Set(),
        email: new Set(),
        status: new Set(['Attivo', 'Inattivo']),
      };

      data.forEach(agente => {
        options.date.add(new Date(agente.createdAt).toLocaleDateString());
        options.businessName.add(agente.businessName);
        options.vatNumber.add(agente.vatNumber);
        if (agente.province) options.province.add(agente.province);
        if (agente.agreedCommission) options.commission.add(`${agente.agreedCommission}%`);
        if (agente.email) options.email.add(agente.email);
      });

      setFilterOptions(options);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching agenti:', err);
      setError('Failed to load agenti');
      setLoading(false);
    }
  };

  fetchAgenti();
}, [isAuthenticated, navigate, user?.role]);  // include role so it refetches when role is known


  // Apply filters and search when criteria change
  useEffect(() => {
    let result = agenti;

    // Apply search inputs
    if (searchInputs.date) {
      result = result.filter(agente => 
        new Date(agente.createdAt).toLocaleDateString().toLowerCase().includes(searchInputs.date.toLowerCase())
      );
    }
    
    if (searchInputs.businessName) {
      result = result.filter(agente => 
        agente.businessName.toLowerCase().includes(searchInputs.businessName.toLowerCase())
      );
    }
    
    if (searchInputs.vatNumber) {
      result = result.filter(agente => 
        agente.vatNumber.toLowerCase().includes(searchInputs.vatNumber.toLowerCase())
      );
    }
    
    if (searchInputs.province) {
      result = result.filter(agente => 
        (agente.province || '').toLowerCase().includes(searchInputs.province.toLowerCase())
      );
    }
    
    if (searchInputs.commission) {
      result = result.filter(agente => 
        (agente.agreedCommission?.toString() || '').includes(searchInputs.commission)
      );
    }
    
    if (searchInputs.email) {
      result = result.filter(agente => 
        (agente.email || '').toLowerCase().includes(searchInputs.email.toLowerCase())
      );
    }
    
    if (searchInputs.status) {
      result = result.filter(agente => {
        const status = agente.isActive ? 'Attivo' : 'Inattivo';
        return status.toLowerCase().includes(searchInputs.status.toLowerCase());
      });
    }

    // Apply dropdown filters
    Object.entries(selectedFilters).forEach(([field, values]) => {
      if (values.length > 0) {
        if (field === 'date') {
          result = result.filter(agente => 
            values.includes(new Date(agente.createdAt).toLocaleDateString())
          );
        } else if (field === 'businessName') {
          result = result.filter(agente => 
            values.includes(agente.businessName)
          );
        } else if (field === 'vatNumber') {
          result = result.filter(agente => 
            values.includes(agente.vatNumber)
          );
        } else if (field === 'province') {
          result = result.filter(agente => 
            values.includes(agente.province || '-')
          );
        } else if (field === 'commission') {
          result = result.filter(agente => 
            values.includes((agente.agreedCommission?.toString() || '') + '%')
          );
        } else if (field === 'email') {
          result = result.filter(agente => 
            values.includes(agente.email || '-')
          );
        } else if (field === 'status') {
          result = result.filter(agente => 
            values.includes(agente.isActive ? 'Attivo' : 'Inattivo')
          );
        }
      }
    });

    setFilteredAgenti(result);
  }, [searchInputs, selectedFilters, agenti]);

  // To ensure positioning is updated on window resize
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
  
  // To ensure positioning is updated on scroll
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

  const handleAddAgente = () => {
    navigate('/agenti/new');
  };

  const handleViewAgente = (id: string) => {
    navigate(`/agenti/${id}`);
  };

  const handleEditAgente = (id: string) => {
    navigate(`/agenti/edit/${id}`);
  };

  const handleDeleteAgente = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo agente?')) {
      try {
        await deleteAgente(id);
        setAgenti(agenti.filter(agente => agente._id !== id));
      } catch (err) {
        console.error('Error deleting agente:', err);
        setError('Failed to delete agente');
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
        <p>Loading agenti...</p>
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
        <h1>Agenti</h1>
        <div className="header-actions">
          <button className="add-button" onClick={handleAddAgente}>
            Aggiungi Agente
          </button>
          <button className="upload-button" onClick={() => navigate('/agenti/upload')}>
            <span className="upload-icon">⬆️</span> Importa da XLSX
          </button>
        </div>
      </div>

      {agenti.length === 0 ? (
        <div className="no-data">
          <p>Nessun agente trovato. Clicca "Aggiungi Agente" per crearne uno.</p>
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
                      <span>Provincia</span>
                      <button
                        className="filter-button"
                        onClick={() => toggleFilterDropdown('province')}
                        title="Filtra per provincia"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="search-bar-container">
                      <input
                        type="text"
                        placeholder="Cerca..."
                        value={searchInputs.province}
                        onChange={(e) => handleSearchChange(e, 'province')}
                        className="search-input-com"
                      />
                      <span className="search-icon-comp">🔍</span>
                    </div>
                    {activeFilterDropdown === 'province' && (
                      <div className="filter-dropdown">
                        <div className="filter-options">
                          <label className="filter-option">
                            <input
                              type="checkbox"
                              onChange={(e) => handleSelectAll('province', e.target.checked)}
                              checked={selectedFilters.province.length === filterOptions.province.size && filterOptions.province.size > 0}
                            />
                            Select All
                          </label>
                          {Array.from(filterOptions.province).map((value) => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={selectedFilters.province.includes(value)}
                                onChange={(e) => handleFilterChange('province', value, e.target.checked)}
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
                      <span>Commissione</span>
                      <button
                        className="filter-button"
                        onClick={() => toggleFilterDropdown('commission')}
                        title="Filtra per commissione"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="search-bar-container">
                      <input
                        type="text"
                        placeholder="Cerca..."
                        value={searchInputs.commission}
                        onChange={(e) => handleSearchChange(e, 'commission')}
                        className="search-input-com"
                      />
                      <span className="search-icon-comp">🔍</span>
                    </div>
                    {activeFilterDropdown === 'commission' && (
                      <div className="filter-dropdown">
                        <div className="filter-options">
                          <label className="filter-option">
                            <input
                              type="checkbox"
                              onChange={(e) => handleSelectAll('commission', e.target.checked)}
                              checked={selectedFilters.commission.length === filterOptions.commission.size && filterOptions.commission.size > 0}
                            />
                            Select All
                          </label>
                          {Array.from(filterOptions.commission).map((value) => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={selectedFilters.commission.includes(value)}
                                onChange={(e) => handleFilterChange('commission', value, e.target.checked)}
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
                      <span>Email</span>
                      <button
                        className="filter-button"
                        onClick={() => toggleFilterDropdown('email')}
                        title="Filtra per email"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="search-bar-container">
                      <input
                        type="text"
                        placeholder="Cerca..."
                        value={searchInputs.email}
                        onChange={(e) => handleSearchChange(e, 'email')}
                        className="search-input-com"
                      />
                      <span className="search-icon-comp">🔍</span>
                    </div>
                    {activeFilterDropdown === 'email' && (
                      <div className="filter-dropdown">
                        <div className="filter-options">
                          <label className="filter-option">
                            <input
                              type="checkbox"
                              onChange={(e) => handleSelectAll('email', e.target.checked)}
                              checked={selectedFilters.email.length === filterOptions.email.size && filterOptions.email.size > 0}
                            />
                            Select All
                          </label>
                          {Array.from(filterOptions.email).map((value) => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={selectedFilters.email.includes(value)}
                                onChange={(e) => handleFilterChange('email', value, e.target.checked)}
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
              {filteredAgenti.map((agente) => (
                <tr key={agente._id}>
                  <td>{new Date(agente.createdAt).toLocaleDateString()}</td>
                  <td>{agente.businessName}</td>
                  <td>{agente.vatNumber}</td>
                  <td>{agente.province || '-'}</td>
                  <td>{agente.agreedCommission ? `${agente.agreedCommission}%` : '-'}</td>
                  <td>{agente.email || '-'}</td>
                  <td>
                    <span className={`status-badge ${agente.isActive ? 'active' : 'inactive'}`}>
                      {agente.isActive ? 'Attivo' : 'Inattivo'}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      className="view-button"
                      onClick={() => handleViewAgente(agente._id)}
                      title="Visualizza dettagli"
                    >
                      👁️
                    </button>
                    <button 
                      className="edit-button"
                      onClick={() => handleEditAgente(agente._id)}
                      title="Modifica agente"
                    >
                      ✏️
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteAgente(agente._id)}
                      title="Elimina agente"
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

export default Agenti;