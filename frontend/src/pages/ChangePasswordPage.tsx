// src/pages/ChangePasswordPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/ChangePasswordPage.css';
import { changePassword } from '../services/passwordService';


const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Check password strength
  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    
    // Character variety checks
    if (/[A-Z]/.test(password)) strength += 1; // Has uppercase
    if (/[a-z]/.test(password)) strength += 1; // Has lowercase
    if (/[0-9]/.test(password)) strength += 1; // Has number
    if (/[^A-Za-z0-9]/.test(password)) strength += 1; // Has special character
    
    setPasswordStrength(strength);
  };

  // Handle new password change
  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);
    checkPasswordStrength(value);
  };
// Handle form submit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Reset states
  setError(null);
  setSuccess(false);
  
  // Validate passwords
  if (!currentPassword || !newPassword || !confirmPassword) {
    setError('Tutti i campi sono obbligatori.');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    setError('Le nuove password non corrispondono.');
    return;
  }
  
  if (passwordStrength < 3) {
    setError('La nuova password non è abbastanza sicura. Deve contenere almeno 8 caratteri, lettere maiuscole, minuscole e numeri.');
    return;
  }
  
  // Submit form
  try {
    setLoading(true);
    
    // Call password change API
    if (!user?._id) {
      throw new Error('Utente non trovato. Riprova il login.');
    }

    await changePassword(user._id, currentPassword, newPassword);
    
    setSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordStrength(0);
    setLoading(false);
    
    // Navigate back to profile after successful password change (after 2 seconds)
    setTimeout(() => {
      navigate('/profile');
    }, 2000);
  } catch (err: any) {
    setLoading(false);
    setError(err.message || 'Si è verificato un errore durante il cambio della password. Riprova.');
  }
};

  return (
    <div className="change-password-page">
      <h1 className="page-title">Cambio Password</h1>
      
      <div className="password-card">
        <div className="user-info-section">
          <div className="user-avatar">👤</div>
          <div className="user-details">
            <h2 className="user-name">{user?.username || 'Utente'}</h2>
            <p className="user-email">{user?.email || ''}</p>
          </div>
        </div>
        
        {success && (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <p>Password cambiata con successo! Sarai reindirizzato al tuo profilo.</p>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="password-form">
          <div className="form-group">
            <label htmlFor="current-password">Password Attuale</label>
            <input
              type="password"
              id="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading || success}
              placeholder="Inserisci la password attuale"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="new-password">Nuova Password</label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={handleNewPasswordChange}
              disabled={loading || success}
              placeholder="Inserisci la nuova password"
            />
            
            <div className="password-strength">
              <div className="strength-label">Sicurezza:</div>
              <div className="strength-bars">
                <div className={`strength-bar ${passwordStrength >= 1 ? 'active' : ''} ${passwordStrength === 1 ? 'weak' : ''}`}></div>
                <div className={`strength-bar ${passwordStrength >= 2 ? 'active' : ''} ${passwordStrength === 2 ? 'medium' : ''}`}></div>
                <div className={`strength-bar ${passwordStrength >= 3 ? 'active' : ''} ${passwordStrength === 3 ? 'good' : ''}`}></div>
                <div className={`strength-bar ${passwordStrength >= 4 ? 'active' : ''} ${passwordStrength >= 4 ? 'strong' : ''}`}></div>
                <div className={`strength-bar ${passwordStrength >= 5 ? 'active' : ''} ${passwordStrength >= 5 ? 'very-strong' : ''}`}></div>
              </div>
              <div className="strength-text">
                {passwordStrength === 0 && 'Molto debole'}
                {passwordStrength === 1 && 'Debole'}
                {passwordStrength === 2 && 'Media'}
                {passwordStrength === 3 && 'Buona'}
                {passwordStrength === 4 && 'Forte'}
                {passwordStrength === 5 && 'Molto forte'}
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="confirm-password">Conferma Nuova Password</label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || success}
              placeholder="Conferma la nuova password"
            />
          </div>
          
          <div className="password-requirements">
            <h3>Requisiti Password:</h3>
            <ul>
              <li className={newPassword.length >= 8 ? 'requirement-met' : ''}>
                Almeno 8 caratteri
              </li>
              <li className={/[A-Z]/.test(newPassword) ? 'requirement-met' : ''}>
                Almeno una lettera maiuscola
              </li>
              <li className={/[a-z]/.test(newPassword) ? 'requirement-met' : ''}>
                Almeno una lettera minuscola
              </li>
              <li className={/[0-9]/.test(newPassword) ? 'requirement-met' : ''}>
                Almeno un numero
              </li>
              <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'requirement-met' : ''}>
                Almeno un carattere speciale (es. !@#$%)
              </li>
            </ul>
          </div>
          
          <div className="buttons-group">
            <button 
              type="button" 
              className="cancel-button"
              onClick={() => navigate('/profile')}
              disabled={loading}
            >
              Annulla
            </button>
            <button 
              type="submit" 
              className="submit-button"
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Elaborazione...
                </>
              ) : (
                'Cambia Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
