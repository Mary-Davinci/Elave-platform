// src/pages/Suppliers.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSuppliers, deleteSupplier } from '../services/supplierService';
import { Supplier } from '../services/supplierService';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Suppliers.css';

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const data = await getSuppliers();
        setSuppliers(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching suppliers:', err);
        setError('Failed to load suppliers');
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, [isAuthenticated, navigate]);

  const handleAddSupplier = () => {
    navigate('/fornitori/crea');
  };

  const handleEditSupplier = (id: string) => {
    navigate(`/fornitori/edit/${id}`);
  };

  const handleDeleteConfirmation = (id: string) => {
    setDeleteConfirmation(id);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation(null);
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      await deleteSupplier(id);
      setSuppliers(suppliers.filter(supplier => supplier._id !== id));
      setDeleteConfirmation(null);
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Failed to delete supplier');
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    if (!searchTerm) return true;
    const lowerCaseSearch = searchTerm.toLowerCase();
    return (
      supplier.ragioneSociale.toLowerCase().includes(lowerCaseSearch) ||
      supplier.provincia.toLowerCase().includes(lowerCaseSearch) ||
      supplier.referente.toLowerCase().includes(lowerCaseSearch)
    );
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Caricamento fornitori...</p>
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
    <div className="suppliers-container">
      <header className="page-header">
        <h1>Fornitori</h1>
      </header>

      <div className="search-container">
        <input
          type="text"
          placeholder="Cerca..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="filters-row">
        <div className="filter-group">
          <label>Ragione Sociale</label>
          <input
            type="text"
            placeholder="Filtra per Ragione Sociale"
            className="filter-input"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <label>Referente</label>
          <input
            type="text"
            placeholder="Filtra per Referente"
            className="filter-input"
          />
        </div>
        
        <div className="filter-group">
          <label>Provincia</label>
          <input
            type="text"
            placeholder="Filtra per Provincia"
            className="filter-input"
          />
        </div>
      </div>

      <div className="action-buttons">
        <button className="add-button" onClick={handleAddSupplier}>
          <span className="add-icon">+</span> Crea
        </button>
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className="no-data">
          <p>Nessun fornitore trovato. Clicca "Crea" per aggiungerne uno.</p>
        </div>
      ) : (
        <div className="suppliers-table-container">
          <table className="suppliers-table">
            <thead>
              <tr>
                <th>Ragione Sociale</th>
                <th>Referente</th>
                <th>Provincia</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier._id}>
                  <td>{supplier.ragioneSociale}</td>
                  <td>{supplier.referente}</td>
                  <td>{supplier.provincia}</td>
                  <td className="actions">
                    <button 
                      className="edit-button"
                      onClick={() => handleEditSupplier(supplier._id)}
                    >
                      <i className="edit-icon">✏️</i>
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteConfirmation(supplier._id)}
                    >
                      <i className="delete-icon">🗑️</i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirmation && (
        <div className="delete-confirmation-overlay">
          <div className="delete-confirmation-modal">
            <h3>Conferma eliminazione</h3>
            <p>Sei sicuro di voler eliminare questo fornitore?</p>
            <div className="confirmation-buttons">
              <button 
                className="cancel-button"
                onClick={handleDeleteCancel}
              >
                Annulla
              </button>
              <button 
                className="confirm-button"
                onClick={() => handleDeleteSupplier(deleteConfirmation)}
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;