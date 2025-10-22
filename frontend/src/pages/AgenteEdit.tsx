import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/NewCompany.css';
import { AgenteFormData, FormTemplate } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL =
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000')
    .replace(/\/+$/, '');

type FileKind = 'contract' | 'legal';

const AgenteEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState<AgenteFormData>({
    businessName: '',
    vatNumber: '',
    address: '',
    city: '',
    postalCode: '',
    province: '',
    agreedCommission: 0,
    email: '',
    pec: '',
  });

  // Existing files (names + sizes if your API returns them)
  const [existingFiles, setExistingFiles] = useState<{
    contractName?: string;
    contractSize?: number;
    legalName?: string;
    legalSize?: number;
  }>({});

  // New uploads
  const [signedContract, setSignedContract] = useState<File | null>(null);
  const [legalDoc, setLegalDoc] = useState<File | null>(null);

  // Templates (optional reuse)
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [templateUploadMessage, setTemplateUploadMessage] = useState('');
  const [contractTemplate, setContractTemplate] = useState<File | null>(null);
  const [legalTemplate, setLegalTemplate] = useState<File | null>(null);

  // Refs
  const signedContractRef = useRef<HTMLInputElement>(null);
  const legalDocRef = useRef<HTMLInputElement>(null);
  const contractTemplateRef = useRef<HTMLInputElement>(null);
  const legalTemplateRef = useRef<HTMLInputElement>(null);



  // Fetch agente + templates
  useEffect(() => {
    const fetchAll = async () => {
      if (!id) {
        setErrors(['ID non valido']);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // agente
        const res = await fetch(`${API_BASE_URL}/api/agenti/${id}`, {
         headers: buildAuthHeaders(),
            credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Impossibile caricare l\'agente');

        setFormData({
          businessName: data.businessName || '',
          vatNumber: data.vatNumber || '',
          address: data.address || '',
          city: data.city || '',
          postalCode: data.postalCode || '',
          province: data.province || '',
          agreedCommission: data.agreedCommission ?? 0,
          email: data.email || '',
          pec: data.pec || '',
        });

        setExistingFiles({
          contractName: data?.signedContract?.originalName || data?.signedContractName,
          contractSize: data?.signedContract?.size || data?.signedContractSize,
          legalName: data?.legalDocument?.originalName || data?.legalDocumentName,
          legalSize: data?.legalDocument?.size || data?.legalDocumentSize,
        });

        // templates (optional)
        const tRes = await fetch(`${API_BASE_URL}/api/form-templates`, {
         headers: buildAuthHeaders(),
          credentials: 'include',
        });
        if (tRes.ok) {
          const t = await tRes.json();
          setFormTemplates(t);
        }
      } catch (e: any) {
        setErrors([e?.message || 'Errore di caricamento']);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const getAvailableTemplate = (type: FileKind) =>
    formTemplates.find((t) => t.type === type);

  const validate = (): string[] => {
    const out: string[] = [];
    if (!formData.businessName.trim()) out.push('Ragione Sociale obbligatoria');
    if (!formData.vatNumber.trim()) out.push('Partita IVA obbligatoria');
    if (!formData.address.trim()) out.push('Indirizzo obbligatorio');
    if (!formData.city.trim()) out.push('Città obbligatoria');
    if (!formData.postalCode.trim()) out.push('CAP obbligatorio');
    if (!formData.province.trim()) out.push('Provincia obbligatoria');
    if (!formData.agreedCommission || formData.agreedCommission <= 0) {
      out.push('Competenze concordate deve essere > 0');
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) out.push('Email non valida');
    if (formData.pec && !/\S+@\S+\.\S+/.test(formData.pec)) out.push('PEC non valida');
    return out;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'agreedCommission'
        ? parseFloat(value) || 0
        : (type === 'number' ? Number(value) : value),
    }));
    if (errors.length) setErrors([]);
    if (successMessage) setSuccessMessage('');
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: FileKind
  ) => {
    const file = e.target.files?.[0] || null;

    if (file) {
      const allowed = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/jpg', 'image/png'
      ];
      if (!allowed.includes(file.type)) {
        setErrors(['Sono permessi solo PDF, DOC, DOCX, JPG, JPEG, PNG']);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(['Dimensione massima 5MB']);
        return;
      }
    }

    if (fileType === 'contract') setSignedContract(file);
    else setLegalDoc(file);
  };

  const clearNewFile = (type: FileKind) => {
    if (type === 'contract') {
      setSignedContract(null);
      if (signedContractRef.current) signedContractRef.current.value = '';
    } else {
      setLegalDoc(null);
      if (legalDocRef.current) legalDocRef.current.value = '';
    }
  };

  const downloadExisting = async (type: FileKind) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/agenti/${id}/download?type=${type}`, {
        headers: buildAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Download non riuscito');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const name = type === 'contract'
        ? (existingFiles.contractName || 'contratto.pdf')
        : (existingFiles.legalName || 'documento_legale.pdf');
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Download non riuscito');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage('');

    const v = validate();
    if (v.length) { setErrors(v); return; }

    if (!id) { setErrors(['ID non valido']); return; }

    setIsSubmitting(true);
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== undefined && v !== null) payload.append(k, String(v));
      });
      if (signedContract) payload.append('signedContractFile', signedContract);
      if (legalDoc) payload.append('legalDocumentFile', legalDoc);

      const res = await fetch(`${API_BASE_URL}/api/agenti/${id}`, {
        method: 'PUT',
        headers: buildAuthHeaders(),
        credentials: 'include',
        body: payload,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Aggiornamento fallito');

      setSuccessMessage('Agente aggiornato con successo!');
      setSignedContract(null);
      setLegalDoc(null);
      if (signedContractRef.current) signedContractRef.current.value = '';
      if (legalDocRef.current) legalDocRef.current.value = '';

      // refresh existing file names if API returns them after update
      setExistingFiles({
        contractName: data?.signedContract?.originalName || data?.signedContractName || existingFiles.contractName,
        legalName: data?.legalDocument?.originalName || data?.legalDocumentName || existingFiles.legalName,
        contractSize: data?.signedContract?.size || data?.signedContractSize || existingFiles.contractSize,
        legalSize: data?.legalDocument?.size || data?.legalDocumentSize || existingFiles.legalSize,
      });
    } catch (e: any) {
      setErrors([e?.message || 'Errore di rete']);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Optional templates upload (same as your create page)
  const handleTemplateUpload = async (type: FileKind) => {
    const file = type === 'contract' ? contractTemplate : legalTemplate;
    if (!file) return;
    setIsUploadingTemplate(true);
    setTemplateUploadMessage('');
    try {
      const fd = new FormData();
      fd.append('template', file);
      fd.append('type', type);
      const res = await fetch(`${API_BASE_URL}/api/form-templates`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        credentials: 'include',
        body: fd,
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Upload fallito');

      setTemplateUploadMessage('Template caricato con successo!');
      // clear
      if (type === 'contract') {
        setContractTemplate(null);
        if (contractTemplateRef.current) contractTemplateRef.current.value = '';
      } else {
        setLegalTemplate(null);
        if (legalTemplateRef.current) legalTemplateRef.current.value = '';
      }
      // refresh list
      const t = await fetch(`${API_BASE_URL}/api/form-templates`, {
        headers: buildAuthHeaders(),
        credentials: 'include',
      });
      if (t.ok) setFormTemplates(await t.json());
    } catch (e: any) {
      setTemplateUploadMessage(e?.message || 'Errore upload template');
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  if (loading) {
    return (
      <div className="new-company-container">
        <div className="new-company-header"><h1 className="page-title">Modifica Agente</h1></div>
        <div className="loading">Caricamento…</div>
      </div>
    );
  }

  return (
    <div className="new-company-container">
      <div className="new-company-header">
        <h1 className="page-title">Modifica Agente</h1>
      </div>

      {/* Optional template section (kept consistent) */}
      {isAdmin && (
        <div className="template-management-section" style={{background:'#fff',padding:24,borderRadius:12,marginBottom:32,border:'1px solid #e1e5e9',boxShadow:'0 2px 8px rgba(0,0,0,.08)'}}>
          <div style={{display:'flex',alignItems:'center',marginBottom:16,paddingBottom:16,borderBottom:'2px solid #f8f9fa'}}>
            <div style={{background:'#e3f2fd',padding:8,borderRadius:8,marginRight:12}}>⚙️</div>
            <h3 style={{margin:0}}>Gestione Modelli (Admin)</h3>
          </div>

          {templateUploadMessage && (
            <div className="alert" style={{background:'#d1f2eb',border:'1px solid #a3e4d7',color:'#0e6655',padding:'10px 12px',borderRadius:8,marginBottom:16}}>
              {templateUploadMessage}
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(220px,1fr))',gap:24}}>
            <div style={{background:'#f8f9fa',padding:16,border:'1px solid #e9ecef',borderRadius:10}}>
              <div style={{marginBottom:8,fontWeight:600}}>Template Contratto {getAvailableTemplate('contract') && <span style={{marginLeft:8,color:'#28a745'}}>✓</span>}</div>
              <input type="file" ref={contractTemplateRef} onChange={(e)=>setContractTemplate(e.target.files?.[0]||null)} accept=".pdf,.doc,.docx" disabled={isUploadingTemplate} />
              <button type="button" onClick={()=>handleTemplateUpload('contract')} disabled={!contractTemplate || isUploadingTemplate} className="submit-button" style={{marginTop:10}}>
                {isUploadingTemplate ? 'Caricamento…' : 'Carica Contratto'}
              </button>
            </div>

            <div style={{background:'#f8f9fa',padding:16,border:'1px solid #e9ecef',borderRadius:10}}>
              <div style={{marginBottom:8,fontWeight:600}}>Documento Legale {getAvailableTemplate('legal') && <span style={{marginLeft:8,color:'#28a745'}}>✓</span>}</div>
              <input type="file" ref={legalTemplateRef} onChange={(e)=>setLegalTemplate(e.target.files?.[0]||null)} accept=".pdf,.doc,.docx" disabled={isUploadingTemplate} />
              <button type="button" onClick={()=>handleTemplateUpload('legal')} disabled={!legalTemplate || isUploadingTemplate} className="submit-button" style={{marginTop:10}}>
                {isUploadingTemplate ? 'Caricamento…' : 'Carica Documento'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="new-company-form">
        {successMessage && (
          <div className="alert alert-success" style={{background:'#d4edda',border:'1px solid #c3e6cb',color:'#155724',padding:10,borderRadius:4,marginBottom:16}}>
            {successMessage}
          </div>
        )}
        {!!errors.length && (
          <div className="alert alert-danger" style={{background:'#f8d7da',border:'1px solid #f5c6cb',color:'#721c24',padding:10,borderRadius:4,marginBottom:16}}>
            <ul style={{margin:0,paddingLeft:18}}>{errors.map((e,i)=>(<li key={i}>{e}</li>))}</ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>Informazioni Agente</h2>
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
                <input id="agreedCommission" name="agreedCommission" type="number" min={0} step={0.01}
                       value={formData.agreedCommission || ''} onChange={handleChange} required disabled={isSubmitting}/>
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

          {/* Files */}
          <div className="upload-form-container">
            <div className="form-group">
              <label>Contratto Firmato</label>
              {existingFiles.contractName && (
                <div style={{marginBottom:8, display:'flex', gap:8, alignItems:'center'}}>
                  <span className="file-select-name">{existingFiles.contractName}</span>
                  <button type="button" className="submit-button" onClick={()=>downloadExisting('contract')}>Scarica</button>
                </div>
              )}
              <div className="file-input-wrapper">
                <div className="file-select">
                  <input
                    type="file"
                    ref={signedContractRef}
                    onChange={(e)=>handleFileChange(e,'contract')}
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
                <button type="button" className="delete-file-button" onClick={()=>clearNewFile('contract')} disabled={isSubmitting}>
                  ❌ Remove File
                </button>
              )}
            </div>

            <div className="form-group">
              <label>Documento Legale</label>
              {existingFiles.legalName && (
                <div style={{marginBottom:8, display:'flex', gap:8, alignItems:'center'}}>
                  <span className="file-select-name">{existingFiles.legalName}</span>
                  <button type="button" className="submit-button" onClick={()=>downloadExisting('legal')}>Scarica</button>
                </div>
              )}
              <div className="file-input-wrapper">
                <div className="file-select">
                  <input
                    type="file"
                    ref={legalDocRef}
                    onChange={(e)=>handleFileChange(e,'legal')}
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
                <button type="button" className="delete-file-button" onClick={()=>clearNewFile('legal')} disabled={isSubmitting}>
                  ❌ Remove File
                </button>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={()=>navigate('/agenti')}>Annulla</button>
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? 'Salvataggio…' : 'Salva modifiche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgenteEdit;

function buildAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem('token') || sessionStorage.getItem('token');

  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}


