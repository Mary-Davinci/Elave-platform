import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { segnalatoreService, SegnalatoreResponse } from '../services/segnalatoreService';
import '../styles/Companies.css';

// Same env handling as your list pages; trim trailing slash.
const API_BASE_URL =
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000')
    .replace(/\/+$/, '');

const SegnalatoreDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [item, setItem] = useState<SegnalatoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!id) {
      setError('Missing segnalatore id');
      setLoading(false);
      return;
    }

    const fetchOne = async () => {
      try {
        setLoading(true);
        setError(null);

        const token =
          localStorage.getItem('token') ||
          sessionStorage.getItem('token') ||
          '';

        const res = await fetch(`${API_BASE_URL}/api/segnalatori/${id}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });

        if (res.status === 404) {
          throw new Error('Segnalatore non trovato (404).');
        }
        if (res.status === 403) {
          const text = await res.text().catch(() => '');
          throw new Error(text || 'Access denied (403).');
        }
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `HTTP ${res.status}`);
        }

        const data: SegnalatoreResponse = await res.json();
        setItem(data);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to load segnalatore');
        setLoading(false);
      }
    };

    fetchOne();
  }, [id, isAuthenticated, navigate]);

  const handleBack = () => navigate('/segnalatori');
  const handleEdit = () => item && navigate(`/segnalatori/edit/${item._id}`);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Segnalatore...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button onClick={handleBack}>Back</button>
      </div>
    );
  }

  if (!item) return null;

  // Formatting helpers (you already have these in your service)
  const fullName = segnalatoreService.formatFullName(item.firstName, item.lastName);
  const percentage = segnalatoreService.formatPercentage(item.agreementPercentage);
  const created = new Date(item.createdAt).toLocaleString();
  const statusText = item.isActive !== false ? 'Attivo' : 'Inattivo';

  return (
    <div className="companies-container">
      <div className="companies-header">
        <h1>Dettagli Segnalatore</h1>
        <div className="header-actions">
          <button className="back-button" onClick={handleBack}>← Indietro</button>
          <button className="edit-button" onClick={handleEdit}>✏️ Modifica</button>
        </div>
      </div>

      <div className="card details-card">
        <div className="details-grid">
          <div className="details-item">
            <div className="details-label">Nome Completo</div>
            <div className="details-value">{fullName}</div>
          </div>
          <div className="details-item">
            <div className="details-label">Email</div>
            <div className="details-value">{item.email}</div>
          </div>
          <div className="details-item">
            <div className="details-label">Telefono</div>
            <div className="details-value">{item.phone || '-'}</div>
          </div>
          <div className="details-item">
            <div className="details-label">Città</div>
            <div className="details-value">{item.city}</div>
          </div>
          <div className="details-item">
            <div className="details-label">Provincia</div>
            <div className="details-value">{item.province}</div>
          </div>
          <div className="details-item">
            <div className="details-label">Codice Fiscale</div>
            <div className="details-value">{item.taxCode}</div>
          </div>
          <div className="details-item">
            <div className="details-label">Percentuale Accordo</div>
            <div className="details-value">{percentage}</div>
          </div>
          <div className="details-item">
            <div className="details-label">Specializzazione</div>
            <div className="details-value">{item.specialization || '-'}</div>
          </div>
          <div className="details-item">
            <div className="details-label">Creato il</div>
            <div className="details-value">{created}</div>
          </div>
          <div className="details-item">
            <div className="details-label">Stato</div>
            <div className="details-value">
              <span className={`status-badge ${item.isActive !== false ? 'active' : 'inactive'}`}>
                {statusText}
              </span>
            </div>
          </div>
          <div className="details-item">
            <div className="details-label">ID</div>
            <div className="details-value mono">{item._id}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SegnalatoreDetail;
