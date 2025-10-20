import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/NewCompany.css';
import { SegnalatoreFormData, FormTemplate } from '../types/interfaces';
import { segnalatoreService } from '../services/segnalatoreService';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL =
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000')
    .replace(/\/+$/, '');

type SegnalatoreResponse = SegnalatoreFormData & {
  _id: string;
  createdAt: string;
  isActive?: boolean;
  // possible file/url fields if your API returns them; kept optional
  contractFile?: string;
  idDocumentFile?: string;
  contractFileUrl?: string;
  idDocumentFileUrl?: string;
};

const SegnalatoreEditForm: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ---- ROLES (same logic you used) ----
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSportelloLavoro =
    user?.role === 'sportello_lavoro' || user?.role === 'responsabile_territoriale' || isAdmin;

  // ---- FORM STATE (same shape as add) ----
  const [formData, setFormData] = useState<SegnalatoreFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    province: '',
    taxCode: '',
    agreementPercentage: 0,
    specialization: '',
    notes: ''
  });

  // keep existing file preview/links if API returns them
  const [existingContractUrl, setExistingContractUrl] = useState<string | null>(null);
  const [existingIdDocUrl, setExistingIdDocUrl] = useState<string | null>(null);

  // uploads (optional)
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);

  // templates (same as add)
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [contractTemplate, setContractTemplate] = useState<File | null>(null);
  const [idTemplate, setIdTemplate] = useState<File | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [templateUploadMessage, setTemplateUploadMessage] = useState('');

  // ui state
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  // refs
  const contractFileRef = useRef<HTMLInputElement>(null);
  const idDocumentFileRef = useRef<HTMLInputElement>(null);
  const contractTemplateRef = useRef<HTMLInputElement>(null);
  const idTemplateRef = useRef<HTMLInputElement>(null);

  // ---- Helpers (same as add) ----
  const getAvailableTemplate = (type: 'contract' | 'id') =>
    formTemplates.find(t => t.type === type);

  const handleDeleteFile = (type: 'contract' | 'id') => {
    if (type === 'contract') {
      setContractFile(null);
      if (contractFileRef.current) contractFileRef.current.value = '';
    } else {
      setIdDocumentFile(null);
      if (idDocumentFileRef.current) idDocumentFileRef.current.value = '';
    }
  };

  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'contract' | 'id') => {
    const file = e.target.files?.[0] || null;
    if (type === 'contract') setContractTemplate(file);
    else setIdTemplate(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'contract' | 'id') => {
    const file = e.target.files?.[0] || null;

    if (file) {
      const allowedTypes = segnalatoreService.getDocumentAllowedTypes();
      const maxSize = 5 * 1024 * 1024;
      const validation = segnalatoreService.validateFile(file, allowedTypes, maxSize);
      if (!validation.valid) {
        setErrors([validation.error || 'Invalid file']);
        return;
      }
    }

    if (fileType === 'contract') setContractFile(file);
    else setIdDocumentFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'agreementPercentage' ? parseFloat(value) || 0 : value
    }));
    if (errors.length) setErrors([]);
    if (successMessage) setSuccessMessage('');
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    const f = formData;

    if (!f.firstName.trim()) newErrors.push("Nome is required");
    if (!f.lastName.trim()) newErrors.push("Cognome is required");
    if (!f.email.trim()) newErrors.push("Email is required");
    if (!f.address.trim()) newErrors.push("Indirizzo is required");
    if (!f.city.trim()) newErrors.push("Città is required");
    if (!f.postalCode.trim()) newErrors.push("CAP is required");
    if (!f.province.trim()) newErrors.push("Provincia is required");
    if (!f.taxCode.trim()) newErrors.push("Codice Fiscale is required");
    if (!f.agreementPercentage || f.agreementPercentage <= 0) {
      newErrors.push("Percentuale accordo is required and must be greater than 0");
    }
    if (!segnalatoreService.validatePercentage(f.agreementPercentage)) {
      newErrors.push("Percentuale accordo cannot exceed 100%");
    }
    if (f.email && !segnalatoreService.validateEmail(f.email)) {
      newErrors.push("Please enter a valid email address");
    }
    if (f.taxCode && !segnalatoreService.validateTaxCode(f.taxCode)) {
      newErrors.push("Please enter a valid Italian tax code");
    }
    if (f.postalCode && !segnalatoreService.validatePostalCode(f.postalCode)) {
      newErrors.push("Please enter a valid postal code");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // ---- Templates fetch (same as add) ----
  useEffect(() => {
    const fetchFormTemplates = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/form-templates/segnalatore`, {
          headers: { Authorization: `Bearer ${token || ''}` },
          credentials: 'include',
        });
        if (res.ok) {
          const templates = await res.json();
          setFormTemplates(templates);
        }
      } catch (e) {
        console.error('Error fetching templates:', e);
      }
    };
    fetchFormTemplates();
  }, []);

  // ---- Load existing segnalatore ----
  useEffect(() => {
    let abort = false;
    const load = async () => {
      if (!id) {
        setErrors(['Missing segnalatore id']);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/segnalatori/${id}`, {
          headers: { Authorization: `Bearer ${token || ''}` },
          credentials: 'include',
        });

        if (res.status === 404) throw new Error('Segnalatore non trovato (404).');
        if (res.status === 403) {
          const t = await res.text().catch(() => '');
          throw new Error(t || 'Access denied (403).');
        }
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(t || `HTTP ${res.status}`);
        }

        const data: SegnalatoreResponse = await res.json();
        if (abort) return;

        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          postalCode: data.postalCode || '',
          province: data.province || '',
          taxCode: data.taxCode || '',
          agreementPercentage: Number(data.agreementPercentage ?? 0),
          specialization: data.specialization || '',
          notes: data.notes || ''
        });

        // try to show existing files if your API returns URLs
        setExistingContractUrl(data.contractFileUrl || data.contractFile || null);
        setExistingIdDocUrl(data.idDocumentFileUrl || data.idDocumentFile || null);

        setLoading(false);
      } catch (err: any) {
        setErrors([err?.message || 'Failed to load segnalatore']);
        setLoading(false);
      }
    };

    load();
    return () => { abort = true; };
  }, [id]);

  // ---- Template upload/download (same as add) ----
  const handleUploadTemplate = async (type: 'contract' | 'id') => {
    const file = type === 'contract' ? contractTemplate : idTemplate;
    if (!file) return;

    setIsUploadingTemplate(true);
    setTemplateUploadMessage('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('template', file);
      uploadFormData.append('type', type);
      uploadFormData.append('category', 'segnalatore');

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/form-templates`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}` },
        credentials: 'include',
        body: uploadFormData,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Errore nel caricamento del template');
      }

      setTemplateUploadMessage(`${type === 'contract' ? 'Contratto' : 'Template Documento Identità'} caricato con successo!`);
      // reset
      if (type === 'contract') {
        setContractTemplate(null);
        if (contractTemplateRef.current) contractTemplateRef.current.value = '';
      } else {
        setIdTemplate(null);
        if (idTemplateRef.current) idTemplateRef.current.value = '';
      }

      // refresh list
      const res2 = await fetch(`${API_BASE_URL}/api/form-templates/segnalatore`, {
        headers: { Authorization: `Bearer ${token || ''}` },
        credentials: 'include',
      });
      if (res2.ok) setFormTemplates(await res2.json());
    } catch (e: any) {
      setTemplateUploadMessage(e.message || 'Errore di rete. Riprova.');
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  const handleDownloadTemplate = async (type: 'contract' | 'id') => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/form-templates/download/segnalatore/${type}`, {
        headers: { Authorization: `Bearer ${token || ''}` },
        credentials: 'include',
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Impossibile scaricare il template ${type}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const template = getAvailableTemplate(type);
      const filename = template?.originalName || `segnalatore_${type}_template.pdf`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      setErrors([e.message || 'Errore di rete. Riprova.']);
    }
  };

  // ---- Submit (PUT multipart) ----
  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isSportelloLavoro) return;

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors([]);
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      const fd = new FormData();
      // append scalar fields
      Object.entries(formData).forEach(([k, v]) => {
        // ensure strings are appended
        fd.append(k, typeof v === 'number' ? String(v) : (v ?? ''));
      });

      // append new files if selected (leave empty to keep previous on server)
      if (contractFile) fd.append('contractFile', contractFile);
      if (idDocumentFile) fd.append('idDocumentFile', idDocumentFile);

      const res = await fetch(`${API_BASE_URL}/api/segnalatori/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token || ''}`,
          // do NOT set Content-Type; browser will set multipart boundary
        } as any,
        credentials: 'include',
        body: fd,
      });

      if (res.status === 403) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Access denied (403).');
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }

      setSuccessMessage('Segnalatore aggiornato con successo!');
      // back to detail
      navigate(`/segnalatori/${id}`);
    } catch (error: any) {
      console.error('Error updating segnalatore:', error);
      if (error.message?.includes('validation')) setErrors([error.message]);
      else setErrors([error.message || 'Network error. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="new-company-container">
        <div className="new-company-header">
          <h1 className="page-title">Modifica Segnalatore</h1>
        </div>
        <p style={{ padding: 16 }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="new-company-container">
      <div className="new-company-header">
        <h1 className="page-title">Modifica Segnalatore</h1>
      </div>

      {/* Template section — same behavior as add page */}
      {isAdmin ? (
        <div className="template-management-section" style={{
          backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px',
          marginBottom: '32px', border: '1px solid #e1e5e9',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px',
            paddingBottom: '16px', borderBottom: '2px solid #f8f9fa' }}>
            <div style={{ backgroundColor: '#fff3e0', padding: '8px', borderRadius: '8px', marginRight: '12px' }}>
              <span style={{ fontSize: '20px' }}>👤</span>
            </div>
            <h3 style={{ margin: 0, color: '#e65100', fontSize: '20px', fontWeight: '600' }}>
              Gestione Moduli Segnalatore (Admin)
            </h3>
          </div>

          {templateUploadMessage && (
            <div className="alert" style={{
              backgroundColor: templateUploadMessage.includes('successo') ? '#d1f2eb' : '#fadbd8',
              border: `1px solid ${templateUploadMessage.includes('successo') ? '#a3e4d7' : '#f1948a'}`,
              color: templateUploadMessage.includes('successo') ? '#0e6655' : '#922b21',
              padding: '12px 16px', borderRadius: '8px', marginBottom: '20px',
              fontSize: '14px', fontWeight: '500'
            }}>
              <span style={{ marginRight: '8px' }}>
                {templateUploadMessage.includes('successo') ? '✅' : '❌'}
              </span>
              {templateUploadMessage}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '31% 31%', gap: '24px' }}>
            {/* Contract template */}
            <div className="template-upload-group" style={{
              backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '1px solid #e9ecef'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px', marginRight: '8px' }}>📄</span>
                <label style={{ margin: 0, fontWeight: '600', color: '#495057', fontSize: '16px' }}>
                  Carica Template Contratto
                </label>
                {getAvailableTemplate('contract') && (
                  <span style={{
                    color: '#28a745', fontSize: '12px', marginLeft: '12px',
                    backgroundColor: '#d4edda', padding: '2px 8px', borderRadius: '12px', fontWeight: '500'
                  }}>
                    ✓ Disponibile
                  </span>
                )}
              </div>
              <input
                type="file"
                ref={contractTemplateRef}
                onChange={(e) => handleTemplateFileChange(e, 'contract')}
                accept=".pdf,.doc,.docx"
                style={{ marginBottom: '12px', width: '100%', padding: '8px',
                  border: '1px solid #ced4da', borderRadius: '6px', fontSize: '14px' }}
                disabled={isUploadingTemplate}
              />
              <button
                type="button"
                onClick={() => handleUploadTemplate('contract')}
                disabled={!contractTemplate || isUploadingTemplate}
                style={{
                  backgroundColor: contractTemplate && !isUploadingTemplate ? 'var(--primary-color)' : 'rgb(108, 117, 125)',
                  color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px',
                  cursor: contractTemplate && !isUploadingTemplate ? 'pointer' : 'not-allowed',
                  fontSize: '14px', fontWeight: '500', transition: 'all 0.3s ease', width: '100%'
                }}
              >
                {isUploadingTemplate ? '⏳ Caricamento...' : '📤 Carica Contratto'}
              </button>
            </div>

            {/* ID template */}
            <div className="template-upload-group" style={{
              backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '1px solid #e9ecef'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px', marginRight: '8px' }}>🆔</span>
                <label style={{ margin: 0, fontWeight: '600', color: '#495057', fontSize: '16px' }}>
                  Carica Template Documento ID
                </label>
                {getAvailableTemplate('id') && (
                  <span style={{
                    color: '#28a745', fontSize: '12px', marginLeft: '12px',
                    backgroundColor: '#d4edda', padding: '2px 8px', borderRadius: '12px', fontWeight: '500'
                  }}>
                    ✓ Disponibile
                  </span>
                )}
              </div>
              <input
                type="file"
                ref={idTemplateRef}
                onChange={(e) => handleTemplateFileChange(e, 'id')}
                accept=".pdf,.doc,.docx"
                style={{ marginBottom: '12px', width: '100%', padding: '8px',
                  border: '1px solid #ced4da', borderRadius: '6px', fontSize: '14px' }}
                disabled={isUploadingTemplate}
              />
              <button
                type="button"
                onClick={() => handleUploadTemplate('id')}
                disabled={!idTemplate || isUploadingTemplate}
                style={{
                  backgroundColor: idTemplate && !isUploadingTemplate ? 'var(--primary-color)' : 'rgb(108, 117, 125)',
                  color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px',
                  cursor: idTemplate && !isUploadingTemplate ? 'pointer' : 'not-allowed',
                  fontSize: '14px', fontWeight: '500', transition: 'all 0.3s ease', width: '100%'
                }}
              >
                {isUploadingTemplate ? '⏳ Caricamento...' : '📤 Carica Template ID'}
              </button>
            </div>
          </div>
        </div>
      ) : isSportelloLavoro ? (
        <div className="template-download-section" style={{
          backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', marginBottom: '32px',
          border: '1px solid #e1e5e9', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px',
            paddingBottom: '16px', borderBottom: '2px solid #f8f9fa' }}>
            <div style={{ backgroundColor: '#fff3e0', padding: '8px', borderRadius: '8px', marginRight: '12px' }}>
              <span style={{ fontSize: '20px' }}>📥</span>
            </div>
            <h3 style={{ margin: 0, color: '#e65100', fontSize: '20px', fontWeight: '600' }}>
              Scarica Moduli Segnalatore
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleDownloadTemplate('contract')}
              disabled={!getAvailableTemplate('contract')}
              className="submit-button"
              style={{ minWidth: 200 }}
            >
              📄 Scarica Contratto
            </button>
            <button
              type="button"
              onClick={() => handleDownloadTemplate('id')}
              disabled={!getAvailableTemplate('id')}
              className="submit-button"
              style={{ minWidth: 200 }}
            >
              🆔 Scarica Template ID
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', color: '#856404',
          padding: '16px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 8px 0' }}>⚠️ Permessi Insufficienti</h4>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Solo gli utenti con ruolo Sportello Lavoro o superiore possono modificare i Segnalatori.
          </p>
        </div>
      )}

      <div className="new-company-form">
        {successMessage && (
          <div className="alert alert-success" style={{
            backgroundColor: '#d4edda', border: '1px solid #c3e6cb',
            color: '#155724', padding: '10px', borderRadius: '4px', marginBottom: '20px'
          }}>
            {successMessage}
          </div>
        )}

        {errors.length > 0 && (
          <div className="alert alert-danger" style={{
            backgroundColor: '#f8d7da', border: '1px solid #f5c6cb',
            color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '20px'
          }}>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* Personal */}
        <div className="form-section">
          <h2>Informazioni Personali</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">Nome *</label>
              <input id="firstName" name="firstName" value={formData.firstName}
                onChange={handleChange} required placeholder="Inserisci il nome"
                disabled={isSubmitting || !isSportelloLavoro} />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Cognome *</label>
              <input id="lastName" name="lastName" value={formData.lastName}
                onChange={handleChange} required placeholder="Inserisci il cognome"
                disabled={isSubmitting || !isSportelloLavoro} />
            </div>

            <div className="form-group">
              <label htmlFor="taxCode">Codice Fiscale *</label>
              <input id="taxCode" name="taxCode" value={formData.taxCode}
                onChange={handleChange} required placeholder="RSSMRA80A01H501Z"
                maxLength={16} style={{ textTransform: 'uppercase' }}
                disabled={isSubmitting || !isSportelloLavoro} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input id="email" name="email" type="email" value={formData.email}
                onChange={handleChange} required placeholder="mario.rossi@example.com"
                disabled={isSubmitting || !isSportelloLavoro} />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Telefono</label>
              <input id="phone" name="phone" value={formData.phone}
                onChange={handleChange} placeholder="+39 ..."
                disabled={isSubmitting || !isSportelloLavoro} />
            </div>

            <div className="form-group">
              <label htmlFor="agreementPercentage">Percentuale Accordo (%) *</label>
              <input id="agreementPercentage" name="agreementPercentage" type="number"
                value={formData.agreementPercentage} onChange={handleChange}
                required min="0" max="100" step="0.01"
                disabled={isSubmitting || !isSportelloLavoro} />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="form-section">
          <h2>Indirizzo</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="address">Indirizzo *</label>
              <input id="address" name="address" value={formData.address}
                onChange={handleChange} required placeholder="Via Roma 1"
                disabled={isSubmitting || !isSportelloLavoro} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">Città *</label>
              <input id="city" name="city" value={formData.city}
                onChange={handleChange} required placeholder="Cosenza"
                disabled={isSubmitting || !isSportelloLavoro} />
            </div>

            <div className="form-group">
              <label htmlFor="postalCode">CAP *</label>
              <input id="postalCode" name="postalCode" value={formData.postalCode}
                onChange={handleChange} required placeholder="87100" maxLength={5}
                disabled={isSubmitting || !isSportelloLavoro} />
            </div>

            <div className="form-group">
              <label htmlFor="province">Provincia *</label>
              <input id="province" name="province" value={formData.province}
                onChange={handleChange} required placeholder="CS" maxLength={2}
                style={{ textTransform: 'uppercase' }}
                disabled={isSubmitting || !isSportelloLavoro} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="specialization">Specializzazione</label>
              <input id="specialization" name="specialization" value={formData.specialization}
                onChange={handleChange} placeholder="—"
                disabled={isSubmitting || !isSportelloLavoro} />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Note</label>
              <textarea id="notes" name="notes" value={formData.notes}
                onChange={handleChange} placeholder="Inserisci eventuali note" rows={3}
                disabled={isSubmitting || !isSportelloLavoro}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd',
                  borderRadius: '4px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          </div>
        </div>

        {/* File uploads (optional overwrite) */}
        {isSportelloLavoro && (
          <div className="upload-form-container">
            {/* Existing files preview/links (if your API provides URLs) */}
            {(existingContractUrl || existingIdDocUrl) && (
              <div className="form-row" style={{ marginBottom: 10 }}>
                {existingContractUrl && (
                  <div className="form-group">
                    <label>Contratto esistente</label>
                    <div>
                      <a href={existingContractUrl} target="_blank" rel="noreferrer">Apri Contratto</a>
                    </div>
                  </div>
                )}
                {existingIdDocUrl && (
                  <div className="form-group">
                    <label>Documento ID esistente</label>
                    <div>
                      <a href={existingIdDocUrl} target="_blank" rel="noreferrer">Apri Documento ID</a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* New uploads (replace on server only if selected) */}
            <div className="form-group">
              <label htmlFor="contract-upload">Contratto (sostituisci)</label>
              <div className="file-input-wrapper">
                <div className="file-select">
                  <input
                    ref={contractFileRef}
                    type="file"
                    id="contract-upload"
                    onChange={(e) => handleFileChange(e, 'contract')}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="file-input"
                    disabled={isSubmitting}
                  />
                  <div className="file-select-button">Choose File</div>
                  <div className="file-select-name">
                    {contractFile ? contractFile.name : 'No file chosen'}
                  </div>
                </div>
              </div>
              {contractFile && (
                <>
                  <div style={{ marginTop: 5, fontSize: 12, color: '#666' }}>
                    Size: {segnalatoreService.getFileSizeString(contractFile.size)}
                  </div>
                  <button
                    type="button"
                    className="delete-file-button"
                    onClick={() => handleDeleteFile('contract')}
                    disabled={isSubmitting}
                  >
                    ❌ Remove File
                  </button>
                </>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="id-doc-upload">Documento Identità (sostituisci)</label>
              <div className="file-input-wrapper">
                <div className="file-select">
                  <input
                    ref={idDocumentFileRef}
                    type="file"
                    id="id-doc-upload"
                    onChange={(e) => handleFileChange(e, 'id')}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="file-input"
                    disabled={isSubmitting}
                  />
                  <div className="file-select-button">Choose File</div>
                  <div className="file-select-name">
                    {idDocumentFile ? idDocumentFile.name : 'No file chosen'}
                  </div>
                </div>
              </div>
              {idDocumentFile && (
                <>
                  <div style={{ marginTop: 5, fontSize: 12, color: '#666' }}>
                    Size: {segnalatoreService.getFileSizeString(idDocumentFile.size)}
                  </div>
                  <button
                    type="button"
                    className="delete-file-button"
                    onClick={() => handleDeleteFile('id')}
                    disabled={isSubmitting}
                  >
                    ❌ Remove File
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {isSportelloLavoro && (
          <div className="form-actions">
            <button
              type="button"
              className="submit-button"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Salvataggio…' : 'Salva Modifiche'}
            </button>
            <button
              type="button"
              className="delete-file-button"
              style={{ marginLeft: 8 }}
              onClick={() => navigate(`/segnalatori/${id}`)}
              disabled={isSubmitting}
            >
              Annulla
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SegnalatoreEditForm;
