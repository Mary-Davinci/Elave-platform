// src/pages/SportelloLavoroList.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SportelloLavoroFormData } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Companies.css';

// ✅ Read the real env key; fallback kept for safety; trim trailing slash.
const API_BASE_URL =
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000')
    .replace(/\/+$/, '');

interface SportelloLavoro extends SportelloLavoroFormData {
  _id: string;
  createdAt: string;
  isActive?: boolean;
  signedContractFile?: string;
  legalDocumentFile?: string;
}

const SportelloLavoroList: React.FC = () => {
  const [sportelloLavoros, setSportelloLavoros] = useState<SportelloLavoro[]>([]);
  const [filteredSportelloLavoros, setFilteredSportelloLavoros] = useState<SportelloLavoro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [dropdownPositions, setDropdownPositions] = useState({} as any);
  
  // Search inputs for each column
  const [searchInputs, setSearchInputs] = useState({
    date: '',
    businessName: '',
    vatNumber: '',
    city: '',
    province: '',
    email: '',
    pec: '',
    commission: '',
    status: ''
  });

  // Track which filter dropdown is currently open
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);

  // State to store unique values for each column for filter dropdowns
  const [filterOptions, setFilterOptions] = useState<Record<string, Set<string>>>({
    date: new Set(),
    businessName: new Set(),
    vatNumber: new Set(),
    city: new Set(),
    province: new Set(),
    email: new Set(),
    pec: new Set(),
    commission: new Set(),
    status: new Set(),
  });

  // State to track selected filter values
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    date: [],
    businessName: [],
    vatNumber: [],
    city: [],
    province: [],
    email: [],
    pec: [],
    commission: [],
    status: [],
  });

  // Ref for detecting clicks outside filter dropdowns
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position filter dropdown function
  const positionFilterDropdown = useCallback((field: string) => {
    if (activeFilterDropdown === field) {
      // NOTE: The title query should match the title you set below.
      const buttonElement = document.querySelector(`button[title="Filtra per ${field}"]`);
      const filterDropdown = document.querySelector('.filter-dropdown') as HTMLElement;
      
      if (buttonElement && filterDropdown) {
        const rect = (buttonElement as HTMLElement).getBoundingClientRect();
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
      setTimeout(() => positionFilterDropdown(field), 0);
    }
  }, [activeFilterDropdown, positionFilterDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveFilterDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchSportelloLavoros = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/api/sportello-lavoro`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });

        if (!response.ok) throw new Error('Failed to fetch sportello lavoros');

        const data = await response.json();
        setSportelloLavoros(data);
        setFilteredSportelloLavoros(data);
        
        // Populate filter options based on data
        const options: Record<string, Set<string>> = {
          date: new Set(),
          businessName: new Set(),
          vatNumber: new Set(),
          city: new Set(),
          province: new Set(),
          email: new Set(),
          pec: new Set(),
          commission: new Set(),
          status: new Set(['Attivo', 'Inattivo']),
        };

        data.forEach((sportello: SportelloLavoro) => {
          options.date.add(new Date(sportello.createdAt).toLocaleDateString());
          options.businessName.add(sportello.businessName);
          options.vatNumber.add(sportello.vatNumber);
          options.city.add(sportello.city);
          options.province.add(sportello.province);
          if (sportello.email) options.email.add(sportello.email);
          if (sportello.pec) options.pec.add(sportello.pec);
          options.commission.add(sportello.agreedCommission.toString());
        });

        setFilterOptions(options);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching sportello lavoros:', err);
        setError('Failed to load sportello lavoros');
        setLoading(false);
      }
    };

    fetchSportelloLavoros();
  }, [isAuthenticated, navigate]);

  // Apply filters and search when criteria change
  useEffect(() => {
    let result = sportelloLavoros;

    // Apply search inputs
    if (searchInputs.date) {
      result = result.filter(sportello => 
        new Date(sportello.createdAt).toLocaleDateString().toLowerCase().includes(searchInputs.date.toLowerCase())
      );
    }
    if (searchInputs.businessName) {
      result = result.filter(sportello => 
        sportello.businessName.toLowerCase().includes(searchInputs.businessName.toLowerCase())
      );
    }
    if (searchInputs.vatNumber) {
      result = result.filter(sportello => 
        sportello.vatNumber.toLowerCase().includes(searchInputs.vatNumber.toLowerCase())
      );
    }
    if (searchInputs.city) {
      result = result.filter(sportello => 
        sportello.city.toLowerCase().includes(searchInputs.city.toLowerCase())
      );
    }
    if (searchInputs.province) {
      result = result.filter(sportello => 
        sportello.province.toLowerCase().includes(searchInputs.province.toLowerCase())
      );
    }
    if (searchInputs.email) {
      result = result.filter(sportello => 
        (sportello.email || '').toLowerCase().includes(searchInputs.email.toLowerCase())
      );
    }
    if (searchInputs.pec) {
      result = result.filter(sportello => 
        (sportello.pec || '').toLowerCase().includes(searchInputs.pec.toLowerCase())
      );
    }
    if (searchInputs.commission) {
      result = result.filter(sportello => 
        sportello.agreedCommission.toString().includes(searchInputs.commission)
      );
    }
    if (searchInputs.status) {
      result = result.filter(sportello => {
        const status = sportello.isActive !== false ? 'Attivo' : 'Inattivo';
        return status.toLowerCase().includes(searchInputs.status.toLowerCase());
      });
    }

    // Apply dropdown filters
    Object.entries(selectedFilters).forEach(([field, values]) => {
      if (values.length > 0) {
        if (field === 'date') {
          result = result.filter(sportello => 
            values.includes(new Date(sportello.createdAt).toLocaleDateString())
          );
        } else if (field === 'businessName') {
          result = result.filter(sportello => values.includes(sportello.businessName));
        } else if (field === 'vatNumber') {
          result = result.filter(sportello => values.includes(sportello.vatNumber));
        } else if (field === 'city') {
          result = result.filter(sportello => values.includes(sportello.city));
        } else if (field === 'province') {
          result = result.filter(sportello => values.includes(sportello.province));
        } else if (field === 'email') {
          result = result.filter(sportello => values.includes(sportello.email || '-'));
        } else if (field === 'pec') {
          result = result.filter(sportello => values.includes(sportello.pec || '-'));
        } else if (field === 'commission') {
          result = result.filter(sportello => values.includes(sportello.agreedCommission.toString()));
        } else if (field === 'status') {
          result = result.filter(sportello => values.includes(sportello.isActive !== false ? 'Attivo' : 'Inattivo'));
        }
      }
    });

    setFilteredSportelloLavoros(result);
  }, [searchInputs, selectedFilters, sportelloLavoros]);

  // Position updates on resize and scroll
  useEffect(() => {
    const handleResize = () => {
      if (activeFilterDropdown) positionFilterDropdown(activeFilterDropdown);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeFilterDropdown, positionFilterDropdown]);
  
  useEffect(() => {
    const handleScroll = () => {
      if (activeFilterDropdown) positionFilterDropdown(activeFilterDropdown);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeFilterDropdown, positionFilterDropdown]);

  const handleAddSportelloLavoro = () => navigate('/sportello-lavoro/new');
  const handleViewSportelloLavoro = (id: string) => navigate(`/sportello-lavoro/${id}`);
  const handleEditSportelloLavoro = (id: string) => navigate(`/sportello-lavoro/edit/${id}`);

  const handleDeleteSportelloLavoro = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo Sportello Lavoro?')) {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/sportello-lavoro/${id}`, {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });
        if (response.ok) {
          setSportelloLavoros(sportelloLavoros.filter(s => s._id !== id));
        } else {
          throw new Error('Failed to delete sportello lavoro');
        }
      } catch (err) {
        console.error('Error deleting sportello lavoro:', err);
        setError('Failed to delete sportello lavoro');
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    setSearchInputs({ ...searchInputs, [field]: e.target.value });
  };

  const handleFilterChange = (field: string, value: string, checked: boolean) => {
    setSelectedFilters(prev => {
      const next = [...prev[field]];
      if (checked) next.push(value);
      else {
        const idx = next.indexOf(value);
        if (idx > -1) next.splice(idx, 1);
      }
      return { ...prev, [field]: next };
    });
  };

  const handleSelectAll = (field: string, checked: boolean) => {
    setSelectedFilters(prev => ({
      ...prev,
      [field]: checked ? Array.from(filterOptions[field]) : []
    }));
  };

  const handleFilterOk = () => setActiveFilterDropdown(null);
  const handleFilterCancel = () => setActiveFilterDropdown(null);

  const renderFilterDropdown = (field: string, displayName: string) => (
    <th key={field}>
      <div className="th-content">
        <div className="th-header">
          <span>{displayName}</span>
          {/* keep this matching the query selector */}
          <button
            className="filter-button"
            onClick={() => toggleFilterDropdown(field)}
            title={`Filtra per ${field}`}
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
                  checked={
                    selectedFilters[field].length === filterOptions[field].size &&
                    filterOptions[field].size > 0
                  }
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
        <p>Loading Sportello Lavoro...</p>
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
        <h1>Sportello Lavoro</h1>
        <div className="header-actions">
          <button className="add-button" onClick={handleAddSportelloLavoro}>
            Aggiungi Sportello Lavoro
          </button>
          <button className="upload-button" onClick={() => navigate('/sportello-lavoro/upload')}>
            <span className="upload-icon">⬆️</span> Importa da XLSX
          </button>
        </div>
      </div>

      {sportelloLavoros.length === 0 ? (
        <div className="no-data">
          <p>Nessun Sportello Lavoro trovato. Clicca "Aggiungi Sportello Lavoro" per crearne uno.</p>
        </div>
      ) : (
        <div className="companies-table-container">
          <div className="companies-table-wrapper">
            <table className="companies-table">
              <thead>
                <tr>
                  {renderFilterDropdown('date', 'Data')}
                  {renderFilterDropdown('businessName', 'Ragione Sociale')}
                  {renderFilterDropdown('vatNumber', 'Partita IVA')}
                  {renderFilterDropdown('city', 'Città')}
                  {renderFilterDropdown('province', 'Provincia')}
                  {renderFilterDropdown('email', 'Email')}
                  {renderFilterDropdown('pec', 'PEC')}
                  {renderFilterDropdown('commission', 'Commissione')}
                  {renderFilterDropdown('status', 'Status')}
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredSportelloLavoros.map((sportello) => (
                  <tr key={sportello._id}>
                    <td>{new Date(sportello.createdAt).toLocaleDateString()}</td>
                    <td>{sportello.businessName}</td>
                    <td>{sportello.vatNumber}</td>
                    <td>{sportello.city}</td>
                    <td>{sportello.province}</td>
                    <td>{sportello.email || '-'}</td>
                    <td>{sportello.pec || '-'}</td>
                    <td>%{sportello.agreedCommission}</td>
                    <td>
                      <span className={`status-badge ${sportello.isActive !== false ? 'active' : 'inactive'}`}>
                        {sportello.isActive !== false ? 'Attivo' : 'Inattivo'}
                      </span>
                    </td>
                    <td className="actions">
                      <button 
                        className="view-button"
                        onClick={() => handleViewSportelloLavoro(sportello._id)}
                        title="Visualizza dettagli"
                      >
                        👁️
                      </button>
                      <button 
                        className="edit-button"
                        onClick={() => handleEditSportelloLavoro(sportello._id)}
                        title="Modifica sportello lavoro"
                      >
                        ✏️
                      </button>
                      <button 
                        className="delete-button"
                        onClick={() => handleDeleteSportelloLavoro(sportello._id)}
                        title="Elimina sportello lavoro"
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

export default SportelloLavoroList;
