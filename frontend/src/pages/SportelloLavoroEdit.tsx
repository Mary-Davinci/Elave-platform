import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/NewCompany.css';
import { SportelloLavoroFormData, FormTemplate, MinimalAgent } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL =
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000')
    .replace(/\/+$/, '');

type SportelloLavoroResponse = SportelloLavoroFormData & {
  _id: string;
  createdAt?: string;
  isActive?: boolean;
  // if backend returns file names/urls, we’ll show them
  signedContractFile?: string;
  legalDocumentFile?: string;
  signedContractUrl?: string;
  legalDocumentUrl?: string;
  agent?: { _id: string; businessName?: string } | string;
};

const SportelloLavoroEdit: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Agents
  const [agents, setAgents] = useState<MinimalAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  // Form (same shape as your add page)
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

  // Existing file links (if API provides)
  const [existingSignedContractUrl, setExistingSignedContractUrl] = useState<string | null>(null);
  const [existingLegalUrl, setExistingLegalUrl] = useState<string | null>(null);

  // New selected files (optional replacement)
  const [signedContract, setSignedContract] = useState<File | null>(null);
  const [legalDoc, setLegalDoc] = useState<File | null>(null);

  // Templates (same as add page)
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [contractTemplate, setContractTemplate] = useState<File | null>(null);
  const [legalTemplate, setLegalTemplate] = useState<File | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [templateUploadMessage, setTemplateUploadMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Refs
  const signedContractRef = useRef<HTMLInputElement>(null);
  const legalDocRef = useRef<HTMLInputElement>(null);
  const contractTemplateRef = useRef<HTMLInputElement>(null);
  const legalTemplateRef = useRef<HTMLInputElement>(null);

  // Roles
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isResponsabile = role === 'responsabile_territoriale';
  const isSportelloLike = role === 'sportello_lavoro' || isResponsabile || isAdmin;

  // ---- Load minimal agents for select ----
  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoadingAgents(true);
      setAgentsError(null);
      try {
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
      } catch (err) {
        console.error('Error fetching agents:', err);
        setAgentsError('Impossibile caricare gli agenti.');
      } finally {
        setIsLoadingAgents(false);
      }
    };
    fetchAgents();
  }, []);

  // ---- Load existing Sportello Lavoro by id ----
  useEffect(() => {
    if (!id) {
      setErrors(['Missing sportello-lavoro id']);
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/sportello-lavoro/${id}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: 'include',
        });

        if (res.status === 404) throw new Error('Sportello Lavoro non trovato (404).');
        if (res.status === 403) {
          const t = await res.text().catch(() => '');
          throw new Error(t || 'Access denied (403).');
        }
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(t || `HTTP ${res.status}`);
        }

        const data: SportelloLavoroResponse = await res.json();

        // Normalize agentId/businessName
        let agentId = data.agentId || '';
        let businessName = data.businessName || '';
        if (!agentId && data.agent) {
          // agent might be an id string or populated object
          agentId = typeof data.agent === 'string' ? data.agent : data.agent?._id || '';
          businessName = businessName || (typeof data.agent === 'string' ? '' : (data.agent?.businessName || ''));
        }

        setFormData({
          agentName: data.agentName || businessName || '',
          agentId,
          businessName: businessName,
          vatNumber: data.vatNumber || '',
          address: data.address || '',
          city: data.city || '',
          postalCode: data.postalCode || '',
          province: data.province || '',
          agreedCommission: Number(data.agreedCommission ?? 0),
          email: data.email || '',
          pec: data.pec || '',
        });

        // Existing file links (best-effort)
        setExistingSignedContractUrl(data.signedContractUrl || data.signedContractFile || null);
        setExistingLegalUrl(data.legalDocumentUrl || data.legalDocumentFile || null);

        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setErrors([err?.message || 'Errore nel caricamento dei dati']);
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // ---- Templates fetch (same as add) ----
  useEffect(() => {
    const fetchFormTemplates = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/form-templates/sportello-lavoro`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: 'include',
        });
        if (response.ok) {
          setFormTemplates(await response.json());
        }
      } catch (error) {
        console.error('Error fetching form templates:', error);
      }
    };
    fetchFormTemplates();
  }, []);

  const getAvailableTemplate = (type: 'contract' | 'legal') =>
    formTemplates.find((t) => t.type === type);

  // ---- Handlers (same behavior as add page) ----
  const handleDeleteFile = (type: 'contract' | 'legal') => {
    if (type === 'contract') {
      setSignedContract(null);
      if (signedContractRef.current) signedContractRef.current.value = '';
    } else {
      setLegalDoc(null);
      if (legalDocRef.current) legalDocRef.current.value = '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'agreedCommission' ? parseFloat(value) || 0 : value,
    }));
    if (errors.length) setErrors([]);
    if (successMessage) setSuccessMessage('');
  };

  const handleAgentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = agents.find((a) => a._id === selectedId);
    setFormData((prev) => ({
      ...prev,
      agentId: selectedId,
      businessName: selected?.businessName || '',
      agentName: selected?.businessName || prev.agentName,
    }));
    if (errors.length) setErrors([]);
    if (successMessage) setSuccessMessage('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'contract' | 'legal') => {
    const file = e.target.files?.[0] || null;

    if (file) {
      const allowed = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ];
      if (!allowed.includes(file.type)) {
        setErrors(['Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed for documents!']);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(['File size must be less than 5MB']);
        return;
      }
    }

    if (fileType === 'contract') setSignedContract(file);
    else setLegalDoc(file);
  };

  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'contract' | 'legal') => {
    const file = e.target.files?.[0] || null;
    if (type === 'contract') setContractTemplate(file);
    else setLegalTemplate(file);
  };

  const handleUploadTemplate = async (type: 'contract' | 'legal') => {
    const file = type === 'contract' ? contractTemplate : legalTemplate;
    if (!file) return;

    setIsUploadingTemplate(true);
    setTemplateUploadMessage('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('template', file);
      uploadFormData.append('type', type);
      uploadFormData.append('category', 'sportello-lavoro');

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/form-templates`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: uploadFormData,
      });

      if (!response.ok) {
        const j = await response.json().catch(() => ({}));
        throw new Error(j.error || 'Errore nel caricamento del template');
      }

      setTemplateUploadMessage(
        `${type === 'contract' ? 'Contratto' : 'Documento Legale'} template caricato con successo!`
      );

      if (type === 'contract') {
        setContractTemplate(null);
        if (contractTemplateRef.current) contractTemplateRef.current.value = '';
      } else {
        setLegalTemplate(null);
        if (legalTemplateRef.current) legalTemplateRef.current.value = '';
      }

      // Refresh templates
      const response2 = await fetch(`${API_BASE_URL}/api/form-templates/sportello-lavoro`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
      });
      if (response2.ok) setFormTemplates(await response2.json());
    } catch (error: any) {
      setTemplateUploadMessage(error.message || 'Errore di rete. Riprova.');
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  const handleDownloadTemplate = async (type: 'contract' | 'legal') => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/form-templates/download/sportello-lavoro/${type}`,
        {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const j = await response.json().catch(() => ({}));
        throw new Error(j.error || `Impossibile scaricare il template ${type}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename =
        getAvailableTemplate(type)?.originalName || `sportello_lavoro_${type}_template.pdf`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      setErrors([error.message || 'Errore di rete. Riprova.']);
    }
  };

  // ---- Validation (same spirit as add page) ----
  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.agentId) newErrors.push('Seleziona una Ragione Sociale (Agente)');
    if (!formData.vatNumber.trim()) newErrors.push('Partita IVA is required');
    if (!formData.address.trim()) newErrors.push('Indirizzo is required');
    if (!formData.city.trim()) newErrors.push('Città is required');
    if (!formData.postalCode.trim()) newErrors.push('CAP is required');
    if (!formData.province.trim()) newErrors.push('Provincia is required');
    if (!formData.agreedCommission || formData.agreedCommission <= 0) {
      newErrors.push('Competenze concordate is required and must be greater than 0');
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.push('Please enter a valid email address');
    }
    if (formData.pec && !/\S+@\S+\.\S+/.test(formData.pec)) {
      newErrors.push('Please enter a valid PEC address');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // ---- Submit (PUT multipart) ----
  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors([]);
    setSuccessMessage('');

    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => fd.append(k, String(v ?? '')));

      // Only append new files if replacing
      if (signedContract) fd.append('signedContractFile', signedContract);
      if (legalDoc) fd.append('legalDocumentFile', legalDoc);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/sportello-lavoro/${id}`, {
        method: 'PUT',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } as any,
        credentials: 'include',
        body: fd,
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (j.errors && Array.isArray(j.errors)) setErrors(j.errors);
        else setErrors([j.error || `HTTP ${res.status}`]);
        return;
      }

      setSuccessMessage('Sportello Lavoro aggiornato con successo!');
      navigate(`/sportello-lavoro/${id}`);
    } catch (err) {
      console.error('Error updating Sportello Lavoro:', err);
      setErrors(['Network error. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="new-company-container">
        <div className="new-company-header">
          <h1 className="page-title">Modifica Sportello Lavoro</h1>
        </div>
        <p style={{ padding: 16 }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="new-company-container">
      <div className="new-company-header">
        <h1 className="page-title">Modifica Sportello Lavoro</h1>
      </div>

      {/* Template Management Section */}
      {isAdmin ? (
        <div
          className="template-management-section"
          style={{
            backgroundColor: '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '32px',
            border: '1px solid #e1e5e9',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '2px solid #f8f9fa',
            }}
          >
            <div
              style={{
                backgroundColor: '#e3f2fd',
                padding: '8px',
                borderRadius: '8px',
                marginRight: '12px',
              }}
            >
              <span style={{ fontSize: '20px' }}>⚙️</span>
            </div>
            <h3
              style={{
                margin: 0,
                color: '#2c3e50',
                fontSize: '20px',
                fontWeight: '600',
              }}
            >
              Gestione Moduli Sportello Lavoro (Admin)
            </h3>
          </div>

          {templateUploadMessage && (
            <div
              className="alert"
              style={{
                backgroundColor: templateUploadMessage.includes('successo') ? '#d1f2eb' : '#fadbd8',
                border: `1px solid ${templateUploadMessage.includes('successo') ? '#a3e4d7' : '#f1948a'}`,
                color: templateUploadMessage.includes('successo') ? '#0e6655' : '#922b21',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              <span style={{ marginRight: '8px' }}>
                {templateUploadMessage.includes('successo') ? '✅' : '❌'}
              </span>
              {templateUploadMessage}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '31% 31%', gap: '24px' }}>
            {/* Contract Template Upload */}
            <div
              className="template-upload-group"
              style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid #e9ecef',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px', marginRight: '8px' }}>📄</span>
                <label
                  style={{
                    display: 'block',
                    margin: 0,
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: '16px',
                  }}
                >
                  Carica Modulo Contratto Sportello
                </label>
                {getAvailableTemplate('contract') && (
                  <span
                    style={{
                      color: '#28a745',
                      fontSize: '12px',
                      marginLeft: '12px',
                      backgroundColor: '#d4edda',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: '500',
                    }}
                  >
                    ✓ Disponibile
                  </span>
                )}
              </div>
              <input
                type="file"
                ref={contractTemplateRef}
                onChange={(e) => handleTemplateFileChange(e, 'contract')}
                accept=".pdf,.doc,.docx"
                style={{
                  marginBottom: '12px',
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                disabled={isUploadingTemplate}
              />
              <button
                type="button"
                onClick={() => handleUploadTemplate('contract')}
                disabled={!contractTemplate || isUploadingTemplate}
                style={{
                  backgroundColor:
                    contractTemplate && !isUploadingTemplate ? 'var(--primary-color)' : '#6c757d',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: contractTemplate && !isUploadingTemplate ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  width: '100%',
                }}
              >
                {isUploadingTemplate ? '⏳ Caricamento...' : '📤 Carica Contratto'}
              </button>
            </div>

            {/* Legal Template Upload */}
            <div
              className="template-upload-group"
              style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid #e9ecef',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px', marginRight: '8px' }}>📋</span>
                <label
                  style={{
                    display: 'block',
                    margin: 0,
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: '16px',
                  }}
                >
                  Carica Documento Legale Sportello
                </label>
                {getAvailableTemplate('legal') && (
                  <span
                    style={{
                      color: '#28a745',
                      fontSize: '12px',
                      marginLeft: '12px',
                      backgroundColor: '#d4edda',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: '500',
                    }}
                  >
                    ✓ Disponibile
                  </span>
                )}
              </div>
              <input
                type="file"
                ref={legalTemplateRef}
                onChange={(e) => handleTemplateFileChange(e, 'legal')}
                accept=".pdf,.doc,.docx"
                style={{
                  marginBottom: '12px',
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                disabled={isUploadingTemplate}
              />
              <button
                type="button"
                onClick={() => handleUploadTemplate('legal')}
                disabled={!legalTemplate || isUploadingTemplate}
                style={{
                  backgroundColor:
                    legalTemplate && !isUploadingTemplate ? 'var(--primary-color)' : '#6c757d',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: legalTemplate && !isUploadingTemplate ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  width: '100%',
                }}
              >
                {isUploadingTemplate ? '⏳ Caricamento...' : '📤 Carica Documento'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="template-download-section"
          style={{
            backgroundColor: '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '32px',
            border: '1px solid #e1e5e9',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '16px',
              borderBottom: '2px solid #f8f9fa',
            }}
          >
            <div style={{ backgroundColor: '#e8f4f8', padding: '8px', borderRadius: '8px', marginRight: '12px' }}>
              <span style={{ fontSize: '20px' }}>📥</span>
            </div>
            <h3 style={{ margin: 0, color: '#0c5460', fontSize: '20px', fontWeight: '600' }}>
              Scarica Moduli Sportello Lavoro
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleDownloadTemplate('contract')}
              disabled={!getAvailableTemplate('contract')}
              className="submit-button"
              style={{ minWidth: 220 }}
            >
              📄 Scarica Contratto Sportello
            </button>
            <button
              type="button"
              onClick={() => handleDownloadTemplate('legal')}
              disabled={!getAvailableTemplate('legal')}
              className="submit-button"
              style={{ minWidth: 220 }}
            >
              📋 Scarica Documento Legale
            </button>
          </div>
        </div>
      )}

      <div className="new-company-form">
        {successMessage && (
          <div
            className="alert alert-success"
            style={{
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              color: '#155724',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            {successMessage}
          </div>
        )}

        {errors.length > 0 && (
          <div
            className="alert alert-danger"
            style={{
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              color: '#721c24',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Informazioni Azienda */}
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
                required
                disabled={isSubmitting || isLoadingAgents || isResponsabile}
              >
                <option value="">
                  {isLoadingAgents ? 'Caricamento agenti…' : 'Seleziona un agente'}
                </option>
                {agents.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.businessName}
                  </option>
                ))}
              </select>
              {agentsError && (
                <small style={{ color: '#b00020', display: 'block', marginTop: 6 }}>{agentsError}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="agentName">Nome Agente *</label>
              <input
                type="text"
                id="agentName"
                name="agentName"
                value={formData.agentName}
                onChange={handleChange}
                required
                placeholder="Inserisci il nome dell'agente"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="vatNumber">Partita IVA *</label>
              <input
                type="text"
                id="vatNumber"
                name="vatNumber"
                value={formData.vatNumber}
                onChange={handleChange}
                required
                placeholder="Inserisci la partita IVA"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Indirizzo *</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                placeholder="Inserisci l'indirizzo"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">Città *</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                placeholder="Inserisci la città"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="postalCode">CAP *</label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                required
                placeholder="Inserisci il CAP"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="province">Provincia *</label>
              <input
                type="text"
                id="province"
                name="province"
                value={formData.province}
                onChange={handleChange}
                required
                placeholder="Inserisci la provincia"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="agreedCommission">Competenze concordate al (%) *</label>
              <input
                type="number"
                id="agreedCommission"
                name="agreedCommission"
                value={formData.agreedCommission || 0}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="Inserisci la percentuale"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Inserisci l'email"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="pec">PEC</label>
              <input
                type="email"
                id="pec"
                name="pec"
                value={formData.pec}
                onChange={handleChange}
                placeholder="Inserisci la PEC"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Files */}
        <div className="upload-form-container">
          {/* Existing links if available */}
          {(existingSignedContractUrl || existingLegalUrl) && (
            <div className="form-row" style={{ marginBottom: 10 }}>
              {existingSignedContractUrl && (
                <div className="form-group">
                  <label>Contratto Firmato (esistente)</label>
                  <div>
                    <a href={existingSignedContractUrl} target="_blank" rel="noreferrer">
                      Apri documento
                    </a>
                  </div>
                </div>
              )}
              {existingLegalUrl && (
                <div className="form-group">
                  <label>Documento Legale (esistente)</label>
                  <div>
                    <a href={existingLegalUrl} target="_blank" rel="noreferrer">
                      Apri documento
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Replace files if needed */}
          <div className="form-group">
            <label htmlFor="signed-contract-upload">Contratto Firmato (sostituisci)</label>
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
              <button
                type="button"
                className="delete-file-button"
                onClick={() => handleDeleteFile('contract')}
                disabled={isSubmitting}
              >
                ❌ Remove File
              </button>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="legal-doc-upload">Documento Legale (sostituisci)</label>
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
              <button
                type="button"
                className="delete-file-button"
                onClick={() => handleDeleteFile('legal')}
                disabled={isSubmitting}
              >
                ❌ Remove File
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button type="button" className="submit-button" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? 'Salvataggio in corso...' : 'Salva Modifiche'}
          </button>
          <button
            type="button"
            className="delete-file-button"
            style={{ marginLeft: 8 }}
            onClick={() => navigate(`/sportello-lavoro/${id}`)}
            disabled={isSubmitting}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};

export default SportelloLavoroEdit;
