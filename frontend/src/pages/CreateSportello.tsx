import React, { useState, useRef, useEffect } from 'react';
import '../styles/NewCompany.css';
import { SportelloLavoroFormData, FormTemplate, MinimalAgent } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL =
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000')
    .replace(/\/+$/, '');

const SportelloLavoro: React.FC = () => {
  const { user } = useAuth();

  const [agents] = useState<MinimalAgent[]>([]);
  const [isLoadingAgents] = useState(false);
  const [agentsError] = useState<string | null>(null);

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

  const [signedContract, setSignedContract] = useState<File | null>(null);
  const [legalDoc, setLegalDoc] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Templates state
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [contractTemplate, setContractTemplate] = useState<File | null>(null);
  const [legalTemplate, setLegalTemplate] = useState<File | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [templateUploadMessage, setTemplateUploadMessage] = useState('');

  // Refs for file inputs
  const signedContractRef = useRef<HTMLInputElement>(null);
  const legalDocRef = useRef<HTMLInputElement>(null);
  const contractTemplateRef = useRef<HTMLInputElement>(null);
  const legalTemplateRef = useRef<HTMLInputElement>(null);

  // Role + display name
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';
  const isResponsabile = (user?.role || '').toLowerCase() === 'responsabile_territoriale';

  // account display name: organization → “First Last” → username → email prefix
  const accountDisplayName =
    (user?.organization?.trim()) ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    (user?.username?.trim()) ||
    (user?.email ? user.email.split('@')[0] : '') || '';

  // Load agents
// Auto-fill for Responsabile: lock agent to current user
useEffect(() => {
  if (!user || !isResponsabile) return;

  setFormData(prev => ({
    ...prev,
    agentId: user._id || prev.agentId,         // backend can still receive agentId
  
    
  }));
}, [user, isResponsabile, accountDisplayName]);


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
      businessName: selected?.businessName || '',
      agentName: selected?.businessName || prev.agentName
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
        'image/jpeg', 'image/jpg', 'image/png'
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
    else if (type === 'legal') setLegalTemplate(file);
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
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: uploadFormData,
      });

      if (response.ok) {
        await response.json();
        setTemplateUploadMessage(`${type === 'contract' ? 'Contratto' : 'Documento Legale'} template caricato con successo!`);
        if (type === 'contract') {
          setContractTemplate(null);
          if (contractTemplateRef.current) contractTemplateRef.current.value = '';
        } else {
          setLegalTemplate(null);
          if (legalTemplateRef.current) legalTemplateRef.current.value = '';
        }

        const token2 = localStorage.getItem('token') || sessionStorage.getItem('token');
        const templatesResponse = await fetch(`${API_BASE_URL}/api/form-templates/sportello-lavoro`, {
          headers: { ...(token2 ? { 'Authorization': `Bearer ${token2}` } : {}) },
          credentials: 'include',
        });
        if (templatesResponse.ok) {
          const templates = await templatesResponse.json();
          setFormTemplates(templates);
        }
      } else {
        const result = await response.json();
        setTemplateUploadMessage(result.error || 'Errore nel caricamento del template');
      }
    } catch (error) {
      console.error('Error uploading template:', error);
      setTemplateUploadMessage('Errore di rete. Riprova.');
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  const handleDownloadTemplate = async (type: 'contract' | 'legal') => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/form-templates/download/sportello-lavoro/${type}`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const template = getAvailableTemplate(type);
        const filename = template?.originalName || `sportello_lavoro_${type}_template.pdf`;
        a.download = filename;

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const result = await response.json();
        setErrors([result.error || `Impossibile scaricare il template ${type}`]);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      setErrors(['Errore di rete. Riprova.']);
    }
  };

  const getAvailableTemplate = (type: 'contract' | 'legal') =>
    formTemplates.find(template => template.type === type);

const validateForm = (): boolean => {
  const newErrors: string[] = [];

  // Only admins must choose from the list
  if (isAdmin && !formData.agentId) {
    newErrors.push("Seleziona una Ragione Sociale (Agente)");
  }

  if (!formData.vatNumber.trim()) newErrors.push("Partita IVA is required");
  if (!formData.address.trim()) newErrors.push("Indirizzo is required");
  if (!formData.city.trim()) newErrors.push("Città is required");
  if (!formData.postalCode.trim()) newErrors.push("CAP is required");
  if (!formData.province.trim()) newErrors.push("Provincia is required");
  if (!formData.agreedCommission || formData.agreedCommission <= 0) {
    newErrors.push("Competenze concordate is required and must be greater than 0");
  }
  if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
    newErrors.push("Please enter a valid email address");
  }
  if (formData.pec && !/\S+@\S+\.\S+/.test(formData.pec)) {
    newErrors.push("Please enter a valid PEC address");
  }

  setErrors(newErrors);
  return newErrors.length === 0;
};


  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors([]);
    setSuccessMessage('');

    try {
      const formDataToSend = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formDataToSend.append(key, String(value));
        }
      });

      if (signedContract) formDataToSend.append('signedContractFile', signedContract);
      if (legalDoc) formDataToSend.append('legalDocumentFile', legalDoc);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/sportello-lavoro`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Sportello Lavoro creato con successo!');
        setFormData({
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
        setSignedContract(null);
        setLegalDoc(null);
        if (signedContractRef.current) signedContractRef.current.value = '';
        if (legalDocRef.current) legalDocRef.current.value = '';
      } else {
        if (data.errors && Array.isArray(data.errors)) setErrors(data.errors);
        else setErrors([data.error || 'An error occurred']);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors(['Network error. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="new-company-container">
      <div className="new-company-header">
        <h1 className="page-title">Nuovo Sportello Lavoro</h1>
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
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '2px solid #f8f9fa'
            }}
          >
            <div
              style={{
                backgroundColor: '#e3f2fd',
                padding: '8px',
                borderRadius: '8px',
                marginRight: '12px'
              }}
            >
              <span style={{ fontSize: '20px' }}>⚙️</span>
            </div>
            <h3
              style={{
                margin: 0,
                color: '#2c3e50',
                fontSize: '20px',
                fontWeight: '600'
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
                fontWeight: '500'
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
                    fontSize: '16px'
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
                      fontWeight: '500'
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
                  fontSize: '14px'
                }}
                disabled={isUploadingTemplate}
              />
              <button
                type="button"
                onClick={() => handleUploadTemplate('contract')}
                disabled={!contractTemplate || isUploadingTemplate}
                style={{
                  backgroundColor: contractTemplate && !isUploadingTemplate ? 'var(--primary-color)' : '#6c757d',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: contractTemplate && !isUploadingTemplate ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  width: '100%'
                }}
              >
                {isUploadingTemplate ? (
                  <span>
                    <span style={{ marginRight: '8px' }}>⏳</span>
                    Caricamento...
                  </span>
                ) : (
                  <span>
                    <span style={{ marginRight: '8px' }}>📤</span>
                    Carica Contratto
                  </span>
                )}
              </button>
            </div>

            {/* Legal Template Upload */}
            <div
              className="template-upload-group"
              style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid #e9ecef'
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
                    fontSize: '16px'
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
                      fontWeight: '500'
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
                  fontSize: '14px'
                }}
                disabled={isUploadingTemplate}
              />
              <button
                type="button"
                onClick={() => handleUploadTemplate('legal')}
                disabled={!legalTemplate || isUploadingTemplate}
                style={{
                  backgroundColor: legalTemplate && !isUploadingTemplate ? 'var(--primary-color)' : '#6c757d',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: legalTemplate && !isUploadingTemplate ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  width: '100%'
                }}
              >
                {isUploadingTemplate ? (
                  <span>
                    <span style={{ marginRight: '8px' }}>⏳</span>
                    Caricamento...
                  </span>
                ) : (
                  <span>
                    <span style={{ marginRight: '8px' }}>📤</span>
                    Carica Documento
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Regular Users: Download templates
        <div
          className="template-download-section"
          style={{
            backgroundColor: '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '32px',
            border: '1px solid #e1e5e9',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '16px',
              borderBottom: '2px solid #f8f9fa'
            }}
          >
            <div style={{ backgroundColor: '#e8f4f8', padding: '8px', borderRadius: '8px', marginRight: '12px' }}>
              <span style={{ fontSize: '20px' }}>📥</span>
            </div>
            <h3 style={{ margin: 0, color: '#0c5460', fontSize: '20px', fontWeight: '600' }}>
              Scarica Moduli Sportello Lavoro
            </h3>
          </div>

          <p style={{ marginBottom: '20px', color: '#495057', fontSize: '14px', lineHeight: '1.5' }}>
            Scarica i moduli necessari per completare la procedura di creazione Sportello Lavoro.
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleDownloadTemplate('contract')}
              disabled={!getAvailableTemplate('contract')}
              style={{
                backgroundColor: getAvailableTemplate('contract') ? '#17a2b8' : '#6c757d',
                color: 'white',
                padding: '14px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: getAvailableTemplate('contract') ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: getAvailableTemplate('contract') ? '0 2px 4px rgba(23, 162, 184, 0.3)' : 'none',
                minWidth: '220px'
              }}
              onMouseOver={(e) => {
                if (getAvailableTemplate('contract')) {
                  e.currentTarget.style.backgroundColor = '#138496';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (getAvailableTemplate('contract')) {
                  e.currentTarget.style.backgroundColor = '#17a2b8';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              📄 Scarica Contratto Sportello
            </button>

            <button
              type="button"
              onClick={() => handleDownloadTemplate('legal')}
              disabled={!getAvailableTemplate('legal')}
              style={{
                backgroundColor: getAvailableTemplate('legal') ? '#28a745' : '#6c757d',
                color: 'white',
                padding: '14px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: getAvailableTemplate('legal') ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: getAvailableTemplate('legal') ? '0 2px 4px rgba(40, 167, 69, 0.3)' : 'none',
                minWidth: '220px'
              }}
              onMouseOver={(e) => {
                if (getAvailableTemplate('legal')) {
                  e.currentTarget.style.backgroundColor = '#218838';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (getAvailableTemplate('legal')) {
                  e.currentTarget.style.backgroundColor = '#28a745';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              📋 Scarica Documento Legale
            </button>
          </div>

          {(!getAvailableTemplate('contract') || !getAvailableTemplate('legal')) && (
            <div
              style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                color: '#856404',
                padding: '12px 16px',
                borderRadius: '8px',
                marginTop: '16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span style={{ marginRight: '8px', fontSize: '16px' }}>⚠️</span>
              Alcuni moduli potrebbero non essere ancora disponibili. Contatta l'amministratore.
            </div>
          )}
        </div>
      )}

      <div className="new-company-form">
        {/* Success Message */}
        {successMessage && (
          <div
            className="alert alert-success"
            style={{
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              color: '#155724',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '20px'
            }}
          >
            {successMessage}
          </div>
        )}

        {/* Error Messages */}
        {errors.length > 0 && (
          <div
            className="alert alert-danger"
            style={{
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              color: '#721c24',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '20px'
            }}
          >
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Basic Information */}
        <div className="form-section">
          <h2>Informazioni Azienda</h2>

          <div className="form-row">
            <div className="form-group">
  <label htmlFor="agentId">
    {isResponsabile ? 'Responsabile Territoriale *' : 'Ragione Sociale *'}
  </label>

  {isAdmin ? (
    // Admin: dropdown list
    <select
      id="agentId"
      name="agentId"
      value={formData.agentId || ''}
      onChange={handleAgentSelect}
      required
      disabled={isSubmitting || isLoadingAgents}
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
  ) : (
    // Responsabile: read-only with their own name
    <>
      <input
        type="text"
        value={accountDisplayName}
        readOnly
        style={{ background: '#f6f7f9', cursor: 'not-allowed' }}
      />
      {/* Keep agentId in a hidden input so it’s submitted */}
      <input type="hidden" name="agentId" value={formData.agentId} />
    </>
  )}

  {agentsError && isAdmin && (
    <small style={{ color: '#b00020', display: 'block', marginTop: 6 }}>
      {agentsError}
    </small>
  )}
</div>


            <div className="form-group">
              <label htmlFor="agentName">Nome Consulente *</label>
              <input
                type="text"
                id="agentName"
                name="agentName"
                value={formData.agentName}
                onChange={handleChange}
                required
                placeholder="Inserisci il nome del consulente"
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
                value={formData.agreedCommission || ''}
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

        <div className="upload-form-container">
          {/* Contratto Firmato Upload */}
          <div className="form-group">
            <label htmlFor="signed-contract-upload">
              Contratto Firmato <span className="required">*</span>
            </label>
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

          {/* Documento Legale Upload */}
          <div className="form-group">
            <label htmlFor="legal-doc-upload">
              Documento Legale <span className="required">*</span>
            </label>
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

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="button"
            className="submit-button"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Creazione in corso...' : 'Crea Sportello Lavoro'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SportelloLavoro;
