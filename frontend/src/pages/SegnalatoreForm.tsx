import React, { useState, useRef, useEffect } from 'react';
import '../styles/NewCompany.css';
import { SegnalatoreFormData, FormTemplate } from '../types/interfaces';
import { segnalatoreService } from '../services/segnalatoreService';
import { useAuth } from '../contexts/AuthContext'; // Import AuthContext

const SegnalatoreForm: React.FC = () => {
  const { user } = useAuth(); // Get user from AuthContext
  
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
  
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  
  // New state for form templates
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [contractTemplate, setContractTemplate] = useState<File | null>(null);
  const [idTemplate, setIdTemplate] = useState<File | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [templateUploadMessage, setTemplateUploadMessage] = useState('');
  
  // Refs for file inputs
  const contractFileRef = useRef<HTMLInputElement>(null);
  const idDocumentFileRef = useRef<HTMLInputElement>(null);
  const contractTemplateRef = useRef<HTMLInputElement>(null);
  const idTemplateRef = useRef<HTMLInputElement>(null);

  // FIXED: Proper role checking logic
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSportelloLavoro = user?.role === 'sportello_lavoro' || user?.role === 'responsabile_territoriale' || isAdmin;
  
  // Use the actual user role, not a simplified version
  const userRole = user?.role || 'segnalatori';

  // Fetch form templates on component mount
  useEffect(() => {
    const fetchFormTemplates = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        
        // Fetch templates specifically for Segnalatore
        const response = await fetch(`${apiBaseUrl}/api/form-templates/segnalatore`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const templates = await response.json();
          console.log('Fetched Segnalatore templates:', templates);
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
    console.log('IsSportelloLavoro:', isSportelloLavoro);
    console.log('Final userRole:', userRole);
  }, [user, isAdmin, isSportelloLavoro, userRole]);

  const handleDeleteFile = (type: 'contract' | 'id') => {
    if (type === 'contract') {
      setContractFile(null);
      if (contractFileRef.current) {
        contractFileRef.current.value = '';
      }
    } else {
      setIdDocumentFile(null);
      if (idDocumentFileRef.current) {
        idDocumentFileRef.current.value = '';
      }
    }
  };

  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'contract' | 'id') => {
    const file = e.target.files?.[0] || null;
    if (type === 'contract') {
      setContractTemplate(file);
    } else if (type === 'id') {
      setIdTemplate(file);
    }
  };

  const handleUploadTemplate = async (type: 'contract' | 'id') => {
    const file = type === 'contract' ? contractTemplate : idTemplate;
    if (!file) return;

    setIsUploadingTemplate(true);
    setTemplateUploadMessage('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('template', file);
      uploadFormData.append('type', type);
      uploadFormData.append('category', 'segnalatore'); // Add category for Segnalatore

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/form-templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      if (response.ok) {
        await response.json();
        setTemplateUploadMessage(`${type === 'contract' ? 'Contratto' : 'Template Documento Identità'} caricato con successo!`);
        
        // Reset the file input
        if (type === 'contract') {
          setContractTemplate(null);
          if (contractTemplateRef.current) contractTemplateRef.current.value = '';
        } else {
          setIdTemplate(null);
          if (idTemplateRef.current) idTemplateRef.current.value = '';
        }

        // Refresh templates list
        const templatesResponse = await fetch(`${apiBaseUrl}/api/form-templates/segnalatore`, {
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

  const handleDownloadTemplate = async (type: 'contract' | 'id') => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/form-templates/download/segnalatore/${type}`, {
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
        const filename = template?.originalName || `segnalatore_${type}_template.pdf`;
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

  const getAvailableTemplate = (type: 'contract' | 'id') => {
    return formTemplates.find(template => template.type === type);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'agreementPercentage' ? parseFloat(value) || 0 : value
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'contract' | 'id') => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      // Use service validation
      const allowedTypes = segnalatoreService.getDocumentAllowedTypes();
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      const validation = segnalatoreService.validateFile(file, allowedTypes, maxSize);
      
      if (!validation.valid) {
        setErrors([validation.error || 'Invalid file']);
        return;
      }
    }
    
    if (fileType === 'contract') {
      setContractFile(file);
    } else {
      setIdDocumentFile(file);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    
    if (!formData.firstName.trim()) newErrors.push("Nome is required");
    if (!formData.lastName.trim()) newErrors.push("Cognome is required");
    if (!formData.email.trim()) newErrors.push("Email is required");
    if (!formData.address.trim()) newErrors.push("Indirizzo is required");
    if (!formData.city.trim()) newErrors.push("Città is required");
    if (!formData.postalCode.trim()) newErrors.push("CAP is required");
    if (!formData.province.trim()) newErrors.push("Provincia is required");
    if (!formData.taxCode.trim()) newErrors.push("Codice Fiscale is required");
    if (!formData.agreementPercentage || formData.agreementPercentage <= 0) {
      newErrors.push("Percentuale accordo is required and must be greater than 0");
    }
    
    // Use service validation methods
    if (!segnalatoreService.validatePercentage(formData.agreementPercentage)) {
      newErrors.push("Percentuale accordo cannot exceed 100%");
    }
    
    if (formData.email && !segnalatoreService.validateEmail(formData.email)) {
      newErrors.push("Please enter a valid email address");
    }
    
    if (formData.taxCode && !segnalatoreService.validateTaxCode(formData.taxCode)) {
      newErrors.push("Please enter a valid Italian tax code");
    }
    
    if (formData.postalCode && !segnalatoreService.validatePostalCode(formData.postalCode)) {
      newErrors.push("Please enter a valid postal code");
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
      // Use service to create segnalatore
      const segnalatoreData = {
        ...formData,
        contractFile: contractFile || undefined,
        idDocumentFile: idDocumentFile || undefined,
      };

      await segnalatoreService.createSegnalatore(segnalatoreData);
      
      setSuccessMessage('Segnalatore creato con successo!');
      
      // Reset form
      setFormData({
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
      setContractFile(null);
      setIdDocumentFile(null);
      
      // Reset file inputs
      if (contractFileRef.current) contractFileRef.current.value = '';
      if (idDocumentFileRef.current) idDocumentFileRef.current.value = '';
      
    } catch (error: any) {
      console.error('Error submitting form:', error);
      
      // Handle specific error types
      if (error.message.includes('Email already exists')) {
        setErrors(['Email already exists']);
      } else if (error.message.includes('Tax code already exists')) {
        setErrors(['Tax code already exists']);
      } else if (error.message.includes('validation')) {
        // Parse validation errors if they come in a specific format
        setErrors([error.message]);
      } else {
        setErrors(['Network error. Please try again.']);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="new-company-container">
      <div className="new-company-header">
        <h1 className="page-title">Nuovo Segnalatore</h1>
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
              backgroundColor: '#fff3e0',
              padding: '8px',
              borderRadius: '8px',
              marginRight: '12px'
            }}>
              <span style={{ fontSize: '20px' }}>👤</span>
            </div>
            <h3 style={{ 
              margin: 0, 
              color: '#e65100',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              Gestione Moduli Segnalatore (Admin)
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
                  Carica Template Contratto
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

            {/* ID Document Template Upload */}
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
                <span style={{ fontSize: '18px', marginRight: '8px' }}>🆔</span>
                <label style={{ 
                  display: 'block', 
                  margin: 0, 
                  fontWeight: '600',
                  color: '#495057',
                  fontSize: '16px'
                }}>
                  Carica Template Documento ID
                </label>
                {getAvailableTemplate('id') && (
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
                ref={idTemplateRef}
                onChange={(e) => handleTemplateFileChange(e, 'id')}
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
                onClick={() => handleUploadTemplate('id')}
                disabled={!idTemplate || isUploadingTemplate}
                style={{
                  backgroundColor: idTemplate && !isUploadingTemplate ? 'var(--primary-color)' : 'rgb(108, 117, 125)',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: idTemplate && !isUploadingTemplate ? 'pointer' : 'not-allowed',
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
                    Carica Template ID
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : isSportelloLavoro ? (
        // Sportello Lavoro and above: Download templates
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
              backgroundColor: '#fff3e0',
              padding: '8px',
              borderRadius: '8px',
              marginRight: '12px'
            }}>
              <span style={{ fontSize: '20px' }}>📥</span>
            </div>
            <h3 style={{ 
              margin: 0, 
              color: '#e65100',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              Scarica Moduli Segnalatore
            </h3>
          </div>
          
          <p style={{ 
            marginBottom: '20px', 
            color: '#495057',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            Scarica i moduli necessari per completare la procedura di registrazione Segnalatore.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleDownloadTemplate('contract')}
              disabled={!getAvailableTemplate('contract')}
              style={{
                backgroundColor: getAvailableTemplate('contract') ? '#ff7043' : '#6c757d',
                color: 'white',
                padding: '14px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: getAvailableTemplate('contract') ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: getAvailableTemplate('contract') ? '0 2px 4px rgba(255, 112, 67, 0.3)' : 'none',
                minWidth: '200px'
              }}
              onMouseOver={(e) => {
                if (getAvailableTemplate('contract')) {
                  e.currentTarget.style.backgroundColor = '#e64a19';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (getAvailableTemplate('contract')) {
                  e.currentTarget.style.backgroundColor = '#ff7043';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              📄 Scarica Contratto
            </button>
            
            <button
              type="button"
              onClick={() => handleDownloadTemplate('id')}
              disabled={!getAvailableTemplate('id')}
              style={{
                backgroundColor: getAvailableTemplate('id') ? '#4caf50' : '#6c757d',
                color: 'white',
                padding: '14px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: getAvailableTemplate('id') ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: getAvailableTemplate('id') ? '0 2px 4px rgba(76, 175, 80, 0.3)' : 'none',
                minWidth: '200px'
              }}
              onMouseOver={(e) => {
                if (getAvailableTemplate('id')) {
                  e.currentTarget.style.backgroundColor = '#388e3c';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (getAvailableTemplate('id')) {
                  e.currentTarget.style.backgroundColor = '#4caf50';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              🆔 Scarica Template ID
            </button>
          </div>
          
          {(!getAvailableTemplate('contract') || !getAvailableTemplate('id')) && (
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
      ) : (
        // Users without permission: Show restriction message
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          color: '#856404',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 8px 0' }}>⚠️ Permessi Insufficienti</h4>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Solo gli utenti con ruolo Sportello Lavoro o superiore possono creare Segnalatori.
          </p>
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

        {/* Personal Information */}
        <div className="form-section">
          <h2>Informazioni Personali</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">Nome *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="Inserisci il nome"
                disabled={isSubmitting || !isSportelloLavoro}
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Cognome *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Inserisci il cognome"
                disabled={isSubmitting || !isSportelloLavoro}
              />
            </div>

            <div className="form-group">
              <label htmlFor="taxCode">Codice Fiscale *</label>
              <input
                type="text"
                id="taxCode"
                name="taxCode"
                value={formData.taxCode}
                onChange={handleChange}
                required
                placeholder="Inserisci il codice fiscale"
                maxLength={16}
                style={{ textTransform: 'uppercase' }}
                disabled={isSubmitting || !isSportelloLavoro}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Inserisci l'email"
                disabled={isSubmitting || !isSportelloLavoro}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Telefono</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Inserisci il telefono"
                disabled={isSubmitting || !isSportelloLavoro}
              />
            </div>

            <div className="form-group">
              <label htmlFor="agreementPercentage">Percentuale Accordo (%) *</label>
              <input
                type="number"
                id="agreementPercentage"
                name="agreementPercentage"
                value={formData.agreementPercentage}
                onChange={handleChange}
                required
                placeholder="Inserisci la percentuale"
                min="0"
                max="100"
                step="0.01"
                disabled={isSubmitting || !isSportelloLavoro}
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="form-section">
          <h2>Indirizzo</h2>
          <div className="form-row">
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
                disabled={isSubmitting || !isSportelloLavoro}
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
                disabled={isSubmitting || !isSportelloLavoro}
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
                maxLength={5}
                disabled={isSubmitting || !isSportelloLavoro}
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
                maxLength={2}
                style={{ textTransform: 'uppercase' }}
                disabled={isSubmitting || !isSportelloLavoro}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="specialization">Specializzazione</label>
              <input
                type="text"
                id="specialization"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                placeholder="Inserisci la specializzazione"
                disabled={isSubmitting || !isSportelloLavoro}
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Note</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Inserisci eventuali note"
                rows={3}
                disabled={isSubmitting || !isSportelloLavoro}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>
        </div>

        {/* File Uploads */}
        {isSportelloLavoro && (
          <div className="upload-form-container">
            {/* Contract Upload */}
            <div className="form-group">
              <label htmlFor="contract-upload">Contratto</label>
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
                <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                  Size: {segnalatoreService.getFileSizeString(contractFile.size)}
                </div>
              )}
              {contractFile && (
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

            {/* ID Document Upload */}
            <div className="form-group">
              <label htmlFor="id-doc-upload">Documento Identità</label>
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
                <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                  Size: {segnalatoreService.getFileSizeString(idDocumentFile.size)}
                </div>
              )}
              {idDocumentFile && (
                <button
                  type="button"
                  className="delete-file-button"
                  onClick={() => handleDeleteFile('id')}
                  disabled={isSubmitting}
                >
                  ❌ Remove File
                </button>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        {isSportelloLavoro && (
          <div className="form-actions">
            <button 
              type="button" 
              className="submit-button"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Creazione in corso...' : 'Crea Segnalatore'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SegnalatoreForm;
