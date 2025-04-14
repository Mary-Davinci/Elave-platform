// src/components/Employees.tsx
import React, { useState, useEffect } from 'react';
import { Employee, EmployeeStatus } from '../types/interfaces';
import '../styles/Employees.css';

interface EmployeesProps {
  companyId: string;
  employees: Employee[];
}

const Employees: React.FC<EmployeesProps> = ({ companyId, employees = [] }) => {
  // State for all employees
  const [allEmployees, setAllEmployees] = useState<Employee[]>(employees || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // State for new employee form
  const [newEmployee, setNewEmployee] = useState({
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

  // Update allEmployees when the employees prop changes
  useEffect(() => {
    setAllEmployees(employees);
  }, [employees]);

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

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Here you would typically make an API call to add the employee
      // For demonstration, creating a mock employee with ID
      const newEmployeeData: Employee = {
        _id: `temp-${Date.now()}`, // In real app, this would come from the server
        nome: newEmployee.nome,
        cognome: newEmployee.cognome,
        cellulare: newEmployee.cellulare || '',
        email: newEmployee.email || '',
        stato: newEmployee.attivo ? 'attivo' : 'inattivo',
        genere: newEmployee.genere,
        dataNascita: newEmployee.dataNascita,
        cittaNascita: newEmployee.cittaNascita,
        provinciaNascita: newEmployee.provinciaNascita,
        codiceFiscale: newEmployee.codiceFiscale,
        indirizzo: newEmployee.indirizzo,
        numeroCivico: newEmployee.numeroCivico,
        citta: newEmployee.citta,
        provincia: newEmployee.provincia,
        cap: newEmployee.cap,
        telefono: newEmployee.telefono || '',
        companyId: companyId
      };
      
      // Add the new employee to the local state
      setAllEmployees([...allEmployees, newEmployeeData]);
      
      // Show success message (in real app)
      alert("Dipendente aggiunto con successo!");
      
      // Close modal after submission
      setShowAddModal(false);
      
      // Reset form
      setNewEmployee({
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
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Si è verificato un errore durante l\'aggiunta del dipendente.');
    }
  };

  const handleUploadEmployees = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert("Seleziona un file prima di caricare");
      return;
    }
    
    // Simulate processing an Excel file
    try {
      // Here you would typically make an API call to upload and process the Excel file
      // For demonstration, creating mock employees
      const mockEmployeesFromExcel: Employee[] = [
        {
          _id: `temp-xl-${Date.now()}-1`,
          nome: "Mario",
          cognome: "Rossi",
          cellulare: "3331234567",
          email: "mario.rossi@example.com",
          stato: "attivo",
          genere: "M",
          dataNascita: "1980-01-01",
          cittaNascita: "Milano",
          provinciaNascita: "MI",
          codiceFiscale: "RSSMRA80A01F205Z",
          indirizzo: "Via Roma",
          numeroCivico: "1",
          citta: "Milano",
          provincia: "MI",
          cap: "20100",
          telefono: "",
          companyId: companyId
        },
        {
          _id: `temp-xl-${Date.now()}-2`,
          nome: "Giulia",
          cognome: "Bianchi",
          cellulare: "3337654321",
          email: "giulia.bianchi@example.com",
          stato: "attivo",
          genere: "F",
          dataNascita: "1985-05-15",
          cittaNascita: "Roma",
          provinciaNascita: "RM",
          codiceFiscale: "BNCGLI85E55H501Y",
          indirizzo: "Via Nazionale",
          numeroCivico: "10",
          citta: "Roma",
          provincia: "RM",
          cap: "00100",
          telefono: "",
          companyId: companyId
        }
      ];
      
      // Add the new employees to the local state
      setAllEmployees([...allEmployees, ...mockEmployeesFromExcel]);
      
      // Show success message
      alert(`${mockEmployeesFromExcel.length} dipendenti importati con successo!`);
      
      // Close modal after submission
      setShowUploadModal(false);
      
      // Reset file
      setSelectedFile(null);
    } catch (error) {
      alert("Errore durante l'elaborazione del file Excel");
      console.error("Excel upload error:", error);
    }
  };

  const handleGenerateCodiceFiscale = () => {
    // In a real app, this would generate a fiscal code based on the employee's details
    alert('Codice fiscale generato!');
    // Here, just set a placeholder value
    setNewEmployee({
      ...newEmployee,
      codiceFiscale: 'RSSMRA80A01H501Z'
    });
  };

  const filteredEmployees = allEmployees.filter(emp => 
    emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.cognome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="employees-container">
      <div className="employees-header">
        <h2>Dipendenti</h2>
        <div className="employees-actions">
          <button 
            className="add-employee-btn"
            onClick={() => setShowAddModal(true)}
          >
            <span className="icon">+</span> Aggiungi un dipendente
          </button>
          <button 
            className="upload-employees-btn"
            onClick={() => setShowUploadModal(true)}
          >
            <span className="icon">↑</span> Aggiungi dipendenti da XLSX
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input 
          type="text" 
          placeholder="Cerca..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="search-icon">🔍</span>
      </div>

      <div className="employees-table">
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
                  <td>{employee.cellulare}</td>
                  <td>{employee.email}</td>
                  <td>
                    <span className={`status-badge ${employee.stato}`}>
                      {employee.stato === 'attivo' ? 'Attivo' : 'Inattivo'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="view-btn" title="Visualizza">👁️</button>
                    <button className="edit-btn" title="Modifica">✏️</button>
                    <button className="delete-btn" title="Elimina">🗑️</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="no-results">
                  Nessun risultato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Aggiungi un dipendente</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddEmployee}>
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
                    />
                  </div>
                  <div className="form-group">
                    <label>Genere <span className="required">*</span></label>
                    <select
                      name="genere"
                      value={newEmployee.genere}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Scegli il genere</option>
                      <option value="M">Maschio</option>
                      <option value="F">Femmina</option>
                      <option value="A">Altro</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Data di nascita <span className="required">*</span></label>
                    <input
                      type="date"
                      name="dataNascita"
                      value={newEmployee.dataNascita}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Città di nascita <span className="required">*</span></label>
                    <input
                      type="text"
                      name="cittaNascita"
                      value={newEmployee.cittaNascita}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Provincia di nascita <span className="required">*</span></label>
                    <select
                      name="provinciaNascita"
                      value={newEmployee.provinciaNascita}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Scegli la provincia</option>
                      <option value="MI">Milano</option>
                      <option value="RM">Roma</option>
                      <option value="NA">Napoli</option>
                      <option value="TO">Torino</option>
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
                      />
                      <button 
                        type="button" 
                        className="generate-btn"
                        onClick={handleGenerateCodiceFiscale}
                      >
                        Genera codice fiscale
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Indirizzo di residenza <span className="required">*</span></label>
                    <input
                      type="text"
                      name="indirizzo"
                      value={newEmployee.indirizzo}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Numero civico <span className="required">*</span></label>
                    <input
                      type="text"
                      name="numeroCivico"
                      value={newEmployee.numeroCivico}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Città di residenza <span className="required">*</span></label>
                    <input
                      type="text"
                      name="citta"
                      value={newEmployee.citta}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Provincia di residenza <span className="required">*</span></label>
                    <select
                      name="provincia"
                      value={newEmployee.provincia}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Scegli la provincia</option>
                      <option value="MI">Milano</option>
                      <option value="RM">Roma</option>
                      <option value="NA">Napoli</option>
                      <option value="TO">Torino</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>CAP di residenza <span className="required">*</span></label>
                    <input
                      type="text"
                      name="cap"
                      value={newEmployee.cap}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Cellulare</label>
                    <input
                      type="text"
                      name="cellulare"
                      value={newEmployee.cellulare}
                      onChange={handleInputChange}
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
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={newEmployee.email}
                      onChange={handleInputChange}
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
                      />
                      <span className="toggle-slider"></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="add-btn">Aggiungi</button>
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
              <button className="close-btn" onClick={() => setShowUploadModal(false)}>×</button>
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
                      required
                    />
                    <div className="file-name">
                      {selectedFile ? selectedFile.name : 'No file chosen'}
                    </div>
                  </div>
                </div>
                <div className="template-download">
                  <button type="button" className="download-template-btn">
                    <span className="icon">⬇️</span> Scarica file di esempio
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="upload-btn" disabled={!selectedFile}>
                  Carica
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