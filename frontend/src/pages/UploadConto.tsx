import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/UploadCompanies.css';
import { previewContoFromExcel, uploadContoFromExcel, type ContoUploadPreviewResponse } from '../services/contoService';

const UploadConto: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ContoUploadPreviewResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setPreviewData(null);
      setError(null);
    }
  };

  const handleDownloadExample = () => {
    const headers = [
      'mese',
      'anno',
      'matricola INPS',
      'ragione sociale',
      'non riconciliata',
      'Quota riconciliata',
      'Fondo Sanitario',
      'QUOTA FIACOM',
    ];
    const csv = `${headers.join(';')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'conto_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Seleziona un file prima di procedere');
      return;
    }

    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
      setError('Solo file Excel (.xlsx, .xls) sono supportati');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const result = await uploadContoFromExcel(formData);
      const buildDetails = (payload?: { errors?: string[]; duplicates?: Array<{ rowNumber: number; reason: string }> }) => {
        if (!payload) return '';
        const errorLines = (payload.errors || []).slice(0, 10);
        const dupLines = (payload.duplicates || []).slice(0, 10).map((d) => `Riga ${d.rowNumber}: ${d.reason}`);
        const parts: string[] = [];
        if (errorLines.length) parts.push(`Errori:\n- ${errorLines.join('\n- ')}`);
        if (dupLines.length) parts.push(`Duplicati:\n- ${dupLines.join('\n- ')}`);
        return parts.length ? `\n\n${parts.join('\n\n')}` : '';
      };
      if (result?.requiresConfirmation) {
        const dupLines = (result.duplicates || [])
          .slice(0, 15)
          .map((d) => `Riga ${d.rowNumber}: ${d.reason}`)
          .join('\n');
        const more = (result.duplicates && result.duplicates.length > 15)
          ? `\n...altre ${result.duplicates.length - 15} righe`
          : '';
        const fileNote = result.fileAlreadyUploaded
          ? `\n\nNota: questo file risulta già caricato${result.fileAlreadyUploadedAt ? ` (prima volta: ${new Date(result.fileAlreadyUploadedAt).toLocaleString('it-IT')})` : ''}.`
          : '';
        const ok = window.confirm(
          `Sono state trovate righe duplicate.\n\n${dupLines}${more}${fileNote}\n\nVuoi procedere comunque?`
        );
        if (!ok) {
          setLoading(false);
          return;
        }
        formData.append('confirmDuplicates', 'true');
        const confirmed = await uploadContoFromExcel(formData);
        alert((confirmed?.message || 'Import completato con successo.') + buildDetails(confirmed));
        navigate('/conto');
        return;
      }
      alert((result?.message || 'Import completato con successo.') + buildDetails(result));
      navigate('/conto');
    } catch (err: any) {
      setError(err?.message || 'Si è verificato un errore durante il caricamento');
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
      const preview = await previewContoFromExcel(formData);
      setPreviewData(preview);
    } catch (err: any) {
      setError(err?.message || 'Si è verificato un errore durante l’anteprima');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="upload-companies-container">
      <h1 className="page-title">Inserisci competenze da file XLSX</h1>

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
            <button type="button" className="download-example-btn green" onClick={handleDownloadExample}>
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
            <button type="submit" className="submit-button" disabled={loading || !selectedFile}>
              {loading ? 'Caricamento in corso...' : 'Carica'}
            </button>
          </div>
        </form>
      </div>

      {previewData && (
        <div className="upload-form-container" style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '12px' }}>Anteprima import</h3>
          {previewData.fileAlreadyUploaded && (
            <div className="error-alert" style={{ marginBottom: '12px' }}>
              <p>
                Attenzione: questo file risulta gi? caricato
                {previewData.fileAlreadyUploadedAt
                  ? ` (prima volta: ${new Date(previewData.fileAlreadyUploadedAt).toLocaleString('it-IT')})`
                  : ''}.
              </p>
            </div>
          )}
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
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Mese</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Anno</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Matricola INPS</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Ragione Sociale</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Non riconciliata</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Quota Riconciliata</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Fondo Sanitario</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Quota Fiacom</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {previewData.preview.map((row) => {
                  const status = row.errors && row.errors.length > 0 ? 'Errore' : 'OK';
                  const hasErrors = !!(row.errors && row.errors.length > 0);
                  const tooltip = hasErrors ? row.errors!.join(' | ') : undefined;
                  return (
                    <tr
                      key={`${row.rowNumber}-${row.data?.matricolaInps || row.data?.ragioneSociale}`}
                      style={hasErrors ? { backgroundColor: '#fff5f5' } : undefined}
                    >
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.rowNumber}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.mese || '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.anno || '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.matricolaInps || '-'}</td>
                      <td
                        title={tooltip}
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #f1f5f9',
                          color: hasErrors ? '#c53030' : undefined,
                          textDecoration: hasErrors ? 'underline' : undefined,
                          textDecorationColor: hasErrors ? '#e53e3e' : undefined,
                          textDecorationThickness: hasErrors ? '2px' : undefined,
                          cursor: hasErrors ? 'help' : undefined,
                          fontWeight: hasErrors ? 600 : undefined,
                        }}
                      >
                        {row.data?.ragioneSociale || '-'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.nonRiconciliata ?? '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.quotaRiconciliata ?? '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.fondoSanitario ?? '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.quotaFiacom ?? '-'}</td>
                      <td
                        title={tooltip}
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #f1f5f9',
                          color: hasErrors ? '#c53030' : undefined,
                          fontWeight: hasErrors ? 700 : undefined,
                          cursor: hasErrors ? 'help' : undefined,
                        }}
                      >
                        {status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {previewData?.nonRiconciliate && previewData.nonRiconciliate.length > 0 && (
        <div className="upload-form-container" style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '12px' }}>Quote non riconciliate</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Riga</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Mese</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Anno</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Matricola INPS</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Ragione Sociale</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Non riconciliata</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {previewData.nonRiconciliate.map((row) => (
                  <tr key={`nr-${row.rowNumber}-${row.data?.matricolaInps || row.data?.ragioneSociale}`}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.rowNumber}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.mese || '-'}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.anno || '-'}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.matricolaInps || '-'}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.ragioneSociale || '-'}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{row.data?.nonRiconciliata ?? '-'}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                      {row.errors?.length ? row.errors.join('; ') : 'Non riconciliata'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadConto;
