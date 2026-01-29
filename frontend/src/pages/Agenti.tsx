import React, { useState, useEffect, useRef } from 'react';
import '../styles/NewCompany.css';
import { AgenteFormData, FormTemplate } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';

const Agenti: React.FC = () => {
  const { user } = useAuth();

  const [formData, setFormData] = useState<AgenteFormData>({
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

  // Refs
  const signedContractRef = useRef<HTMLInputElement>(null);
  const legalDocRef = useRef<HTMLInputElement>(null);
  const contractTemplateRef = useRef<HTMLInputElement>(null);
  const legalTemplateRef = useRef<HTMLInputElement>(null);

  // Role checks actually used in the JSX
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Fetch form templates on mount
  useEffect(() => {
    const fetchFormTemplates = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const response = await fetch(`${apiBaseUrl}/api/form-templates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const templates = await response.json();
          setFormTemplates(templates);
        } else {
          console.error('Failed to fetch templates:', response.status);
        }
      } catch (error) {
        console.error('Error fetching form templates:', error);
      }
    };
    fetchFormTemplates();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'agreedCommission' ? parseFloat(value) || 0 : value
    }));
    if (errors.length) setErrors([]);
    if (successMessage) setSuccessMessage('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'contract' | 'doc') => {
    const file = e.target.files?.[0] || null;
    if (type === 'contract') setSignedContract(file);
    else setLegalDoc(file);
  };

  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'contract' | 'legal') => {
    const file = e.target.files?.[0] || null;
    if (type === 'contract') setContractTemplate(file);
    else setLegalTemplate(file);
  };

  const validateForm = (): string[] => {
    const validationErrors: string[] = [];
    if (!formData.businessName.trim()) validationErrors.push('Ragione Sociale is required');
    if (!formData.vatNumber.trim()) validationErrors.push('Partita IVA is required');
    if (!formData.address.trim()) validationErrors.push('Indirizzo is required');
    if (!formData.city.trim()) validationErrors.push('Città is required');
    if (!formData.postalCode.trim()) validationErrors.push('CAP is required');
    if (!formData.province.trim()) validationErrors.push('Provincia is required');
    if (!formData.agreedCommission || formData.agreedCommission <= 0) {
      validationErrors.push('Competenze concordate must be greater than 0');
    }
    // Very basic email checks if present
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      validationErrors.push('Please enter a valid email address');
    }
    if (formData.pec && !/\S+@\S+\.\S+/.test(formData.pec)) {
      validationErrors.push('Please enter a valid PEC address');
    }
    return validationErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage('');

    const validationErrors = validateForm();
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const submitFormData = new FormData();
      Object.entries(formData).forEach(([k, v]) => submitFormData.append(k, v.toString()));
      if (signedContract) submitFormData.append('signedContractFile', signedContract);
      if (legalDoc) submitFormData.append('legalDocumentFile', legalDoc);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/agenti`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: submitFormData,
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Agente creato con successo!');
        setFormData({
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
        if (result?.errors && Array.isArray(result.errors)) setErrors(result.errors);
        else if (result?.error) setErrors([result.error]);
        else setErrors(['An unexpected error occurred']);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors(['Network error. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFile = (type: 'contract' | 'doc') => {
    if (type === 'contract') {
      setSignedContract(null);
      if (signedContractRef.current) signedContractRef.current.value = '';
    } else {
      setLegalDoc(null);
      if (legalDocRef.current) legalDocRef.current.value = '';
    }
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

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/form-templates`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadFormData,
      });

      if (response.ok) {
        await response.json(); // parsed to complete the stream
        setTemplateUploadMessage(`${type === 'contract' ? 'Contract' : 'Legal'} template uploaded successfully!`);
        if (type === 'contract') {
          setContractTemplate(null);
          if (contractTemplateRef.current) contractTemplateRef.current.value = '';
        } else {
          setLegalTemplate(null);
          if (legalTemplateRef.current) legalTemplateRef.current.value = '';
        }

        // Refresh templates list
        const templatesResponse = await fetch(`${apiBaseUrl}/api/form-templates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (templatesResponse.ok) {
          const templates = await templatesResponse.json();
          setFormTemplates(templates);
        }
      } else {
        const result = await response.json();
        setTemplateUploadMessage(result?.error || 'Failed to upload template');
      }
    } catch (error) {
      console.error('Error uploading template:', error);
      setTemplateUploadMessage('Network error. Please try again.');
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  const handleDownloadTemplate = async (type: 'contract' | 'legal') => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/form-templates/download/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const template = getAvailableTemplate(type);
        const filename = template?.originalName || `${type}_template.pdf`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const result = await response.json();
        setErrors([result?.error || `Failed to download ${type} template`]);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      setErrors(['Network error. Please try again.']);
    }
  };

  const getAvailableTemplate = (type: 'contract' | 'legal') =>
    formTemplates.find(t => t.type === type);

  return (
    <div className="new-company-container">
      <div className="new-company-header">
        <h1 className="page-title">Nuovo Agente</h1>
      </div>

      {/* Template Management Section */}
      {isAdmin ? (
        <div className="template-management-section" style={{
          backgroundColor: '#ffffff',
          padding: '24px',
          borderRadius: '12px',
          marginBottom: '32px',
          border: '1px solid #e1e5e9',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{display:'flex',alignItems:'center',marginBottom:'20px',paddingBottom:'16px',borderBottom:'2px solid #f8f9fa'}}>
            <div style={{backgroundColor:'#e3f2fd',padding:'8px',borderRadius:'8px',marginRight:'12px'}}><span style={{fontSize:'20px'}}>⚙️</span></div>
            <h3 style={{margin:0,color:'#2c3e50',fontSize:'20px',fontWeight:600}}>Gestione Moduli Agente (Admin)</h3>
          </div>

          {templateUploadMessage && (
            <div className="alert" style={{
              backgroundColor: templateUploadMessage.includes('successfully') ? '#d1f2eb' : '#fadbd8',
              border: `1px solid ${templateUploadMessage.includes('successfully') ? '#a3e4d7' : '#f1948a'}`,
              color: templateUploadMessage.includes('successfully') ? '#0e6655' : '#922b21',
              padding:'12px 16px', borderRadius:'8px', marginBottom:'20px', fontSize:'14px', fontWeight:500
            }}>
              {templateUploadMessage}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'31% 31%', gap:'24px' }}>
            {/* Contract Template Upload */}
            <div className="template-upload-group" style={{background:'#f8f9fa', padding:'20px', borderRadius:'10px', border:'1px solid #e9ecef'}}>
              <div style={{display:'flex',alignItems:'center',marginBottom:'12px'}}>
                <span style={{fontSize:'18px',marginRight:'8px'}}>📄</span>
                <label style={{margin:0,fontWeight:600,color:'#495057',fontSize:'16px'}}>Carica Contratto Firmato</label>
                {getAvailableTemplate('contract') && (
                  <span style={{color:'#28a745',fontSize:'12px',marginLeft:'12px',background:'#d4edda',padding:'2px 8px',borderRadius:'12px',fontWeight:500}}>✓ Disponibile</span>
                )}
              </div>
              <input
                type="file"
                ref={contractTemplateRef}
                onChange={(e) => handleTemplateFileChange(e, 'contract')}
                accept=".pdf,.doc,.docx"
                disabled={isUploadingTemplate}
                style={{marginBottom:'12px',width:'100%',padding:'8px',border:'1px solid #ced4da',borderRadius:'6px',fontSize:'14px'}}
              />
              <button
                type="button"
                onClick={() => handleUploadTemplate('contract')}
                disabled={!contractTemplate || isUploadingTemplate}
                style={{background: contractTemplate && !isUploadingTemplate ? 'var(--primary-color)' : '#6c757d', color:'#fff', padding:'10px 20px', border:'none', borderRadius:'6px', width:'100%'}}
              >
                {isUploadingTemplate ? 'Caricamento...' : 'Carica Contratto'}
              </button>
            </div>

            {/* Legal Template Upload */}
            <div className="template-upload-group" style={{background:'#f8f9fa', padding:'20px', borderRadius:'10px', border:'1px solid #e9ecef'}}>
              <div style={{display:'flex',alignItems:'center',marginBottom:'12px'}}>
                <span style={{fontSize:'18px',marginRight:'8px'}}>📋</span>
                <label style={{margin:0,fontWeight:600,color:'#495057',fontSize:'16px'}}>Carica Documento del Legale Rappresentante</label>
                {getAvailableTemplate('legal') && (
                  <span style={{color:'#28a745',fontSize:'12px',marginLeft:'12px',background:'#d4edda',padding:'2px 8px',borderRadius:'12px',fontWeight:500}}>✓ Disponibile</span>
                )}
              </div>
              <input
                type="file"
                ref={legalTemplateRef}
                onChange={(e) => handleTemplateFileChange(e, 'legal')}
                accept=".pdf,.doc,.docx"
                disabled={isUploadingTemplate}
                style={{marginBottom:'12px',width:'100%',padding:'8px',border:'1px solid #ced4da',borderRadius:'6px',fontSize:'14px'}}
              />
              <button
                type="button"
                onClick={() => handleUploadTemplate('legal')}
                disabled={!legalTemplate || isUploadingTemplate}
                style={{background: legalTemplate && !isUploadingTemplate ? 'var(--primary-color)' : '#6c757d', color:'#fff', padding:'10px 20px', border:'none', borderRadius:'6px', width:'100%'}}
              >
                {isUploadingTemplate ? 'Caricamento...' : 'Carica Documento'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Non-admins: Download templates if available
        <div className="template-download-section" style={{
          backgroundColor:'#ffffff', padding:'24px', borderRadius:'12px', marginBottom:'32px',
          border:'1px solid #e1e5e9', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{display:'flex',alignItems:'center',marginBottom:'16px',paddingBottom:'16px',borderBottom:'2px solid #f8f9fa'}}>
            <div style={{background:'#e8f4f8',padding:'8px',borderRadius:'8px',marginRight:'12px'}}><span style={{fontSize:'20px'}}>📥</span></div>
            <h3 style={{margin:0,color:'#0c5460',fontSize:'20px',fontWeight:600}}>Scarica Moduli Agente</h3>
          </div>

          <div style={{display:'flex',gap:'16px',flexWrap:'wrap'}}>
            <button
              type="button"
              onClick={() => handleDownloadTemplate('contract')}
              disabled={!getAvailableTemplate('contract')}
              style={{background: getAvailableTemplate('contract') ? '#17a2b8' : '#6c757d', color:'#fff', padding:'14px 24px', border:'none', borderRadius:'8px', minWidth:'220px'}}
            >
              📄 Scarica Contratto
            </button>
            <button
              type="button"
              onClick={() => handleDownloadTemplate('legal')}
              disabled={!getAvailableTemplate('legal')}
              style={{background: getAvailableTemplate('legal') ? '#28a745' : '#6c757d', color:'#fff', padding:'14px 24px', border:'none', borderRadius:'8px', minWidth:'220px'}}
            >
              📋 Scarica Documento Legale
            </button>
          </div>
        </div>
      )}

      <div className="new-company-form">
        {/* Success & Error banners */}
        {successMessage && (
          <div className="alert alert-success" style={{background:'#d4edda',border:'1px solid #c3e6cb',color:'#155724',padding:'10px',borderRadius:'4px',marginBottom:'20px'}}>
            {successMessage}
          </div>
        )}
        {errors.length > 0 && (
          <div className="alert alert-danger" style={{background:'#f8d7da',border:'1px solid #f5c6cb',color:'#721c24',padding:'10px',borderRadius:'4px',marginBottom:'20px'}}>
            <ul style={{margin:0,paddingLeft:'20px'}}>{errors.map((e,i)=><li key={i}>{e}</li>)}</ul>
          </div>
        )}

        {/* The form */}
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>Informazioni Azienda</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="businessName">Ragione Sociale *</label>
                <input id="businessName" name="businessName" value={formData.businessName} onChange={handleChange} required disabled={isSubmitting} />
              </div>
              <div className="form-group">
                <label htmlFor="vatNumber">Partita IVA *</label>
                <input id="vatNumber" name="vatNumber" value={formData.vatNumber} onChange={handleChange} required disabled={isSubmitting} />
              </div>
              <div className="form-group">
                <label htmlFor="address">Indirizzo *</label>
                <input id="address" name="address" value={formData.address} onChange={handleChange} required disabled={isSubmitting} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">Città *</label>
                <input id="city" name="city" value={formData.city} onChange={handleChange} required disabled={isSubmitting} />
              </div>
              <div className="form-group">
                <label htmlFor="postalCode">CAP *</label>
                <input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleChange} required disabled={isSubmitting} />
              </div>
              <div className="form-group">
                <label htmlFor="province">Provincia *</label>
                <input id="province" name="province" value={formData.province} onChange={handleChange} required disabled={isSubmitting} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="agreedCommission">Competenze concordate al (%) *</label>
                <input
                  id="agreedCommission"
                  name="agreedCommission"
                  type="number"
                  value={formData.agreedCommission || ''}
                  onChange={handleChange}
                  required
                  min={0}
                  step={0.01}
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} disabled={isSubmitting} />
              </div>
              <div className="form-group">
                <label htmlFor="pec">PEC</label>
                <input id="pec" name="pec" type="email" value={formData.pec} onChange={handleChange} disabled={isSubmitting} />
              </div>
            </div>
          </div>

          {/* File uploads */}
          <div className="upload-form-container">
            <div className="form-group">
              <label htmlFor="signed-contract-upload">Contratto Firmato</label>
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
                  <div className="file-select-name">{signedContract ? signedContract.name : 'No file chosen'}</div>
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
              <div className="file-input-wrapper">
                <div className="file-select">
                  <input
                    type="file"
                    id="legal-doc-upload"
                    ref={legalDocRef}
                    onChange={(e) => handleFileChange(e, 'doc')}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="file-input"
                    disabled={isSubmitting}
                  />
                  <div className="file-select-button">Choose File</div>
                  <div className="file-select-name">{legalDoc ? legalDoc.name : 'No file chosen'}</div>
                </div>
              </div>
              {legalDoc && (
                <button type="button" className="delete-file-button" onClick={() => handleDeleteFile('doc')} disabled={isSubmitting}>
                  ❌ Remove File
                </button>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? 'Creazione in corso...' : 'Crea Agente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Agenti;
