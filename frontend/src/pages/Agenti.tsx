import React, { useState } from 'react';
import '../styles/NewCompany.css';
import { AgenteFormData } from '../types/interfaces';

const Agenti: React.FC = () => {
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

      // Get auth token (adjust this based on your auth implementation)
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

        const response = await fetch(`${apiBaseUrl}/api/agenti`, {

        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type header - let the browser set it for FormData
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
        const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
        fileInputs.forEach(input => {
          input.value = '';
        });
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

  return (
    <div className="add-company-container">
      <h1 className="page-title">Nomina Agente</h1>
      
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

        <div className="form-section">
          <h2 className="section-title">Allegati</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Contratto Firmato</label>
              <input 
                type="file" 
                onChange={(e) => handleFileChange(e, 'contract')} 
                className="form-control"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                disabled={isSubmitting}
              />
              {signedContract && (
                <small className="file-info">Selected: {signedContract.name}</small>
              )}
            </div>
            <div className="form-group">
              <label>Documento Legale Rappresentante</label>
              <input 
                type="file" 
                onChange={(e) => handleFileChange(e, 'doc')} 
                className="form-control"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                disabled={isSubmitting}
              />
              {legalDoc && (
                <small className="file-info">Selected: {legalDoc.name}</small>
              )}
            </div>
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