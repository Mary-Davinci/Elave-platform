// src/pages/CreateSupplier.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSupplier, SupplierFormData } from '../services/supplierService';
import { useAuth } from '../contexts/AuthContext';
import '../styles/SupplierForm.css';

// Italian provinces list
const provinces = [
  "Agrigento", "Alessandria", "Ancona", "Aosta", "Arezzo", "Ascoli Piceno", "Asti", "Avellino", "Bari", "Barletta-Andria-Trani",
  "Belluno", "Benevento", "Bergamo", "Biella", "Bologna", "Bolzano", "Brescia", "Brindisi", "Cagliari", "Caltanissetta",
  "Campobasso", "Caserta", "Catania", "Catanzaro", "Chieti", "Como", "Cosenza", "Cremona", "Crotone", "Cuneo", "Enna",
  "Fermo", "Ferrara", "Firenze", "Foggia", "Forlì-Cesena", "Frosinone", "Genova", "Gorizia", "Grosseto", "Imperia",
  "Isernia", "L'Aquila", "La Spezia", "Latina", "Lecce", "Lecco", "Livorno", "Lodi", "Lucca", "Macerata", "Mantova",
  "Massa-Carrara", "Matera", "Messina", "Milano", "Modena", "Monza e Brianza", "Napoli", "Novara", "Nuoro", "Oristano",
  "Padova", "Palermo", "Parma", "Pavia", "Perugia", "Pesaro e Urbino", "Pescara", "Piacenza", "Pisa", "Pistoia", "Pordenone",
  "Potenza", "Prato", "Ragusa", "Ravenna", "Reggio Calabria", "Reggio Emilia", "Rieti", "Rimini", "Roma", "Rovigo", "Salerno",
  "Sassari", "Savona", "Siena", "Siracusa", "Sondrio", "Sud Sardegna", "Taranto", "Teramo", "Terni", "Torino", "Trapani",
  "Trento", "Treviso", "Trieste", "Udine", "Varese", "Venezia", "Verbano-Cusio-Ossola", "Vercelli", "Verona", "Vibo Valentia",
  "Vicenza", "Viterbo"
];

const CreateSupplier: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<SupplierFormData>({
    ragioneSociale: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    partitaIva: '',
    codiceFiscale: '',
    referente: '',
    cellulare: '',
    telefono: '',
    email: '',
    pec: ''
  });

  // Check if user is authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = [
      { field: 'ragioneSociale', label: 'Ragione sociale' },
      { field: 'indirizzo', label: 'Indirizzo' },
      { field: 'citta', label: 'Città' },
      { field: 'cap', label: 'CAP' },
      { field: 'provincia', label: 'Provincia' },
      { field: 'partitaIva', label: 'Partita IVA' },
      { field: 'referente', label: 'Referente' },
      { field: 'cellulare', label: 'Cellulare' },
      { field: 'email', label: 'Email' }
    ];
    
    const invalidFields = requiredFields.filter(
      ({ field }) => !formData[field as keyof SupplierFormData]
    );
    
    if (invalidFields.length > 0) {
      setError(`I seguenti campi sono obbligatori: ${invalidFields.map(f => f.label).join(', ')}`);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await createSupplier(formData);
      navigate('/fornitori');
    } catch (err: any) {
      console.error('Error creating supplier:', err);
      setError(err.message || 'Si è verificato un errore durante la creazione del fornitore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="supplier-form-container">
      <header className="page-header">
        <h1>Aggiungi un fornitore</h1>
      </header>

      {error && (
        <div className="error-alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="supplier-form">
        <div className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ragioneSociale">
                Ragione sociale <span className="required">*</span>
              </label>
              <input
                type="text"
                id="ragioneSociale"
                name="ragioneSociale"
                value={formData.ragioneSociale}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="indirizzo">
                Indirizzo <span className="required">*</span>
              </label>
              <input
                type="text"
                id="indirizzo"
                name="indirizzo"
                value={formData.indirizzo}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="citta">
                Città <span className="required">*</span>
              </label>
              <input
                type="text"
                id="citta"
                name="citta"
                value={formData.citta}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="cap">
                CAP <span className="required">*</span>
              </label>
              <input
                type="text"
                id="cap"
                name="cap"
                value={formData.cap}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="provincia">
                Provincia <span className="required">*</span>
              </label>
              <select
                id="provincia"
                name="provincia"
                value={formData.provincia}
                onChange={handleChange}
                className="form-control"
                required
              >
                <option value="">Scegli la provincia</option>
                {provinces.map(province => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="partitaIva">
                Partita IVA <span className="required">*</span>
              </label>
              <input
                type="text"
                id="partitaIva"
                name="partitaIva"
                value={formData.partitaIva}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="codiceFiscale">
                Codice fiscale azienda
              </label>
              <input
                type="text"
                id="codiceFiscale"
                name="codiceFiscale"
                value={formData.codiceFiscale}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Contatti</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="referente">
                Referente <span className="required">*</span>
              </label>
              <input
                type="text"
                id="referente"
                name="referente"
                value={formData.referente}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="cellulare">
                Cellulare <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="cellulare"
                name="cellulare"
                value={formData.cellulare}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="telefono">
                Telefono
              </label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="pec">
                PEC
              </label>
              <input
                type="email"
                id="pec"
                name="pec"
                value={formData.pec}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate('/fornitori')}
          >
            Annulla
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Salvataggio in corso...' : 'Aggiungi'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSupplier;