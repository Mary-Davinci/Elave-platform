// src/pages/UploadCompanies.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadCompaniesFromExcel } from '../services/companyService';
import '../styles/UploadCompanies.css';

const UploadCompanies: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDownloadExample = () => {
    // In a real implementation, this would trigger a file download
    // For now we'll just show an alert
    alert('Download esempio file aziende avviato');
  };

  const handleDownloadCCNLExample = () => {
    // In a real implementation, this would trigger a file download
    // For now we'll just show an alert
    alert('Download esempio file CCNL avviato');
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
            
            <button
              type="button"
              className="download-example-btn orange"
              onClick={handleDownloadCCNLExample}
            >
              <span className="icon">⬇️</span> Scarica file CCNL da abbinare alla colonna "M" del file di esempio aziende
            </button>
          </div>
          
          <div className="form-actions">
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
    </div>
  );
};

export default UploadCompanies;