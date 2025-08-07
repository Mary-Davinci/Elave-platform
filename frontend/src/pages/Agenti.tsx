import React, { useState, useRef, useEffect } from 'react';
import '../styles/NewCompany.css';
import { AgenteFormData, FormTemplate } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext'; // Import AuthContext

const Agenti: React.FC = () => {
  const { user } = useAuth(); // Get user from AuthContext
  
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
  
  // New state for form templates - FIXED role logic
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

  // FIXED: Proper role checking logic
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isResponsabileTerritoriale = user?.role === 'responsabile_territoriale' || isAdmin;
  
  // Use the actual user role, not a simplified version
  const userRole = user?.role || 'segnalatori';

  // Fetch form templates on component mount
  useEffect(() => {
    const fetchFormTemplates = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        
        const response = await fetch(`${apiBaseUrl}/api/form-templates`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const templates = await response.json();
          console.log('Fetched templates:', templates);
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

  // Debug: Log role information
  useEffect(() => {
    console.log('AuthContext user:', user);
    console.log('User role from AuthContext:', user?.role);
    console.log('IsAdmin:', isAdmin);
    console.log('IsResponsabileTerritoriale:', isResponsabileTerritoriale);
    console.log('Final userRole:', userRole);
  }, [user, isAdmin, isResponsabileTerritoriale, userRole]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ 
      ...formData, 
      [name]: name === 'agreedCommission' ? parseFloat(value) || 0 : value 
    });
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'contract' | 'doc') => {
    const file = e.target.files?.[0] || null;
    if (type === 'contract') {
      setSignedContract(file);
    } else if (type === 'doc') {
      setLegalDoc(file);
    }
  };

  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'contract' | 'legal') => {
    const file = e.target.files?.[0] || null;
    if (type === 'contract') {
      setContractTemplate(file);
    } else if (type === 'legal') {
      setLegalTemplate(file);
    }
  };

  const validateForm = (): string[] => {
    const validationErrors: string[] = [];
    
    if (!formData.businessName.trim()) {
      validationErrors.push('Ragione Sociale is required');
    }
    if (!formData.vatNumber.trim()) {
      validationErrors.push('Partita IVA is required');
    }
    if (!formData.address.trim()) {
      validationErrors.push('Indirizzo is required');
    }
    if (!formData.city.trim()) {
      validationErrors.push('Città is required');
    }
    if (!formData.postalCode.trim()) {
      validationErrors.push('CAP is required');
    }
    if (!formData.province.trim()) {
      validationErrors.push('Provincia is required');
    }
    if (!formData.agreedCommission || formData.agreedCommission <= 0) {
      validationErrors.push('Competenze concordate must be greater than 0');
    }

    return validationErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous messages
    setErrors([]);
    setSuccessMessage('');

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for multipart/form-data request
      const submitFormData = new FormData();
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        submitFormData.append(key, value.toString());
      });

      // Add files if present
      if (signedContract) {
        submitFormData.append('signedContractFile', signedContract);
      }
      if (legalDoc) {
        submitFormData.append('legalDocumentFile', legalDoc);
      }

      // Get auth token
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/agenti`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: submitFormData,
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Agente created successfully!');
        // Reset form
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
        
        // Reset file inputs
        if (signedContractRef.current) signedContractRef.current.value = '';
        if (legalDocRef.current) legalDocRef.current.value = '';
      } else {
        // Handle errors from server
        if (result.errors && Array.isArray(result.errors)) {
          setErrors(result.errors);
        } else if (result.error) {
          setErrors([result.error]);
        } else {
          setErrors(['An unexpected error occurred']);
        }
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
    } else if (type === 'doc') {
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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      if (response.ok) {
        const result = await response.json();
        setTemplateUploadMessage(`${type === 'contract' ? 'Contract' : 'Legal'} template uploaded successfully!`);
        
        // Reset the file input
        if (type === 'contract') {
          setContractTemplate(null);
          if (contractTemplateRef.current) contractTemplateRef.current.value = '';
        } else {
          setLegalTemplate(null);
          if (legalTemplateRef.current) legalTemplateRef.current.value = '';
        }

        // Refresh templates list
        const templatesResponse = await fetch(`${apiBaseUrl}/api/form-templates`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (templatesResponse.ok) {
          const templates = await templatesResponse.json();
          setFormTemplates(templates);
        }
      } else {
        const result = await response.json();
        setTemplateUploadMessage(result.error || 'Failed to upload template');
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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Get the filename from the template or use a default
        const template = getAvailableTemplate(type);
        const filename = template?.originalName || `${type}_template.pdf`;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const result = await response.json();
        setErrors([result.error || `Failed to download ${type} template`]);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      setErrors(['Network error. Please try again.']);
    }
  };

  const getAvailableTemplate = (type: 'contract' | 'legal') => {
    return formTemplates.find(template => template.type === type);
  };

  return (
    <div className="add-company-container">
      <h1 className="page-title">Nomina Agente</h1>
      
     
      
      {/* Template Management Section */}
      {isAdmin ? (
        // Admin: Upload templates
        <div className="template-management-section" style={{ 
          backgroundColor: '#ffffff', 
          padding: '24px', 
          borderRadius: '12px', 
          marginBottom: '32px',
          border: '1px solid #e1e5e9',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #f8f9fa'
          }}>
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '8px',
              borderRadius: '8px',
              marginRight: '12px'
            }}>
              <span style={{ fontSize: '20px' }}>⚙️</span>
            </div>
            <h3 style={{ 
              margin: 0, 
              color: '#2c3e50',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              Gestione Moduli (Admin)
            </h3>
          </div>
          
          {templateUploadMessage && (
            <div className="alert" style={{ 
              backgroundColor: templateUploadMessage.includes('successfully') ? '#d1f2eb' : '#fadbd8',
              border: `1px solid ${templateUploadMessage.includes('successfully') ? '#a3e4d7' : '#f1948a'}`,
              color: templateUploadMessage.includes('successfully') ? '#0e6655' : '#922b21',
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <span style={{ marginRight: '8px' }}>
                {templateUploadMessage.includes('successfully') ? '✅' : '❌'}
              </span>
              {templateUploadMessage}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '31% 31%', gap: '24px' }}>
            {/* Contract Template Upload */}
            <div className="template-upload-group" style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '10px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '12px' 
              }}>
                <span style={{ fontSize: '18px', marginRight: '8px' }}>📄</span>
                <label style={{ 
                  display: 'block', 
                  margin: 0, 
                  fontWeight: '600',
                  color: '#495057',
                  fontSize: '16px'
                }}>
                  Carica Modulo Contratto
                </label>
                {getAvailableTemplate('contract') && (
                  <span style={{ 
                    color: '#28a745', 
                    fontSize: '12px', 
                    marginLeft: '12px',
                    backgroundColor: '#d4edda',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: '500'
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
                  backgroundColor: contractTemplate && !isUploadingTemplate ? 'var(--primary-color)' : 'rgb(108, 117, 125)',
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
            <div className="template-upload-group" style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '10px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '12px' 
              }}>
                <span style={{ fontSize: '18px', marginRight: '8px' }}>📋</span>
                <label style={{ 
                  display: 'block', 
                  margin: 0, 
                  fontWeight: '600',
                  color: '#495057',
                  fontSize: '16px'
                }}>
                  Carica Modulo Documento Legale
                </label>
                {getAvailableTemplate('legal') && (
                  <span style={{ 
                    color: '#28a745', 
                    fontSize: '12px', 
                    marginLeft: '12px',
                    backgroundColor: '#d4edda',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
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
                  backgroundColor: legalTemplate && !isUploadingTemplate ? 'var(--primary-color)' : 'rgb(108, 117, 125)',
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
        <div className="template-download-section" style={{ 
          backgroundColor: '#ffffff', 
          padding: '24px', 
          borderRadius: '12px', 
          marginBottom: '32px',
          border: '1px solid #e1e5e9',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '16px',
            paddingBottom: '16px',
            borderBottom: '2px solid #f8f9fa'
          }}>
            <div style={{
              backgroundColor: '#e8f4f8',
              padding: '8px',
              borderRadius: '8px',
              marginRight: '12px'
            }}>
              <span style={{ fontSize: '20px' }}>📥</span>
            </div>
            <h3 style={{ 
              margin: 0, 
              color: '#0c5460',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              Scarica Moduli
            </h3>
          </div>
          
          <p style={{ 
            marginBottom: '20px', 
            color: '#495057',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            Scarica i moduli necessari per completare la procedura di nomina agente.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleDownloadTemplate('contract')}
              disabled={!getAvailableTemplate('contract')}
              style={{
                backgroundColor: getAvailableTemplate('contract') ? '#17a2b8' : 'rgb(32 113 192 / 20%)',
                color: 'white',
                padding: '14px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: getAvailableTemplate('contract') ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: getAvailableTemplate('contract') ? '0 2px 4px rgba(23, 162, 184, 0.3)' : 'none',
                minWidth: '200px'
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
              📄 Scarica Modulo Contratto
            </button>
            
            <button
              type="button"
              onClick={() => handleDownloadTemplate('legal')}
              disabled={!getAvailableTemplate('legal')}
              style={{
                backgroundColor: getAvailableTemplate('legal') ? '#28a745' : 'rgb(32 113 192 / 20%)',
                color: 'white',
                padding: '14px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: getAvailableTemplate('legal') ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: getAvailableTemplate('legal') ? '0 2px 4px rgba(40, 167, 69, 0.3)' : 'none',
                minWidth: '200px'
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
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              color: '#856404',
              padding: '12px 16px',
              borderRadius: '8px',
              marginTop: '16px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ marginRight: '8px', fontSize: '16px' }}>⚠️</span>
              Alcuni moduli potrebbero non essere ancora disponibili. Contatta l'amministratore.
            </div>
          )}
        </div>
      )}
      
      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success" style={{ 
          backgroundColor: '#d4edda', 
          border: '1px solid #c3e6cb', 
          color: '#155724', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          {successMessage}
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="alert alert-danger" style={{ 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb', 
          color: '#721c24', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label>Ragione sociale *</label>
              <input 
                name="businessName" 
                value={formData.businessName} 
                onChange={handleChange} 
                required 
                className="form-control"
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>Partita IVA *</label>
              <input 
                name="vatNumber" 
                value={formData.vatNumber} 
                onChange={handleChange} 
                required 
                className="form-control"
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>Indirizzo *</label>
              <input 
                name="address" 
                value={formData.address} 
                onChange={handleChange} 
                required 
                className="form-control"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Città *</label>
              <input 
                name="city" 
                value={formData.city} 
                onChange={handleChange} 
                required 
                className="form-control"
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>CAP *</label>
              <input 
                name="postalCode" 
                value={formData.postalCode} 
                onChange={handleChange} 
                required 
                className="form-control"
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>Provincia *</label>
              <input 
                name="province" 
                value={formData.province} 
                onChange={handleChange} 
                required 
                className="form-control"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Competenze concordate al (%) *</label>
              <input 
                type="number" 
                name="agreedCommission" 
                value={formData.agreedCommission || ''} 
                onChange={handleChange} 
                className="form-control"
                min="0"
                step="0.01"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email"
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                className="form-control"
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>PEC</label>
              <input 
                type="email"
                name="pec" 
                value={formData.pec} 
                onChange={handleChange} 
                className="form-control"
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
                  onChange={(e) => handleFileChange(e, 'doc')}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="file-input"
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
                onClick={() => handleDeleteFile('doc')}
              >
                ❌ Remove File
              </button>
            )}
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Aggiungi'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Agenti;