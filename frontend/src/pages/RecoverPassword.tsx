import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Auth.css';

const RecoverPassword: React.FC = () => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Recupera Password</h2>
        <p style={{ marginBottom: 12 }}>
          La registrazione pubblica è disabilitata. Per il recupero credenziali contatta l&apos;amministratore.
        </p>
        <div className="auth-footer">
          Torna al <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default RecoverPassword;
