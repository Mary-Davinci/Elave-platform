// src/pages/NewCompany.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCompany } from '../services/companyService';
import { CompanyFormData } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';
import '../styles/NewCompany.css';

const NewCompany: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state matching your interfaces
  const [formData, setFormData] = useState<CompanyFormData>({
    // Required fields from your merged interface
    name: '',
    businessName: '',
    companyName: '',
    vatNumber: '',
    employees: 0,
    isActive: true,

    // Optional fields
    fiscalCode: '',
    matricola: '',
    inpsCode: '',

    // Address fields
    address: {
      street: '',
      city: '',
      postalCode: '',
      province: '',
      country: 'Italy',
    },

    // Contact info
    contactInfo: {
      phoneNumber: '',
      mobile: '',
      email: '',
      pec: '',
      referent: '',
    },

    // Contract details
    contractDetails: {
      contractType: '',
      ccnlType: '',
      bilateralEntity: '',
      hasFondoSani: false,
      useEbapPayment: false,
    },

    signaler: '',
    industry: '',
    actuator: '',
  });

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (name.includes('.')) {
      // Handle nested properties (e.g., "address.city")
      const [parent, child] = name.split('.');
      const parentObj = { ...(formData[parent as keyof typeof formData] as any) };

      setFormData({
        ...formData,
        [parent]: {
          ...parentObj,
          [child]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        },
      });
    } else {
      // Handle top-level properties
      setFormData({
        ...formData,
        [name]:
          type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : type === 'number'
            ? parseInt(value) || 0
            : value,
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
          country: formData.address?.country?.trim() || 'Italy',
        },

        contactInfo: {
          phoneNumber: formData.contactInfo?.phoneNumber?.trim(),
          mobile: formData.contactInfo?.mobile?.trim(),
          email: formData.contactInfo?.email?.trim(),
          pec: formData.contactInfo?.pec?.trim(),
          referent: formData.contactInfo?.referent?.trim(),
        },
      };

      await createCompany(submissionData);
      navigate('/companies');
    } catch (err: any) {
      console.error('Error creating company:', err);

      const errorMessage =
        (Array.isArray(err.response?.data?.errors)
          ? err.response.data.errors.join(', ')
          : err.response?.data?.error) ||
        err.message ||
        'Failed to create company';

      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="add-company-container">
      <h1 className="page-title">Aggiungi un'azienda</h1>

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
              <input
                name="signaler"
                value={formData.signaler}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>
                Ragione sociale <span className="required">*</span>
              </label>
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
              <label>
                Indirizzo <span className="required">*</span>
              </label>
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
              <label>
                Città <span className="required">*</span>
              </label>
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
              <label>
                CAP <span className="required">*</span>
              </label>
              <input
                type="text"
                name="address.postalCode"
                value={formData.address?.postalCode}
                onChange={handleChange}
                required
                className="form-control"
              />
            </div>

            {/* Provincia as INPUT (replacing the old SELECT) */}
            <div className="form-group">
              <label>
                Provincia <span className="required">*</span>
              </label>
              <input
                type="text"
                name="address.province"
                value={formData.address?.province}
                onChange={handleChange}
                required
                className="form-control"
                placeholder="Es. MI, Milano"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label>
                Partita IVA <span className="required">*</span>
              </label>
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
              <label>
                Codice INPS <span className="required">*</span>
              </label>
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

          <div className="form-row">
            {/* Example contact fields (kept as in your file) */}
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

        {/* Segnalazione */}
        <div className="form-section">
          <h2 className="section-title">Segnalazione</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Responsabile Territoriale</label>
              <input
                type="text"
                name="contractDetails.bilateralEntity"
                value={formData.contractDetails?.bilateralEntity}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group toggle-group">
              <label>Consulente del Lavoro</label>
              <input
                type="text"
                name="contactInfo.phoneNumber"
                value={formData.contactInfo?.phoneNumber}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group toggle-group">
              <label>Procacciatore</label>
              <input
                type="text"
                name="contactInfo.phoneNumber"
                value={formData.contactInfo?.phoneNumber}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>
        </div>

        {/* Specifiche */}
        <div className="form-section">
          <h2 className="section-title">Specifiche</h2>

          <div className="form-row">
            <div className="form-group">
              <label>CCNL di riferimento</label>
              <input
                type="text"
                name="contractDetails.bilateralEntity"
                value={formData.contractDetails?.bilateralEntity}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group toggle-group">
              <label>Adesione ELAV</label>
              <input
                type="text"
                name="contactInfo.phoneNumber"
                value={formData.contactInfo?.phoneNumber}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group toggle-group">
              <label>Adesione salute amica</label>
              <input
                type="text"
                name="contactInfo.phoneNumber"
                value={formData.contactInfo?.phoneNumber}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Salvataggio...' : 'Aggiungi'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewCompany;
