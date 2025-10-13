// src/pages/SportelloLavoroEdit.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/NewCompany.css';
import { SportelloLavoroFormData, MinimalAgent } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';

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
  signedContractFile?: FileMeta;
  legalDocumentFile?: FileMeta;
  createdAt: string;
  updatedAt: string;
}

const SportelloLavoroEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // agents
  const [agents, setAgents] = useState<MinimalAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  // form
  const [formData, setFormData] = useState<SportelloLavoroFormData>({
    agentName: '',
    agentId: '',
    businessName: '',
    vatNumber: '',
    address: '',
    city: '',
    postalCode: '',
    province: '',
    agreedCommission: 0,
    email: '',
    pec: ''
  });

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  // files (optional updates)
  const [signedContract, setSignedContract] = useState<File | null>(null);
  const [legalDoc, setLegalDoc] = useState<File | null>(null);

  // existing files to show
  const [existingContract, setExistingContract] = useState<FileMeta | null>(null);
  const [existingLegal, setExistingLegal] = useState<FileMeta | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const signedContractRef = useRef<HTMLInputElement>(null);
  const legalDocRef = useRef<HTMLInputElement>(null);

  const isResponsabile = (user?.role || '').toLowerCase() === 'responsabile_territoriale';

  // fetch agents (for select)
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingAgents(true);
        setAgentsError(null);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        let res = await fetch(`${API_BASE_URL}/api/agenti/list-minimal`, {
          headers,
          credentials: 'include',
        });
        if (!res.ok && res.status === 404) {
          res = await fetch(`${API_BASE_URL}/api/agenti`, { headers, credentials: 'include' });
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const normalized: MinimalAgent[] = (data || []).map((a: any) => ({
          _id: a._id,
          businessName: a.businessName ?? a.name ?? '',
          isApproved: a.isApproved,
          isActive: a.isActive,
          user: a.user,
        }));
        setAgents(normalized);
      } catch (e) {
        console.error('Error fetching agents:', e);
        setAgentsError('Impossibile caricare gli agenti.');
      } finally {
        setIsLoadingAgents(false);
      }
    })();
  }, []);

  // load existing record
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
        const data: SportelloLavoroDetail = await res.json();

        // prefill form
        setFormData({
          agentName: data.agentName || '',
          agentId: '', // backend doesn’t return, keep blank or wire if you add it to API
          businessName: data.businessName,
          vatNumber: data.vatNumber,
          address: data.address,
          city: data.city,
          postalCode: data.postalCode,
          province: data.province,
          agreedCommission: data.agreedCommission,
          email: data.email || '',
          pec: data.pec || ''
        });

        setExistingContract(data.signedContractFile || null);
        setExistingLegal(data.legalDocumentFile || null);
      } catch (e: any) {
        console.error(e);
        setErrors([e?.message || 'Impossibile caricare lo sportello']);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isAuthenticated, navigate]);

  const handleDeleteFile = (type: 'contract' | 'legal') => {
    if (type === 'contract') {
      setSignedContract(null);
      if (signedContractRef.current) signedContractRef.current.value = '';
    } else {
      setLegalDoc(null);
      if (legalDocRef.current) legalDocRef.current.value = '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'agreedCommission' ? parseFloat(value) || 0 : value
    }));
    if (errors.length) setErrors([]);
    if (successMessage) setSuccessMessage('');
  };

  const handleAgentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = agents.find(a => a._id === selectedId);
    setFormData(prev => ({
      ...prev,
      agentId: selectedId,
      businessName: selected?.businessName || prev.businessName,
      agentName: selected?.businessName || prev.agentName
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, kind: 'contract' | 'legal') => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const allowed = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/jpg', 'image/png'
      ];
      if (!allowed.includes(file.type)) {
        setErrors(['Solo PDF, DOC, DOCX, JPG, JPEG, PNG sono consentiti']);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(['Dimensione massima 5MB']);
        return;
      }
    }
    if (kind === 'contract') setSignedContract(file);
    else setLegalDoc(file);
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    if (!formData.businessName.trim()) newErrors.push('Ragione Sociale is required');
    if (!formData.vatNumber.trim()) newErrors.push('Partita IVA is required');
    if (!formData.address.trim()) newErrors.push('Indirizzo is required');
    if (!formData.city.trim()) newErrors.push('Città is required');
    if (!formData.postalCode.trim()) newErrors.push('CAP is required');
    if (!formData.province.trim()) newErrors.push('Provincia is required');
    if (!formData.agreedCommission || formData.agreedCommission <= 0) {
      newErrors.push('Competenze concordate must be > 0');
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.push('Email non valida');
    }
    if (formData.pec && !/\S+@\S+\.\S+/.test(formData.pec)) {
      newErrors.push('PEC non valida');
    }
    setErrors(newErrors);
    return newErrors.length === 0;
    };

  const downloadExisting = async (kind: 'contract' | 'legal') => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/sportello-lavoro/${id}/download/${kind}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Download fallito (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const name =
        kind === 'contract'
          ? (existingContract?.originalName || 'contratto.pdf')
          : (existingLegal?.originalName || 'documento_legale.pdf');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Download fallito');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setErrors([]);
      setSuccessMessage('');

      const fd = new FormData();
      // append only the fields we want to update
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          fd.append(k, String(v));
        }
      });
      if (signedContract) fd.append('signedContractFile', signedContract);
      if (legalDoc) fd.append('legalDocumentFile', legalDoc);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/sportello-lavoro/${id}`, {
        method: 'PUT',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: fd,
      });

      const json = await res.json();
      if (!res.ok) {
        if (json?.errors && Array.isArray(json.errors)) setErrors(json.errors);
        else setErrors([json?.error || 'Errore salvataggio']);
        return;
      }

      setSuccessMessage('Modifiche salvate con successo!');
      // refresh existing file names if they changed
      setExistingContract(json.signedContractFile || existingContract);
      setExistingLegal(json.legalDocumentFile || existingLegal);
      // clear chosen files
      setSignedContract(null);
      setLegalDoc(null);
      if (signedContractRef.current) signedContractRef.current.value = '';
      if (legalDocRef.current) legalDocRef.current.value = '';
    } catch (e) {
      console.error(e);
      setErrors(['Errore di rete. Riprova.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Caricamento…</p>
      </div>
    );
  }

  return (
    <div className="new-company-container">
      <div className="new-company-header">
        <h1 className="page-title">Modifica Sportello Lavoro</h1>
        <div className="header-actions">
          <button className="upload-button" onClick={() => navigate(-1)}>← Indietro</button>
        </div>
      </div>

      <div className="new-company-form">
        {successMessage && (
          <div className="alert alert-success" style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb', color: '#155724', padding: 10, borderRadius: 4, marginBottom: 20 }}>
            {successMessage}
          </div>
        )}

        {errors.length > 0 && (
          <div className="alert alert-danger" style={{ backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', padding: 10, borderRadius: 4, marginBottom: 20 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* Info */}
        <div className="form-section">
          <h2>Informazioni Azienda</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="agentId">Ragione Sociale *</label>
              <select
                id="agentId"
                name="agentId"
                value={formData.agentId || ''}
                onChange={handleAgentSelect}
                disabled={isSubmitting || isLoadingAgents || isResponsabile}
              >
                <option value="">{isLoadingAgents ? 'Caricamento agenti…' : 'Seleziona un agente'}</option>
                {agents.map(a => (
                  <option key={a._id} value={a._id}>{a.businessName}</option>
                ))}
              </select>
              {agentsError && <small style={{ color: '#b00020', display: 'block', marginTop: 6 }}>{agentsError}</small>}
            </div>

            <div className="form-group">
              <label htmlFor="agentName">Nome Agente *</label>
              <input id="agentName" name="agentName" value={formData.agentName} onChange={handleChange} disabled={isSubmitting} required />
            </div>

            <div className="form-group">
              <label htmlFor="vatNumber">Partita IVA *</label>
              <input id="vatNumber" name="vatNumber" value={formData.vatNumber} onChange={handleChange} disabled={isSubmitting} required />
            </div>

            <div className="form-group">
              <label htmlFor="address">Indirizzo *</label>
              <input id="address" name="address" value={formData.address} onChange={handleChange} disabled={isSubmitting} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">Città *</label>
              <input id="city" name="city" value={formData.city} onChange={handleChange} disabled={isSubmitting} required />
            </div>
            <div className="form-group">
              <label htmlFor="postalCode">CAP *</label>
              <input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleChange} disabled={isSubmitting} required />
            </div>
            <div className="form-group">
              <label htmlFor="province">Provincia *</label>
              <input id="province" name="province" value={formData.province} onChange={handleChange} disabled={isSubmitting} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="agreedCommission">Competenze concordate al (%) *</label>
              <input type="number" id="agreedCommission" name="agreedCommission" value={formData.agreedCommission || ''} onChange={handleChange} min="0" step="0.01" disabled={isSubmitting} required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} disabled={isSubmitting} />
            </div>
            <div className="form-group">
              <label htmlFor="pec">PEC</label>
              <input type="email" id="pec" name="pec" value={formData.pec} onChange={handleChange} disabled={isSubmitting} />
            </div>
          </div>
        </div>

        {/* Files */}
        <div className="upload-form-container">
          <div className="form-group">
            <label htmlFor="signed-contract-upload">Contratto Firmato</label>
            {existingContract ? (
              <div style={{ marginBottom: 8 }}>
                <small><strong>Corrente:</strong> {existingContract.originalName} ({Math.round(existingContract.size / 1024)} KB)</small>
                <button className="upload-button" style={{ marginLeft: 8 }} onClick={() => downloadExisting('contract')}>Scarica</button>
              </div>
            ) : <small>- Nessun file — puoi caricarne uno</small>}
            <div className="file-input-wrapper">
              <div className="file-select">
                <input
                  type="file"
                  id="signed-contract-upload"
                  ref={signedContractRef}
                  onChange={(e) => handleFileChange(e, 'contract')}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="file-input"
                  disabled={isSubmitting}
                />
                <div className="file-select-button">Choose File</div>
                <div className="file-select-name">
                  {signedContract ? signedContract.name : 'No file chosen'}
                </div>
              </div>
            </div>
            {signedContract && (
              <button type="button" className="delete-file-button" onClick={() => handleDeleteFile('contract')} disabled={isSubmitting}>
                ❌ Remove File
              </button>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="legal-doc-upload">Documento Legale</label>
            {existingLegal ? (
              <div style={{ marginBottom: 8 }}>
                <small><strong>Corrente:</strong> {existingLegal.originalName} ({Math.round(existingLegal.size / 1024)} KB)</small>
                <button className="upload-button" style={{ marginLeft: 8 }} onClick={() => downloadExisting('legal')}>Scarica</button>
              </div>
            ) : <small>- Nessun file — puoi caricarne uno</small>}
            <div className="file-input-wrapper">
              <div className="file-select">
                <input
                  type="file"
                  id="legal-doc-upload"
                  ref={legalDocRef}
                  onChange={(e) => handleFileChange(e, 'legal')}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="file-input"
                  disabled={isSubmitting}
                />
                <div className="file-select-button">Choose File</div>
                <div className="file-select-name">
                  {legalDoc ? legalDoc.name : 'No file chosen'}
                </div>
              </div>
            </div>
            {legalDoc && (
              <button type="button" className="delete-file-button" onClick={() => handleDeleteFile('legal')} disabled={isSubmitting}>
                ❌ Remove File
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button type="button" className="submit-button" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SportelloLavoroEdit;
