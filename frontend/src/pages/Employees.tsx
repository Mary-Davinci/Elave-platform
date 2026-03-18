// src/components/Employees.tsx - Updated version
import React, { useState, useEffect } from 'react';
import { Employee } from '../types/interfaces';
import { 
  getEmployeesByCompany, 
  createEmployee, 
  updateEmployee,
  deleteEmployee, 
  uploadEmployeesFromExcel,
  downloadEmployeesTemplateXlsx,
  EmployeeFormData,
  type EmployeeUploadResponse
} from '../services/employeeService';
import '../styles/Employees.css';

interface EmployeesProps {
  companyId: string;
  employees?: Employee[];
}

const Employees: React.FC<EmployeesProps> = ({ companyId, employees = [] }) => {
  // State for all employees
  const [allEmployees, setAllEmployees] = useState<Employee[]>(employees || []);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State for new employee form
  const [newEmployee, setNewEmployee] = useState<EmployeeFormData>({
    companyId,
    nome: '',
    cognome: '',
    dataNascita: '',
    cittaNascita: '',
    provinciaNascita: '',
    genere: '',
    codiceFiscale: '',
    indirizzo: '',
    numeroCivico: '',
    citta: '',
    provincia: '',
    cap: '',
    cellulare: '',
    telefono: '',
    email: '',
    attivo: true
  });

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<EmployeeUploadResponse | null>(null);

  // Load employees when component mounts or companyId changes
  useEffect(() => {
    const loadEmployees = async () => {
      if (companyId) {
        try {
          setLoading(true);
          setError(null);
          const fetchedEmployees = await getEmployeesByCompany(companyId);
          setAllEmployees(fetchedEmployees);
        } catch (err: any) {
          console.error('Error loading employees:', err);
          setError('Failed to load employees: ' + (err.message || 'Unknown error'));
          // If no employees prop was provided, keep empty array
          if (!employees.length) {
            setAllEmployees([]);
          }
        } finally {
          setLoading(false);
        }
      }
    };

    loadEmployees();
  }, [companyId]);

  // Update allEmployees when the employees prop changes
  useEffect(() => {
    if (employees && employees.length > 0) {
      setAllEmployees(employees);
    }
  }, [employees]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setNewEmployee({
      ...newEmployee,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setNewEmployee({
      companyId,
      nome: '',
      cognome: '',
      dataNascita: '',
      cittaNascita: '',
      provinciaNascita: '',
      genere: '',
      codiceFiscale: '',
      indirizzo: '',
      numeroCivico: '',
      citta: '',
      provincia: '',
      cap: '',
      cellulare: '',
      telefono: '',
      email: '',
      attivo: true
    });
    setEditingEmployeeId(null);
  };

  const fillFormFromEmployee = (employee: Employee) => {
    setNewEmployee({
      companyId,
      nome: employee.nome || '',
      cognome: employee.cognome || '',
      dataNascita: employee.dataNascita || '',
      cittaNascita: employee.cittaNascita || '',
      provinciaNascita: employee.provinciaNascita || '',
      genere: (employee.genere as any) || '',
      codiceFiscale: employee.codiceFiscale || '',
      indirizzo: employee.indirizzo || '',
      numeroCivico: employee.numeroCivico || '',
      citta: employee.citta || '',
      provincia: employee.provincia || '',
      cap: employee.cap || '',
      cellulare: employee.cellulare || '',
      telefono: employee.telefono || '',
      email: employee.email || '',
      attivo: employee.stato === 'attivo'
    });
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Create employee via API
      const createdEmployee = await createEmployee(newEmployee);
      
      // Add the new employee to the local state
      setAllEmployees(prev => [...prev, createdEmployee]);
      
      // Show success message
      setNotice({ type: 'success', text: 'Dipendente aggiunto con successo.' });
      
      // Close modal after submission
      setShowAddModal(false);
      
      // Reset form
      resetForm();
    } catch (error: any) {
      console.error('Error adding employee:', error);
      setError('Si è verificato un errore durante l\'aggiunta del dipendente: ' + error.message);
      setNotice({ type: 'error', text: 'Si è verificato un errore durante l\'aggiunta del dipendente: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployeeId) return;

    try {
      setLoading(true);
      setError(null);

      const updated = await updateEmployee(editingEmployeeId, newEmployee);
      setAllEmployees(prev => prev.map(emp => (emp._id === editingEmployeeId ? updated : emp)));

      setNotice({ type: 'success', text: 'Dipendente aggiornato con successo.' });
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error updating employee:', error);
      setError('Errore durante la modifica del dipendente: ' + error.message);
      setNotice({ type: 'error', text: 'Errore durante la modifica del dipendente: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadEmployees = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setNotice({ type: 'error', text: 'Seleziona un file prima di caricare.' });
      return;
    }
    
    try {
      setUploadLoading(true);
      setError(null);
      setUploadResult(null);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Upload employees via API
      const result = await uploadEmployeesFromExcel(companyId, formData);
      
      // Add the new employees to the local state
      setAllEmployees(prev => [...prev, ...result.employees]);
      setUploadResult(result);
      
      // Show success message
      setNotice({
        type: result.errorCount > 0 ? 'error' : 'success',
        text:
          `${result.createdCount} dipendenti importati` +
          (result.errorCount > 0 ? ` con ${result.errorCount} errori` : ''),
      });
      
      // Close modal after submission
      setShowUploadModal(false);
      
      // Reset file
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error: any) {
      console.error("Excel upload error:", error);
      const errorMessage = error.message || "Errore durante l'elaborazione del file Excel";
      setError(errorMessage);
      setNotice({ type: 'error', text: errorMessage });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownloadEmployeeTemplate = () => {
    downloadEmployeesTemplateXlsx().catch((err) => {
      console.error('Template download error:', err);
      setError('Impossibile scaricare il template XLSX');
    });
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo dipendente?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await deleteEmployee(employeeId);
      
      // Remove employee from local state
      setAllEmployees(prev => prev.filter(emp => emp._id !== employeeId));
      
      setNotice({ type: 'success', text: 'Dipendente eliminato con successo.' });
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      const errorMessage = 'Errore durante l\'eliminazione del dipendente: ' + error.message;
      setError(errorMessage);
      setNotice({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCodiceFiscale = () => {
    // In a real app, this would generate a fiscal code based on the employee's details
    // For now, just show a placeholder
    if (!newEmployee.nome || !newEmployee.cognome || !newEmployee.dataNascita) {
      setNotice({ type: 'error', text: 'Compila Nome, Cognome e Data di nascita per generare il codice fiscale.' });
      return;
    }
    
    // Simple mock generation - in production, use a proper fiscal code generator
    const mockCF = `${newEmployee.nome.substring(0, 3).toUpperCase()}${newEmployee.cognome.substring(0, 3).toUpperCase()}${newEmployee.dataNascita.replace(/-/g, '').substring(2)}A01H501Z`;
    
    setNewEmployee({
      ...newEmployee,
      codiceFiscale: mockCF
    });
    
    setNotice({ type: 'success', text: 'Codice fiscale generato.' });
  };

  const filteredEmployees = allEmployees.filter(emp => 
    emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.cognome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openEmployeeDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  const openEmployeeEdit = (employee: Employee) => {
    setEditingEmployeeId(employee._id);
    fillFormFromEmployee(employee);
    setShowAddModal(true);
  };

  return (
    <div className="employees-container">
      <div className="employees-header">
        <h2>Dipendenti</h2>
        <div className="employees-actions">
          <button 
            className="add-employee-btn"
            onClick={() => setShowAddModal(true)}
            disabled={loading}
          >
            <span className="icon">+</span> Aggiungi un dipendente
          </button>
          <button 
            className="upload-employees-btn"
            onClick={() => setShowUploadModal(true)}
            disabled={loading}
          >
            <span className="icon">↑</span> Aggiungi dipendenti da XLSX
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ color: 'red', margin: '10px 0', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      {notice && (
        <div
          style={{
            margin: '10px 0',
            padding: '10px',
            borderRadius: '4px',
            color: notice.type === 'success' ? '#166534' : '#991b1b',
            backgroundColor: notice.type === 'success' ? '#dcfce7' : '#fee2e2',
          }}
        >
          {notice.text}
        </div>
      )}

      <div className="search-bar">
        <input 
          type="text" 
          placeholder="Cerca..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={loading}
        />
        <span className="search-icon">🔍</span>
      </div>

      <div className="employees-table">
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Caricamento dipendenti...
          </div>
        )}
        
        <table>
          <thead>
            <tr>
              <th>
                <div className="th-content">
                  <span>Nome</span>
                  <span className="filter-icon">▼</span>
                </div>
              </th>
              <th>
                <div className="th-content">
                  <span>Cognome</span>
                  <span className="filter-icon">▼</span>
                </div>
              </th>
              <th>
                <div className="th-content">
                  <span>Cellulare</span>
                  <span className="filter-icon">▼</span>
                </div>
              </th>
              <th>
                <div className="th-content">
                  <span>Email</span>
                  <span className="filter-icon">▼</span>
                </div>
              </th>
              <th>
                <div className="th-content">
                  <span>Stato</span>
                  <span className="filter-icon">▼</span>
                </div>
              </th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map(employee => (
                <tr key={employee._id}>
                  <td>{employee.nome}</td>
                  <td>{employee.cognome}</td>
                  <td>{employee.cellulare || '-'}</td>
                  <td>{employee.email || '-'}</td>
                  <td>
                    <span className={`status-badge ${employee.stato}`}>
                      {employee.stato === 'attivo' ? 'Attivo' : 'Inattivo'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="view-btn" title="Visualizza" onClick={() => openEmployeeDetails(employee)}>👁️</button>
                    <button className="edit-btn" title="Modifica" onClick={() => openEmployeeEdit(employee)}>✏️</button>
                    <button 
                      className="delete-btn" 
                      title="Elimina"
                      onClick={() => handleDeleteEmployee(employee._id)}
                      disabled={loading}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="no-results">
                  {loading ? 'Caricamento...' : 'Nessun risultato'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View Employee Modal */}
      {showViewModal && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal employee-detail-modal">
            <div className="modal-header">
              <h3>Dettaglio dipendente</h3>
              <button className="close-btn" onClick={() => setShowViewModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group-employee">
                  <label>Nome</label>
                  <input className="employee-readonly" value={selectedEmployee.nome || ''} readOnly />
                </div>
                <div className="form-group-employee">
                  <label>Cognome</label>
                  <input className="employee-readonly" value={selectedEmployee.cognome || ''} readOnly />
                </div>
                <div className="form-group-employee">
                  <label>Codice Fiscale</label>
                  <input className="employee-readonly" value={selectedEmployee.codiceFiscale || ''} readOnly />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group-employee">
                  <label>Cellulare</label>
                  <input className="employee-readonly" value={selectedEmployee.cellulare || '-'} readOnly />
                </div>
                <div className="form-group-employee">
                  <label>Email</label>
                  <input className="employee-readonly" value={selectedEmployee.email || '-'} readOnly />
                </div>
                <div className="form-group-employee">
                  <label>Stato</label>
                  <input className="employee-readonly" value={selectedEmployee.stato || '-'} readOnly />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="upload-btn" onClick={() => setShowViewModal(false)}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingEmployeeId ? 'Modifica dipendente' : 'Aggiungi un dipendente'}</h3>
              <button className="close-btn" onClick={() => { setShowAddModal(false); resetForm(); }}>&times;</button>
            </div>
            <form onSubmit={editingEmployeeId ? handleUpdateEmployee : handleAddEmployee}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group-employee">
                    <label>Nome <span className="required">*</span></label>
                    <input
                      type="text"
                      name="nome"
                      value={newEmployee.nome}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cognome <span className="required">*</span></label>
                    <input
                      type="text"
                      name="cognome"
                      value={newEmployee.cognome}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label>Genere</label>
                    <select
                      name="genere"
                      value={newEmployee.genere}
                      onChange={handleInputChange}
                      disabled={loading}
                    >
                      <option value="">Non specificato</option>
                      <option value="M">Maschio</option>
                      <option value="F">Femmina</option>
                      <option value="A">Altro</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Data di nascita</label>
                    <input
                      type="date"
                      name="dataNascita"
                      value={newEmployee.dataNascita}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label>Citta di nascita</label>
                    <input
                      type="text"
                      name="cittaNascita"
                      value={newEmployee.cittaNascita}
                      onChange={handleInputChange}                      
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label>Provincia di nascita</label>
                    <select
                      name="provinciaNascita"
                      value={newEmployee.provinciaNascita}
                      onChange={handleInputChange}
                      disabled={loading}
                    >
                      <option value="">Scegli la provincia</option>
                      <option value="MI">Milano</option>
                      <option value="RM">Roma</option>
                      <option value="NA">Napoli</option>
                      <option value="TO">Torino</option>
                      <option value="FI">Firenze</option>
                      <option value="BO">Bologna</option>
                      <option value="BA">Bari</option>
                      <option value="PA">Palermo</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Codice fiscale <span className="required">*</span></label>
                    <div className="input-with-button">
                      <input
                        type="text"
                        name="codiceFiscale"
                        value={newEmployee.codiceFiscale}
                        onChange={handleInputChange}
                        required
                        maxLength={16}
                        disabled={loading}
                        style={{ textTransform: 'uppercase' }}
                      />
                      <button 
                        type="button" 
                        className="generate-btn"
                        onClick={handleGenerateCodiceFiscale}
                        disabled={loading}
                      >
                        Genera codice fiscale
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Indirizzo di residenza</label>
                    <input
                      type="text"
                      name="indirizzo"
                      value={newEmployee.indirizzo}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label>Numero civico</label>
                    <input
                      type="text"
                      name="numeroCivico"
                      value={newEmployee.numeroCivico}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label>Citta di residenza</label>
                    <input
                      type="text"
                      name="citta"
                      value={newEmployee.citta}
                      onChange={handleInputChange}                     
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Provincia di residenza</label>
                    <select
                      name="provincia"
                      value={newEmployee.provincia}
                      onChange={handleInputChange}
                      disabled={loading}
                    >
                      <option value="">Scegli la provincia</option>
                      <option value="MI">Milano</option>
                      <option value="RM">Roma</option>
                      <option value="NA">Napoli</option>
                      <option value="TO">Torino</option>
                      <option value="FI">Firenze</option>
                      <option value="BO">Bologna</option>
                      <option value="BA">Bari</option>
                      <option value="PA">Palermo</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>CAP di residenza</label>
                    <input
                      type="text"
                      name="cap"
                      value={newEmployee.cap}
                      onChange={handleInputChange}
                      maxLength={5}
                      pattern="[0-9]{5}"
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cellulare</label>
                    <input
                      type="text"
                      name="cellulare"
                      value={newEmployee.cellulare}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Telefono</label>
                    <input
                      type="text"
                      name="telefono"
                      value={newEmployee.telefono}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={newEmployee.email}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group toggle-group">
                    <label>Attivo</label>
                    <div className={`toggle-switch ${newEmployee.attivo ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        name="attivo"
                        checked={newEmployee.attivo}
                        onChange={handleInputChange}
                        disabled={loading}
                      />
                      <span className="toggle-slider"></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="add-btn" disabled={loading}>
                  {loading ? (editingEmployeeId ? 'Salvataggio...' : 'Aggiungendo...') : (editingEmployeeId ? 'Salva modifiche' : 'Aggiungi')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Employees Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal upload-modal">
            <div className="modal-header">
              <h3>Aggiungi dipendenti da XLSX</h3>
              <button className="close-btn" onClick={() => setShowUploadModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUploadEmployees}>
              <div className="modal-body">
                <div className="form-group">
                  <label>File <span className="required">*</span></label>
                  <div className="file-input-container">
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      disabled={uploadLoading}
                    />
                    <div className="file-name">
                      {selectedFile ? selectedFile.name : 'No file chosen'}
                    </div>
                  </div>
                  <small style={{ color: '#64748b' }}>
                    Colonne minime richieste: <b>Nome</b>, <b>Cognome</b>, <b>Codice Fiscale</b>.
                  </small>
                </div>
                <div className="template-download">
                  <button type="button" className="download-template-btn" onClick={handleDownloadEmployeeTemplate}>
                    <span className="icon">↓</span> Scarica file di esempio
                  </button>
                </div>
                {uploadResult && (
                  <div style={{ marginTop: 12, fontSize: 13, color: '#334155' }}>
                    {uploadResult.message}
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <ul style={{ marginTop: 8, maxHeight: 120, overflowY: 'auto' }}>
                        {uploadResult.errors.map((item, idx) => (
                          <li key={`upload-employee-error-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="submit" className="upload-btn" disabled={!selectedFile || uploadLoading}>
                  {uploadLoading ? 'Caricando...' : 'Carica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;






