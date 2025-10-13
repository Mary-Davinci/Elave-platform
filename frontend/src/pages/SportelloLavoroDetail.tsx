import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Companies.css'; // reuse your styles

// same API base you use elsewhere
const API_BASE_URL =
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000')
    .replace(/\/+$/, '');

type FileMeta = {
  filename: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
};

interface SportelloLavoroDetail {
  _id: string;
  agentName?: string;
  businessName: string;
  vatNumber: string;
  address: string;
  city: string;
  postalCode: string;
  province: string;
  agreedCommission: number;
  email?: string;
  pec?: string;
  isActive?: boolean;
  isApproved?: boolean;
  pendingApproval?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  signedContractFile?: FileMeta;
  legalDocumentFile?: FileMeta;
  createdAt: string;
  updatedAt: string;
}

const SportelloLavoroDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<SportelloLavoroDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<'contract' | 'legal' | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/sportello-lavoro/${id}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: 'include',
        });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || `HTTP ${res.status}`);
        }
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setErr(e?.message || 'Errore nel caricamento');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isAuthenticated, navigate]);

  const download = async (kind: 'contract' | 'legal') => {
    if (!id) return;
    try {
      setDownloading(kind);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/sportello-lavoro/${id}/download/${kind}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fallback = kind === 'contract' ? 'contratto.pdf' : 'documento_legale.pdf';
      const name =
        (kind === 'contract' ? data?.signedContractFile?.originalName : data?.legalDocumentFile?.originalName) ||
        fallback;
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Download fallito');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Caricamento dettagli…</p>
      </div>
    );
  }
  if (err || !data) {
    return (
      <div className="error-container">
        <h2>Impossibile caricare lo Sportello</h2>
        <p>{err || 'Dati non disponibili'}</p>
        <button onClick={() => navigate(-1)}>Torna indietro</button>
      </div>
    );
  }

  const StatusBadge = ({ on }: { on: boolean }) => (
    <span className={`status-badge ${on ? 'active' : 'inactive'}`}>{on ? 'Attivo' : 'Inattivo'}</span>
  );

  return (
    <div className="companies-container">
      <div className="companies-header">
        <h1>Dettagli Sportello</h1>
        <div className="header-actions">
          <button className="add-button" onClick={() => navigate(`/sportello-lavoro/edit/${data._id}`)}>
            Modifica
          </button>
          <button className="upload-button" onClick={() => navigate(-1)}>
            ← Indietro
          </button>
        </div>
      </div>

      <div className="companies-table-container" style={{ padding: 0 }}>
        <div className="company-card" style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <h3 style={{ marginTop: 0 }}>{data.businessName}</h3>
              <p><strong>Agente:</strong> {data.agentName || '-'}</p>
              <p><strong>P. IVA:</strong> {data.vatNumber}</p>
              <p><strong>Indirizzo:</strong> {data.address}, {data.postalCode} {data.city} ({data.province})</p>
              <p><strong>Email:</strong> {data.email || '-'}</p>
              <p><strong>PEC:</strong> {data.pec || '-'}</p>
            </div>
            <div>
              <p><strong>Commissione:</strong> {data.agreedCommission}%</p>
              <p><strong>Creato il:</strong> {new Date(data.createdAt).toLocaleString()}</p>
              <p><strong>Aggiornato il:</strong> {new Date(data.updatedAt).toLocaleString()}</p>
              <p><strong>Stato:</strong> <StatusBadge on={data.isActive !== false} /></p>
              {typeof data.isApproved !== 'undefined' && (
                <p><strong>Approvazione:</strong> {data.isApproved ? 'Approvato' : (data.pendingApproval ? 'In attesa' : 'Non approvato')}</p>
              )}
            </div>
          </div>

          <hr style={{ margin: '20px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
              <h4 style={{ marginTop: 0 }}>Contratto Firmato</h4>
              {data.signedContractFile ? (
                <>
                  <p style={{ marginBottom: 8 }}>
                    <strong>File:</strong> {data.signedContractFile.originalName} ({Math.round(data.signedContractFile.size / 1024)} KB)
                  </p>
                  <button
                    className="upload-button"
                    disabled={downloading === 'contract'}
                    onClick={() => download('contract')}
                  >
                    {downloading === 'contract' ? 'Download…' : 'Scarica Contratto'}
                  </button>
                </>
              ) : (
                <p>-</p>
              )}
            </div>

            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
              <h4 style={{ marginTop: 0 }}>Documento Legale</h4>
              {data.legalDocumentFile ? (
                <>
                  <p style={{ marginBottom: 8 }}>
                    <strong>File:</strong> {data.legalDocumentFile.originalName} ({Math.round(data.legalDocumentFile.size / 1024)} KB)
                  </p>
                  <button
                    className="upload-button"
                    disabled={downloading === 'legal'}
                    onClick={() => download('legal')}
                  >
                    {downloading === 'legal' ? 'Download…' : 'Scarica Documento'}
                  </button>
                </>
              ) : (
                <p>-</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SportelloLavoroDetail;
