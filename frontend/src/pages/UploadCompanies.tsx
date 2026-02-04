// src/pages/UploadCompanies.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadCompaniesFromExcel, previewCompaniesFromExcel, CompanyUploadPreviewResponse } from '../services/companyService';
import '../styles/UploadCompanies.css';

const UploadCompanies: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<CompanyUploadPreviewResponse | null>(null);

  // Check if user is authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setPreviewData(null);
    }
  };

  const handleDownloadExample = () => {
    // In a real implementation, this would trigger a file download
    // For now we'll just show an alert
    alert('Download esempio file aziende avviato');
  };

 // Fix handleSubmit in UploadCompanies.tsx
// In UploadCompanies.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!selectedFile) {
    setError('Seleziona un file prima di procedere');
    return;
  }
  
  // Check file extension
  const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
  if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
    setError('Solo file Excel (.xlsx, .xls) sono supportati');
    return;
  }
  
  setLoading(true);
  setError(null);
  
  try {
    console.log(`Uploading file: ${selectedFile.name} (${selectedFile.type})`);
    
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // Call the API to upload and process the file
    const companies = await uploadCompaniesFromExcel(formData);
    
    // Success message
    console.log(`Upload successful: ${companies.length} companies imported`);
    alert(`${companies.length} aziende importate con successo!`);
    
    // Redirect to companies list page
    navigate('/companies');
  } catch (err: any) {
    console.error('Error uploading companies:', err);
    setError(err?.message || 'Si è verificato un errore durante il caricamento del file');
  } finally {
    setLoading(false);
  }
};

const handlePreview = async () => {
  if (!selectedFile) {
    setError('Seleziona un file prima di procedere');
    return;
  }

  const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
  if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
    setError('Solo file Excel (.xlsx, .xls) sono supportati');
    return;
  }

  setPreviewLoading(true);
  setError(null);

  try {
    const formData = new FormData();
    formData.append('file', selectedFile);
    const preview = await previewCompaniesFromExcel(formData);
    setPreviewData(preview);
  } catch (err: any) {
    console.error('Error previewing companies:', err);
    setError(err?.message || 'Si è verificato un errore durante l\'anteprima');
  } finally {
    setPreviewLoading(false);
  }
};
  return (
    <div className="upload-companies-container">
      <h1 className="page-title">Inserisci aziende da file XLSX</h1>
      
      {error && (
        <div className="error-alert">
          <p>{error}</p>
        </div>
      )}
      
      <div className="upload-form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="file-upload">
              File <span className="required">*</span>
            </label>
            
            <div className="file-input-wrapper">
              <div className="file-select">
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileChange}
                  accept=".xlsx,.xls"
                  required
                  className="file-input"
                />
                <div className="file-select-button">Choose File</div>
                <div className="file-select-name">
                  {selectedFile ? selectedFile.name : 'No file chosen'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="example-download-links">
            <button
              type="button"
              className="download-example-btn green"
              onClick={handleDownloadExample}
            >
              <span className="icon">⬇️</span> Scarica file di esempio
            </button>
            
          </div>
          
          <div className="form-actions">
            <button
              type="button"
              className="submit-button"
              onClick={handlePreview}
              disabled={previewLoading || loading || !selectedFile}
              style={{ backgroundColor: '#6c757d', marginRight: '12px' }}
            >
              {previewLoading ? 'Anteprima...' : 'Anteprima'}
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading || !selectedFile}
            >
              {loading ? 'Caricamento in corso...' : 'Carica'}
            </button>
          </div>
        </form>
      </div>

      {previewData && (
        <div className="upload-form-container" style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '12px' }}>Anteprima import</h3>
          {previewData.errors && previewData.errors.length > 0 && (
            <div className="error-alert" style={{ marginBottom: '12px' }}>
              <p>{previewData.errors.length} errori trovati</p>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Riga</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Ragione Sociale</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Partita IVA</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Codice Fiscale</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Matricola INPS</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Responsabile Territoriale</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Responsabile Sportello</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {previewData.preview.map((row) => {
                  const status = row.errors && row.errors.length > 0 ? 'Errore' : 'OK';
                  const vatDisplay =
                    row.data?.vatNumber && String(row.data.vatNumber).startsWith('NO-PIVA-')
                      ? '-'
                      : row.data?.vatNumber || '-';
                  return (
                    <tr key={`${row.rowNumber}-${row.data?.vatNumber || row.data?.businessName}`}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.rowNumber}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.businessName || '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{vatDisplay}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.fiscalCode || '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.inpsCode || '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.contractDetails?.territorialManager || '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.contactInfo?.laborConsultant || '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadCompanies;
