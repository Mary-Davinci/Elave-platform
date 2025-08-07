import React, { useState, useRef, useEffect } from 'react';
import '../styles/NewCompany.css';
import { SportelloLavoroFormData, FormTemplate } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext'; // Import AuthContext

const SportelloLavoro: React.FC = () => {
  const { user } = useAuth(); // Get user from AuthContext
  
  const [formData, setFormData] = useState<SportelloLavoroFormData>({
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
  
  // New state for form templates
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

  // Get user role from AuthContext
  const isAdmin = user?.role === 'admin';
  const userRole = isAdmin ? 'admin' : 'user';

  // Fetch form templates on component mount
  useEffect(() => {
    const fetchFormTemplates = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        
        // Fetch templates specifically for SportelloLavoro
        const response = await fetch(`${apiBaseUrl}/api/form-templates/sportello-lavoro`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const templates = await response.json();
          console.log('Fetched SportelloLavoro templates:', templates);
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
    console.log('Final userRole:', userRole);
  }, [user, isAdmin, userRole]);

  const handleDeleteFile = (type: 'contract' | 'legal') => {
    if (type === 'contract') {
      setSignedContract(null);
      if (signedContractRef.current) {
        signedContractRef.current.value = '';
      }
    } else {
      setLegalDoc(null);
      if (legalDocRef.current) {
        legalDocRef.current.value = '';
      }
    }
  };

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
    
    // Clear success message when editing
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'contract' | 'legal') => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
      
      if (!allowedTypes.includes(file.type)) {
        setErrors(['Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed for documents!']);
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(['File size must be less than 5MB']);
        return;
      }
    }
    
    if (fileType === 'contract') {
      setSignedContract(file);
    } else {
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

  const handleUploadTemplate = async (type: 'contract' | 'legal') => {
    const file = type === 'contract' ? contractTemplate : legalTemplate;
    if (!file) return;

    setIsUploadingTemplate(true);
    setTemplateUploadMessage('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('template', file);
      uploadFormData.append('type', type);
      uploadFormData.append('category', 'sportello-lavoro'); // Add category for SportelloLavoro

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
        setTemplateUploadMessage(`${type === 'contract' ? 'Contratto' : 'Documento Legale'} template caricato con successo!`);
        
        // Reset the file input
        if (type === 'contract') {
          setContractTemplate(null);
          if (contractTemplateRef.current) contractTemplateRef.current.value = '';
        } else {
          setLegalTemplate(null);
          if (legalTemplateRef.current) legalTemplateRef.current.value = '';
        }

        // Refresh templates list
        const templatesResponse = await fetch(`${apiBaseUrl}/api/form-templates/sportello-lavoro`, {
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/form-templates/download/sportello-lavoro/${type}`, {
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

  const getAvailableTemplate = (type: 'contract' | 'legal') => {
    return formTemplates.find(template => template.type === type);
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    
    if (!formData.businessName.trim()) newErrors.push("Ragione Sociale is required");
    if (!formData.vatNumber.trim()) newErrors.push("Partita IVA is required");
    if (!formData.address.trim()) newErrors.push("Indirizzo is required");
    if (!formData.city.trim()) newErrors.push("Città is required");
    if (!formData.postalCode.trim()) newErrors.push("CAP is required");
    if (!formData.province.trim()) newErrors.push("Provincia is required");
    if (!formData.agreedCommission || formData.agreedCommission <= 0) {
      newErrors.push("Competenze concordate is required and must be greater than 0");
    }
    
    // Validate email format if provided
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.push("Please enter a valid email address");
    }
    
    // Validate PEC format if provided
    if (formData.pec && !/\S+@\S+\.\S+/.test(formData.pec)) {
      newErrors.push("Please enter a valid PEC address");
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setErrors([]);
    setSuccessMessage('');
    
    try {
      const formDataToSend = new FormData();
      
      // Append form data
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value.toString());
      });
      
      // Append files if present
      if (signedContract) {
        formDataToSend.append('signedContractFile', signedContract);
      }
      if (legalDoc) {
        formDataToSend.append('legalDocumentFile', legalDoc);
      }
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/sportello-lavoro`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccessMessage('Sportello Lavoro creato con successo!');
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
        if (data.errors && Array.isArray(data.errors)) {
          setErrors(data.errors);
        } else {
          setErrors([data.error || 'An error occurred']);
        }
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
              Gestione Moduli Sportello Lavoro (Admin)
            </h3>
          </div>
          
          {templateUploadMessage && (
            <div className="alert" style={{ 
              backgroundColor: templateUploadMessage.includes('successo') ? '#d1f2eb' : '#fadbd8',
              border: `1px solid ${templateUploadMessage.includes('successo') ? '#a3e4d7' : '#f1948a'}`,
              color: templateUploadMessage.includes('successo') ? '#0e6655' : '#922b21',
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <span style={{ marginRight: '8px' }}>
                {templateUploadMessage.includes('successo') ? '✅' : '❌'}
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
                  Carica Modulo Contratto Sportello
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
                  Carica Documento Legale Sportello
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
              Scarica Moduli Sportello Lavoro
            </h3>
          </div>
          
          <p style={{ 
            marginBottom: '20px', 
            color: '#495057',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
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

      <div className="new-company-form">
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

        {/* Basic Information */}
        <div className="form-section">
          <h2>Informazioni Azienda</h2>
          <div className="form-row">
          
          <div className="form-group">
            <label htmlFor="businessName">Ragione Sociale *</label>
            <input
              type="text"
              id="businessName"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              required
              placeholder="Inserisci la ragione sociale"
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