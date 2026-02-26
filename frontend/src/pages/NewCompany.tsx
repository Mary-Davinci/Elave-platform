// src/pages/NewCompany.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCompany, getNextNumeroAnagrafica } from '../services/companyService';
import { CompanyFormData } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';
import '../styles/NewCompany.css';
import sportelloLavoroService, { SportelloLavoroResponse } from '../services/sportelloServices';

const normalizeSaluteAmicaPlan = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const lower = raw
    .replace('â‚¬', 'eur')
    .replace('€', 'eur')
    .replace(',', '.')
    .toLowerCase();
  if (lower.includes('5') && lower.includes('basic')) return '5.00 Basic';
  if (lower.includes('12') && lower.includes('standard')) return '12.00 Standard';
  if (lower.includes('16') && lower.includes('premium')) return '16.00 Premium';
  return raw;
};

const NewCompany: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated , user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consultants, setConsultants] = useState<SportelloLavoroResponse[]>([]);
  const [consultantsLoading, setConsultantsLoading] = useState(false);
  const [consultantsError, setConsultantsError] = useState<string | null>(null);
  const [numeroAnagraficaLoading, setNumeroAnagraficaLoading] = useState(false);
  const [numeroAnagraficaError, setNumeroAnagraficaError] = useState<string | null>(null);
  const [companyFiles, setCompanyFiles] = useState<{
    signedContract: File | null;
    privacyNotice: File | null;
    legalRepresentativeDocument: File | null;
    chamberOfCommerce: File | null;
  }>({
    signedContract: null,
    privacyNotice: null,
    legalRepresentativeDocument: null,
    chamberOfCommerce: null,
  });
  const normalizeLabelKey = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  // Form state matching your interfaces
const [formData, setFormData] = useState<CompanyFormData>({
  name: '',
  businessName: '',
  companyName: '',
  vatNumber: '',
  employees: 0,
  isActive: true,

  fiscalCode: '',
  matricola: '',
  inpsCode: '',
  numeroAnagrafica: '',

  address: {
    street: '',
    city: '',
    postalCode: '',
    province: '',
    country: 'Italy',
  },

  contactInfo: {
    phoneNumber: '',
    mobile: '',
    email: '',
    pec: '',
    referent: '',
    laborConsultant: '', // NEW
    laborConsultantId: '', // NEW
  },

  contractDetails: {
    contractType: '',
    ccnlType: '',             // use this for "CCNL di riferimento"
    bilateralEntity: '',
    hasFondoSani: false,
    useEbapPayment: false,
    elavAdhesion: false,        // NEW
    saluteAmicaAdhesion:'', // NEW
  },

  signaler: '',
  industry: '',
  actuator: '',
  territorialManager: '', // NEW
});


  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Inserisce in automatico il nome del responsabile territoriale.
  React.useEffect(() => {
    if (user && user.role === 'responsabile_territoriale') {
      const name = (user.firstName || user.username || '').trim() + (user.lastName ? ` ${user.lastName}` : '');
      setFormData(prev => ({
        ...prev,
        territorialManager: name.trim()
      }));
    }
  }, [user]);

  // carica i consulenti del lavoro , solo quelli attivi!!
  useEffect(() => {
    const loadConsultants = async () => {
      try {
        setConsultantsLoading(true);
        setConsultantsError(null);
        const list = await sportelloLavoroService.getAllSportelloLavoro();
        const active = (list || []).filter((c) => c.isActive);
        setConsultants(active);
      } catch (e: any) {
        setConsultantsError(e?.message || 'Impossibile caricare i consulenti del lavoro');
      } finally {
        setConsultantsLoading(false);
      }
    };
    loadConsultants();
  }, []);

  const consultantOptions = useMemo(() => {
    const byLabel = new Map<string, { id: string; label: string }>();
    consultants.forEach((c) => {
      // Prefer agentName to avoid showing territorial manager labels in dirty records.
      const label = String(c.agentName || c.businessName || '').trim();
      if (!label) return;
      const key = normalizeLabelKey(label);
      if (!byLabel.has(key)) {
        byLabel.set(key, { id: c._id, label });
      }
    });
    return Array.from(byLabel.values()).sort((a, b) => a.label.localeCompare(b.label, 'it'));
  }, [consultants]);

  useEffect(() => {
    let ignore = false;
    const loadNumeroAnagrafica = async () => {
      try {
        setNumeroAnagraficaLoading(true);
        setNumeroAnagraficaError(null);
        const next = await getNextNumeroAnagrafica();
        if (ignore) return;
        setFormData((prev) => {
          if (prev.numeroAnagrafica) return prev;
          return { ...prev, numeroAnagrafica: next };
        });
      } catch (e: any) {
        if (!ignore) {
          setNumeroAnagraficaError(
            e?.response?.data?.error || 'Impossibile ottenere il numero anagrafica'
          );
        }
      } finally {
        if (!ignore) setNumeroAnagraficaLoading(false);
      }
    };
    loadNumeroAnagrafica();
    return () => {
      ignore = true;
    };
  }, []);

 

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

    if (!companyFiles.signedContract) {
      setLoading(false);
      setError('Il Contratto Firmato è obbligatorio.');
      return;
    }

    try {
      // Prepare data for submission
     const submissionData = {
  // top-level
  name: formData.name?.trim(),
  businessName: formData.businessName?.trim(),
  companyName: (formData.companyName || formData.businessName || '').trim(),
  vatNumber: formData.vatNumber?.trim(),
  employees: Number(formData.employees) || 0,
  isActive: !!formData.isActive,
  fiscalCode: formData.fiscalCode?.trim(),
  matricola: formData.matricola?.trim(),
  inpsCode: formData.inpsCode?.trim(),
  numeroAnagrafica: formData.numeroAnagrafica?.trim(),
  signaler: formData.signaler?.trim(),
  industry: formData.industry?.trim(),
  actuator: formData.actuator?.trim(),

  // nested objects
  address: {
    street: formData.address?.street?.trim(),
    city: formData.address?.city?.trim(),
    postalCode: formData.address?.postalCode?.trim(),
    province: formData.address?.province?.trim(),
    country: (formData.address?.country || 'Italy').trim(),
  },

  contactInfo: {
    phoneNumber: formData.contactInfo?.phoneNumber?.trim(),
    mobile: formData.contactInfo?.mobile?.trim(),
    email: formData.contactInfo?.email?.trim(),
    pec: formData.contactInfo?.pec?.trim(),
    referent: formData.contactInfo?.referent?.trim(),
    laborConsultant: formData.contactInfo?.laborConsultant?.trim(),
    laborConsultantId: formData.contactInfo?.laborConsultantId || '',
  },

  contractDetails: {
    contractType: formData.contractDetails?.contractType?.trim(),
    ccnlType: formData.contractDetails?.ccnlType?.trim(),
    bilateralEntity: formData.contractDetails?.bilateralEntity?.trim(),
    hasFondoSani: !!formData.contractDetails?.hasFondoSani,
    useEbapPayment: !!formData.contractDetails?.useEbapPayment,
    elavAdhesion: !!formData.contractDetails?.elavAdhesion,
    // keep this as the SELECTED PLAN string (e.g., "€12.00 Standard")
    saluteAmicaAdhesion: normalizeSaluteAmicaPlan(formData.contractDetails?.saluteAmicaAdhesion),
    // if your API expects it here, not top-level:
    territorialManager: formData.territorialManager?.trim(),
  },
};


      await createCompany(submissionData, {
        signedContractFile: companyFiles.signedContract,
        privacyNoticeFile: companyFiles.privacyNotice,
        legalRepresentativeDocumentFile: companyFiles.legalRepresentativeDocument,
        chamberOfCommerceFile: companyFiles.chamberOfCommerce,
      });
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

  const handleCompanyFileChange = (
    key: 'signedContract' | 'privacyNotice' | 'legalRepresentativeDocument' | 'chamberOfCommerce',
    file: File | null
  ) => {
    setCompanyFiles((prev) => ({ ...prev, [key]: file }));
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
              <label>Numero anagrafica</label>
              <input
                name="numeroAnagrafica"
                value={formData.numeroAnagrafica}
                onChange={handleChange}
                className="form-control"
                placeholder={numeroAnagraficaLoading ? 'Assegnazione...' : 'Automatico'}
              />
              {numeroAnagraficaError && (
                <small style={{ color: 'red' }}>{numeroAnagraficaError}</small>
              )}
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
                Matricola INPS <span className="required">*</span>
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

        <div className="form-section">
  <h2 className="section-title">Segnalazione</h2>
  <div className="form-row">
    <div className="form-group">
      <label>Responsabile Territoriale</label>
      <input
        type="text"
        name="territorialManager"  // was contractDetails.bilateralEntity ❌
        value={formData.territorialManager}
        onChange={handleChange}
        className="form-control"
      />
    </div>

    <div className="form-group">
      <label>Consulente del Lavoro</label>
      <select
        name="contactInfo.laborConsultantId"
        value={formData.contactInfo?.laborConsultantId || ''}
        onChange={(e) => {
          const selectedId = e.target.value;
          const selected = consultants.find(c => c._id === selectedId);
          const label = selected ? (selected.agentName || selected.businessName || '') : '';
          setFormData(prev => ({
            ...prev,
            contactInfo: {
              ...prev.contactInfo,
              laborConsultantId: selectedId,
              laborConsultant: label,
            }
          }));
        }}
        className="form-control"
      >
        <option value="">-- Seleziona consulente --</option>
        {consultantsLoading && <option value="" disabled>Caricamento in corso...</option>}
        {!consultantsLoading && consultants.length === 0 && (
          <option value="" disabled>Nessun consulente attivo trovato</option>
        )}
        {!consultantsLoading && consultantOptions.map((c) => {
          const label = c.label || 'Senza nome';
          return (
            <option key={c.id} value={c.id}>{label}</option>
          );
        })}
      </select>
      {consultantsError && (
        <small style={{ color: 'red' }}>{consultantsError}</small>
      )}
    </div>

    <div className="form-group">
      <label>Segnalatore</label>
      <input
        type="text"
        name="signaler"
        value={formData.signaler}
        onChange={handleChange}
        className="form-control"
      />
    </div>
  </div>
</div>

<div className="form-section">
  <h2 className="section-title">Specifiche</h2>

  <div className="form-row">
    <div className="form-group">
      <label>CCNL di riferimento</label>
      <input
        type="text"
        name="contractDetails.ccnlType" // was bilateralEntity ❌
        value={formData.contractDetails?.ccnlType}
        onChange={handleChange}
        className="form-control"
      />
    </div>

    <div className="form-group">
      <label>Ente Bilaterale</label>
      <input
        type="text"
        name="contractDetails.bilateralEntity"
        value={formData.contractDetails?.bilateralEntity}
        onChange={handleChange}
        className="form-control"
      />
    </div>

    <div className="form-group">
  <label>Adesione Salute Amica</label>
  <select
    name="contractDetails.saluteAmicaAdhesion"
    value={formData.contractDetails?.saluteAmicaAdhesion || ''}
    onChange={handleChange}
    className="form-control"
    required
  >
    <option value="">-- Seleziona un piano --</option>
    <option value="5.00 Basic">5.00 Basic</option>
    <option value="12.00 Standard">12.00 Standard</option>
    <option value="16.00 Premium">16.00 Premium</option>
  </select>
</div>
  </div>
</div>

        <div className="form-section">
          <h2 className="section-title">Documenti Azienda</h2>
          <div className="company-files-grid">
            <div className="company-file-field">
              <label>Contratto Firmato <span className="required">*</span></label>
              <div className="file-input-wrapper">
                <div className="file-select company-file-select">
                  <input
                    id="company-file-signed-contract"
                    className="file-input"
                    type="file"
                    onChange={(e) => handleCompanyFileChange('signedContract', e.target.files?.[0] || null)}
                  />
                  <div className="file-select-button company-file-select-button">Scegli file</div>
                  <div className="file-select-name company-file-select-name">{companyFiles.signedContract?.name || 'Nessun file selezionato'}</div>
                </div>
              </div>
            </div>

            <div className="company-file-field">
              <label>Informativa Privacy</label>
              <div className="file-input-wrapper">
                <div className="file-select company-file-select">
                  <input
                    id="company-file-privacy"
                    className="file-input"
                    type="file"
                    onChange={(e) => handleCompanyFileChange('privacyNotice', e.target.files?.[0] || null)}
                  />
                  <div className="file-select-button company-file-select-button">Scegli file</div>
                  <div className="file-select-name company-file-select-name">{companyFiles.privacyNotice?.name || 'Nessun file selezionato'}</div>
                </div>
              </div>
            </div>

            <div className="company-file-field">
              <label>Documento Legale Rappresentante</label>
              <div className="file-input-wrapper">
                <div className="file-select company-file-select">
                  <input
                    id="company-file-legal"
                    className="file-input"
                    type="file"
                    onChange={(e) => handleCompanyFileChange('legalRepresentativeDocument', e.target.files?.[0] || null)}
                  />
                  <div className="file-select-button company-file-select-button">Scegli file</div>
                  <div className="file-select-name company-file-select-name">{companyFiles.legalRepresentativeDocument?.name || 'Nessun file selezionato'}</div>
                </div>
              </div>
            </div>

            <div className="company-file-field">
              <label>Visura Camerale</label>
              <div className="file-input-wrapper">
                <div className="file-select company-file-select">
                  <input
                    id="company-file-visura"
                    className="file-input"
                    type="file"
                    onChange={(e) => handleCompanyFileChange('chamberOfCommerce', e.target.files?.[0] || null)}
                  />
                  <div className="file-select-button company-file-select-button">Scegli file</div>
                  <div className="file-select-name company-file-select-name">{companyFiles.chamberOfCommerce?.name || 'Nessun file selezionato'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
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

