// src/pages/CompanyEdit.tsx
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/NewCompany.css';
import { useAuth } from '../contexts/AuthContext';
import { CompanyFormData, Company } from '../types/interfaces';
import {
  getCompanyById,   // <-- make sure these exist in companyService
  updateCompany,
} from '../services/companyService';

const emptyForm: CompanyFormData = {
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
    country: 'Italy',
  },

  contactInfo: {
    phoneNumber: '',
    mobile: '',
    email: '',
    pec: '',
    referent: '',
    laborConsultant: '',
    procurer: '',
  },

  contractDetails: {
    contractType: '',
    ccnlType: '',
    bilateralEntity: '',
    hasFondoSani: false,
    useEbapPayment: false,
    elavAdhesion: false,
    saluteAmicaAdhesion: '',
  },

  signaler: '',
  industry: '',
  actuator: '',
  territorialManager: '',
};

const CompanyEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [formData, setFormData] = React.useState<CompanyFormData>(emptyForm);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  // Load company
  React.useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        if (!id) throw new Error('ID mancante');
        setLoading(true);
        setError(null);

        const company: Company = await getCompanyById(id);

        if (ignore) return;
        // Map API entity -> form data (defensive)
        setFormData({
          name: company.name || '',
          businessName: company.businessName || '',
          companyName: company.companyName || company.businessName || '',
          vatNumber: company.vatNumber || '',
          employees: Number(company.employees) || 0,
          isActive: company.isActive !== false,

          fiscalCode: company.fiscalCode || '',
          matricola: company.matricola || '',
          inpsCode: company.inpsCode || '',

          address: {
            street: company.address?.street || '',
            city: company.address?.city || '',
            postalCode: company.address?.postalCode || '',
            province: company.address?.province || '',
            country: company.address?.country || 'Italy',
          },

          contactInfo: {
            phoneNumber: company.contactInfo?.phoneNumber || '',
            mobile: company.contactInfo?.mobile || '',
            email: company.contactInfo?.email || '',
            pec: company.contactInfo?.pec || '',
            referent: company.contactInfo?.referent || '',
            laborConsultant: company.contactInfo?.laborConsultant || '',
            procurer: company.contactInfo?.procurer || '',
          },

          contractDetails: {
            contractType: company.contractDetails?.contractType || '',
            ccnlType: company.contractDetails?.ccnlType || '',
            bilateralEntity: company.contractDetails?.bilateralEntity || '',
            hasFondoSani: !!company.contractDetails?.hasFondoSani,
            useEbapPayment: !!company.contractDetails?.useEbapPayment,
            elavAdhesion: !!company.contractDetails?.elavAdhesion,
            saluteAmicaAdhesion: company.contractDetails?.saluteAmicaAdhesion || '',
          },

          signaler: company.signaler || '',
          industry: company.industry || '',
          actuator: company.actuator || '',
          territorialManager:
            company.territorialManager ||
            company.contractDetails?.territorialManager || // in case API still returns it nested
            '',
        });
      } catch (e: any) {
        setError(
          e?.response?.data?.error ||
            e?.message ||
            'Impossibile caricare i dati dell’azienda'
        );
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      const parentObj = { ...(formData[parent as keyof typeof formData] as any) };

      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...parentObj,
          [child]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]:
          type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : type === 'number'
            ? parseInt(value) || 0
            : value,
      }));
    }
  };

  const buildSubmission = (data: CompanyFormData) => ({
    // top-level
    name: data.name?.trim(),
    businessName: data.businessName?.trim(),
    companyName: (data.companyName || data.businessName || '').trim(),
    vatNumber: data.vatNumber?.trim(),
    employees: Number(data.employees) || 0,
    isActive: !!data.isActive,
    fiscalCode: data.fiscalCode?.trim(),
    matricola: data.matricola?.trim(),
    inpsCode: data.inpsCode?.trim(),
    signaler: data.signaler?.trim(),
    industry: data.industry?.trim(),
    actuator: data.actuator?.trim(),

    address: {
      street: data.address?.street?.trim(),
      city: data.address?.city?.trim(),
      postalCode: data.address?.postalCode?.trim(),
      province: data.address?.province?.trim(),
      country: (data.address?.country || 'Italy').trim(),
    },

    contactInfo: {
      phoneNumber: data.contactInfo?.phoneNumber?.trim(),
      mobile: data.contactInfo?.mobile?.trim(),
      email: data.contactInfo?.email?.trim(),
      pec: data.contactInfo?.pec?.trim(),
      referent: data.contactInfo?.referent?.trim(),
      laborConsultant: data.contactInfo?.laborConsultant?.trim(),
      procurer: data.contactInfo?.procurer?.trim(),
    },

    contractDetails: {
      contractType: data.contractDetails?.contractType?.trim(),
      ccnlType: data.contractDetails?.ccnlType?.trim(),
      bilateralEntity: data.contractDetails?.bilateralEntity?.trim(),
      hasFondoSani: !!data.contractDetails?.hasFondoSani,
      useEbapPayment: !!data.contractDetails?.useEbapPayment,
      elavAdhesion: !!data.contractDetails?.elavAdhesion,
      saluteAmicaAdhesion: data.contractDetails?.saluteAmicaAdhesion || '',
      // If your backend expects this inside contractDetails, keep it here; otherwise you already
      // have a top-level territorialManager below.
      // territorialManager: data.territorialManager?.trim(),
    },

    territorialManager: data.territorialManager?.trim(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);
    try {
      const payload = buildSubmission(formData);
      await updateCompany(id, payload);
      navigate('/companies');
    } catch (err: any) {
      const msg =
        (Array.isArray(err.response?.data?.errors)
          ? err.response.data.errors.join(', ')
          : err.response?.data?.error) ||
        err.message ||
        'Aggiornamento azienda non riuscito';
      setError(msg);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="add-company-container">
        <h1 className="page-title">Modifica azienda</h1>
        <div className="loading">Caricamento…</div>
      </div>
    );
  }

  return (
    <div className="add-company-container">
      <h1 className="page-title">Modifica azienda</h1>

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
                name="territorialManager"
                value={formData.territorialManager}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Consulente del Lavoro</label>
              <input
                type="text"
                name="contactInfo.laborConsultant"
                value={formData.contactInfo?.laborConsultant}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Procacciatore</label>
              <input
                type="text"
                name="contactInfo.procurer"
                value={formData.contactInfo?.procurer}
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
                name="contractDetails.ccnlType"
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
                <option value="€5.00 Basic">€5.00 Basic</option>
                <option value="€12.00 Standard">€12.00 Standard</option>
                <option value="€16.00 Premium">€16.00 Premium</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate('/companies')}
            disabled={saving}
          >
            Annulla
          </button>
          <button type="submit" className="submit-button" disabled={saving}>
            {saving ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyEdit;
