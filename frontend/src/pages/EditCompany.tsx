// src/pages/EditCompany.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCompanyById, updateCompany } from '../services/companyService';
import { CompanyFormData } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';
import '../styles/NewCompany.css';

const EditCompany: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state matching your interfaces
  const [formData, setFormData] = useState<CompanyFormData>({
    // Initial empty state (will be filled with company data)
    name: '',
    businessName: '',
    companyName: '',
    vatNumber: '',
    employees: 0,
    isActive: true,
    
    fiscalCode: '',
    matricola: '',
    inpsCode: '',
    
    address: {
      street: '',
      city: '',
      postalCode: '',
      province: '',
      country: 'Italy'
    },
    
    contactInfo: {
      phoneNumber: '',
      mobile: '',
      email: '',
      pec: '',
      referent: ''
    },
    
    contractDetails: {
      contractType: '',
      ccnlType: '',
      bilateralEntity: '',
      hasFondoSani: false,
      useEbapPayment: false
    },
    
    signaler: '',
    industry: '',
    actuator: ''
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Fetch company data
    const fetchCompanyData = async () => {
      if (!id) return;
      
      try {
        setFetchLoading(true);
        const companyData = await getCompanyById(id);
        
        // Transform company data to form data
        setFormData({
          name: companyData.name || '',
          businessName: companyData.businessName || '',
          companyName: companyData.companyName || '',
          vatNumber: companyData.vatNumber || '',
          employees: companyData.employees || 0,
          isActive: companyData.isActive,
          
          fiscalCode: companyData.fiscalCode || '',
          matricola: companyData.matricola || '',
          inpsCode: companyData.inpsCode || '',
          
          address: {
            street: companyData.address?.street || '',
            city: companyData.address?.city || '',
            postalCode: companyData.address?.postalCode || '',
            province: companyData.address?.province || '',
            country: companyData.address?.country || 'Italy'
          },
          
          contactInfo: {
            phoneNumber: companyData.contactInfo?.phoneNumber || '',
            mobile: companyData.contactInfo?.mobile || '',
            email: companyData.contactInfo?.email || '',
            pec: companyData.contactInfo?.pec || '',
            referent: companyData.contactInfo?.referent || ''
          },
          
          contractDetails: {
            contractType: companyData.contractDetails?.contractType || '',
            ccnlType: companyData.contractDetails?.ccnlType || '',
            bilateralEntity: companyData.contractDetails?.bilateralEntity || '',
            hasFondoSani: companyData.contractDetails?.hasFondoSani || false,
            useEbapPayment: companyData.contractDetails?.useEbapPayment || false
          },
          
          signaler: companyData.signaler || '',
          industry: companyData.industry || '',
          actuator: companyData.actuator || ''
        });
        
        setFetchLoading(false);
      } catch (err) {
        console.error('Error fetching company data:', err);
        setError('Failed to load company data');
        setFetchLoading(false);
      }
    };

    fetchCompanyData();
  }, [id, isAuthenticated, navigate]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name.includes('.')) {
      // Handle nested properties
      const [parent, child] = name.split('.');
      
      // Use type assertion for nested objects
      const parentObj = { ...(formData[parent as keyof typeof formData] as any) };
      
      setFormData({
        ...formData,
        [parent]: {
          ...parentObj,
          [child]: type === 'checkbox' 
            ? (e.target as HTMLInputElement).checked 
            : value
        }
      });
    } else {
      // Handle top-level properties
      setFormData({
        ...formData,
        [name]: type === 'checkbox' 
          ? (e.target as HTMLInputElement).checked 
          : type === 'number' 
            ? parseInt(value) || 0 
            : value
      });
    }
  };

  // Toggle checkbox value
  const handleToggle = (name: string) => {
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      const parentObj = { ...(formData[parent as keyof typeof formData] as any) };
      
      // For boolean values
      if (typeof parentObj[child] === 'boolean') {
        setFormData({
          ...formData,
          [parent]: {
            ...parentObj,
            [child]: !parentObj[child]
          }
        });
      } 
      // For string values that represent booleans (like contractType)
      else {
        setFormData({
          ...formData,
          [parent]: {
            ...parentObj,
            [child]: parentObj[child] ? '' : 'active'
          }
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: !formData[name as keyof typeof formData]
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    console.log("Submitting updated form data:", formData);
    try {
      // Prepare data for submission
      const submissionData = {
        ...formData,
        // Use businessName as companyName if companyName is empty
        companyName: formData.companyName?.trim() || formData.businessName?.trim(),
        // Ensure required fields are not empty
        businessName: formData.businessName?.trim(),
        vatNumber: formData.vatNumber?.trim(),
        inpsCode: formData.inpsCode?.trim(),
        
        // Sanitize nested objects
        address: {
          street: formData.address?.street?.trim(),
          city: formData.address?.city?.trim(),
          postalCode: formData.address?.postalCode?.trim(),
          province: formData.address?.province?.trim(),
          country: formData.address?.country?.trim() || 'Italy'
        },
        
        // Similarly sanitize other nested objects
        contactInfo: {
          phoneNumber: formData.contactInfo?.phoneNumber?.trim(),
          mobile: formData.contactInfo?.mobile?.trim(),
          email: formData.contactInfo?.email?.trim(),
          pec: formData.contactInfo?.pec?.trim(),
          referent: formData.contactInfo?.referent?.trim()
        }
      };
  
      if (id) {
        await updateCompany(id, submissionData);
        navigate('/companies');
      }
    } catch (err: any) {
      console.error('Error updating company:', err);
      
      // Handle different error formats
      const errorMessage = 
        // Check for array of errors
        (Array.isArray(err.response?.data?.errors) 
          ? err.response.data.errors.join(', ') 
          : 
        // Check for single error message
        err.response?.data?.error || 
        err.message || 
        'Failed to update company');
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Caricamento dati azienda...</p>
      </div>
    );
  }

  return (
    <div className="add-company-container">
      <h1 className="page-title">Modifica Azienda</h1>
      
      {error && (
        <div className="error-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Company Info Section */}
        <div className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label>Segnalatore</label>
              <select
                name="signaler"
                value={formData.signaler}
                onChange={handleChange}
                className="form-control"
              >
                <option value="">Scegli il segnalatore</option>
                <option value="agent1">Agente 1</option>
                <option value="agent2">Agente 2</option>
                <option value="agent3">Agente 3</option>
              </select>
            </div>

            <div className="form-group">
              <label>Ragione sociale <span className="required">*</span></label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                required
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Indirizzo <span className="required">*</span></label>
              <input
                type="text"
                name="address.street"
                value={formData.address?.street}
                onChange={handleChange}
                required
                className="form-control"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Città <span className="required">*</span></label>
              <input
                type="text"
                name="address.city"
                value={formData.address?.city}
                onChange={handleChange}
                required
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>CAP <span className="required">*</span></label>
              <input
                type="text"
                name="address.postalCode"
                value={formData.address?.postalCode}
                onChange={handleChange}
                required
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Provincia <span className="required">*</span></label>
              <select
                name="address.province"
                value={formData.address?.province}
                onChange={handleChange}
                required
                className="form-control"
              >
                <option value="">Scegli la provincia</option>
                <option value="Milano">Milano</option>
                <option value="Roma">Roma</option>
                <option value="Napoli">Napoli</option>
                <option value="Torino">Torino</option>
                <option value="Firenze">Firenze</option>
                <option value="Bologna">Bologna</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Partita IVA <span className="required">*</span></label>
              <input
                type="text"
                name="vatNumber"
                value={formData.vatNumber}
                onChange={handleChange}
                required
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Codice Fiscale</label>
              <input
                type="text"
                name="fiscalCode"
                value={formData.fiscalCode}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Codice INPS <span className="required">*</span></label>
              <input
                type="text"
                name="inpsCode"
                value={formData.inpsCode}
                onChange={handleChange}
                required
                className="form-control"
              />
            </div>
          </div>
        </div>

        {/* Contacts Section */}
        <div className="form-section">
          <h2 className="section-title">Contatti</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo di contatto <span className="required">*</span></label>
              <select
                name="contactType"
                className="form-control"
                required
              >
                <option value="">Scegli il tipo di contatto</option>
                <option value="direct">Diretto</option>
                <option value="office">Ufficio</option>
                <option value="consultant">Consulente</option>
              </select>
            </div>

            <div className="form-group">
              <label>Referente</label>
              <input
                type="text"
                name="contactInfo.referent"
                value={formData.contactInfo?.referent}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Cellulare</label>
              <input
                type="text"
                name="contactInfo.mobile"
                value={formData.contactInfo?.mobile}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Telefono</label>
              <input
                type="text"
                name="contactInfo.phoneNumber"
                value={formData.contactInfo?.phoneNumber}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="contactInfo.email"
                value={formData.contactInfo?.email}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>PEC</label>
              <input
                type="email"
                name="contactInfo.pec"
                value={formData.contactInfo?.pec}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>
        </div>

        {/* Specifiche Section */}
        <div className="form-section">
          <h2 className="section-title">Specifiche</h2>

          <div className="form-row">
            <div className="form-group toggle-group">
              <label>Contratto CCNL Conflavoro - Fesica/Confsal</label>
              <div 
                className={`toggle-switch ${formData.contractDetails?.contractType ? 'active' : ''}`}
                onClick={() => handleToggle('contractDetails.contractType')}
              >
                <div className="toggle-slider"></div>
              </div>
            </div>

            <div className="form-group">
              <label>CCNL applicato <span className="required">*</span></label>
              <select
                name="contractDetails.ccnlType"
                value={formData.contractDetails?.ccnlType}
                onChange={handleChange}
                required
                className="form-control"
              >
                <option value="">Scegli il CCNL</option>
                <option value="commercio">Commercio</option>
                <option value="industria">Industria</option>
                <option value="artigianato">Artigianato</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Ente Bilaterale di riferimento</label>
              <input
                type="text"
                name="contractDetails.bilateralEntity"
                value={formData.contractDetails?.bilateralEntity}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group toggle-group">
              <label>Adesione Fondosani</label>
              <div 
                className={`toggle-switch ${formData.contractDetails?.hasFondoSani ? 'active' : ''}`}
                onClick={() => handleToggle('contractDetails.hasFondoSani')}
              >
                <div className="toggle-slider"></div>
              </div>
            </div>

            <div className="form-group toggle-group">
              <label>Versamento tramite codice EBAP</label>
              <div 
                className={`toggle-switch ${formData.contractDetails?.useEbapPayment ? 'active' : ''}`}
                onClick={() => handleToggle('contractDetails.useEbapPayment')}
              >
                <div className="toggle-slider"></div>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group toggle-group">
              <label>Attivo</label>
              <div 
                className={`toggle-switch ${formData.isActive ? 'active' : ''}`}
                onClick={() => handleToggle('isActive')}
              >
                <div className="toggle-slider"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Aggiornamento...' : 'Aggiorna Azienda'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCompany;