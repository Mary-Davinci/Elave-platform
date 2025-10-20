// src/pages/UserEdit.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Users.css';

type Role =
  | 'super_admin'
  | 'admin'
  | 'responsabile_territoriale'
  | 'sportello_lavoro'
  | 'segnalatori';

interface User {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  role: Role;
  profitSharePercentage?: number;
  isActive?: boolean;
  isApproved?: boolean;
  pendingApproval?: boolean;
  createdAt: string;
}

const roleDisplayNames: Record<Role, string> = {
  super_admin: 'Super Amministratore',
  admin: 'Amministratore',
  responsabile_territoriale: 'Responsabile Territoriale',
  sportello_lavoro: 'Sportello Lavoro',
  segnalatori: 'Segnalatori',
};

const roleLevel: Record<Role, number> = {
  segnalatori: 1,
  sportello_lavoro: 2,
  responsabile_territoriale: 3,
  admin: 4,
  super_admin: 5,
};

const defaultProfitShares: Record<Role, number> = {
  super_admin: 0,
  admin: 0,
  responsabile_territoriale: 80,
  sportello_lavoro: 40,
  segnalatori: 20,
};

const UserEdit: React.FC = () => {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<User>>({});
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);

  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin';
  const myLevel = roleLevel[(me?.role as Role) ?? 'segnalatori'];

  const canEditRole = (target: Role) => {
    if (!me) return false;
    const targetLevel = roleLevel[target];
    // you can only set roles strictly below your level
    if (myLevel <= targetLevel) return false;
    // responsabile_territoriale cannot create/edit to same level
    if (me.role === 'responsabile_territoriale' && target === 'responsabile_territoriale') return false;
    return true;
  };

  const availableRoles: Role[] = useMemo(() => {
    if (!me) return [];
    const all: Role[] = ['segnalatori', 'sportello_lavoro', 'responsabile_territoriale', 'admin', 'super_admin'];
    // filter by what the editor (me) is allowed to assign
    return all.filter(r => canEditRole(r));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role]);

  // Load user
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/api/users/${userId}`);
        if (!mounted) return;
        setForm(res.data as User);
      } catch (err: any) {
        console.error(err);
        setError(err?.response?.data?.error || 'Impossibile caricare utente');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setForm(prev => ({ ...prev, [name]: Number(value) }));
    } else if (name === 'role') {
      const role = value as Role;
      setForm(prev => ({
        ...prev,
        role,
        // if profitShare not set, set to sensible default
        profitSharePercentage:
          prev.profitSharePercentage ?? defaultProfitShares[role],
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const onToggleActive = () =>
    setForm(prev => ({ ...prev, isActive: prev.isActive === false ? true : !prev.isActive }));

  const validate = () => {
    if (!form) return 'Form non valido';
    if (!form.username) return 'Username richiesto';
    if (!form.email) return 'Email richiesta';
    if (!form.role) return 'Ruolo richiesto';
    if (typeof form.profitSharePercentage === 'number') {
      if (form.profitSharePercentage < 0 || form.profitSharePercentage > 100) {
        return 'Percentuale profitto deve essere tra 0 e 100';
      }
    }
    // role change permission check
    if (form.role && !canEditRole(form.role)) {
      return 'Non hai permessi per assegnare questo ruolo';
    }
    return null;
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const payload = {
        username: form.username,
        email: form.email,
        firstName: form.firstName ?? '',
        lastName: form.lastName ?? '',
        organization: form.organization ?? '',
        role: form.role,
        profitSharePercentage:
          typeof form.profitSharePercentage === 'number'
            ? form.profitSharePercentage
            : undefined,
        isActive: form.isActive !== false, // default true
      };
      await api.put(`/api/users/${form._id}`, payload);

      // optional password update
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setPwError('Le password non coincidono');
        } else if (newPassword.length < 6) {
          setPwError('La password deve avere almeno 6 caratteri');
        } else {
          setPwError(null);
          await api.post(`/api/users/${form._id}/reset-password`, {
            password: newPassword,
          });
        }
      }

      navigate('/users');
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || 'Salvataggio non riuscito');
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => navigate('/users');

  if (loading) {
    return (
      <div className="users-container">
        <div className="loading">Caricamento utente…</div>
      </div>
    );
  }

  if (!form?._id) {
    return (
      <div className="users-container">
        <div className="error">{error || 'Utente non trovato'}</div>
      </div>
    );
  }

  const roleEditable = availableRoles.length > 0; // only show role select if editor can set roles

  return (
    <div className="users-container">
      <div className="page-header">
        <h1>Modifica Utente</h1>
        <div className="role-info">
          <span className="current-role">
            ID: {form._id}
          </span>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="create-user-form">
        <form onSubmit={onSave}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="username">Username*</label>
              <input
                id="username"
                name="username"
                type="text"
                value={form.username || ''}
                onChange={onChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email*</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email || ''}
                onChange={onChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="firstName">Nome</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={form.firstName || ''}
                onChange={onChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Cognome</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={form.lastName || ''}
                onChange={onChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="organization">Organizzazione</label>
              <input
                id="organization"
                name="organization"
                type="text"
                value={form.organization || ''}
                onChange={onChange}
              />
            </div>

            {roleEditable ? (
              <div className="form-group">
                <label htmlFor="role">Ruolo*</label>
                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={onChange}
                  required
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {roleDisplayNames[r]}
                    </option>
                  ))}
                </select>
                <small className="help-text">
                  Puoi impostare solo ruoli inferiori al tuo
                </small>
              </div>
            ) : (
              <div className="form-group">
                <label>Ruolo</label>
                <input value={form.role ? roleDisplayNames[form.role] : ''} disabled />

                <small className="help-text">
                  Non hai i permessi per modificare il ruolo
                </small>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="profitSharePercentage">Percentuale Profitto (%)</label>
              <input
                id="profitSharePercentage"
                name="profitSharePercentage"
                type="number"
                min={0}
                max={100}
                value={
                  typeof form.profitSharePercentage === 'number'
                    ? form.profitSharePercentage
                    : ''
                }
                onChange={onChange}
              />
              <small className="help-text">
                Percentuale del versato totale assegnata a questo utente
              </small>
            </div>

            <div className="form-group">
              <label>Stato</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={onToggleActive}
                  className={`approve-button`}
                  style={{ padding: '8px 12px' }}
                >
                  {form.isActive !== false ? 'Attivo' : 'Inattivo'}
                </button>
                <small className="help-text">
                  Clicca per attivare/disattivare l’account
                </small>
              </div>
            </div>

            {/* Password reset (optional) */}
            <div className="form-group">
              <label htmlFor="newPassword">Nuova Password (opzionale)</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Lascia vuoto per non cambiare"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Conferma Nuova Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ripeti la nuova password"
              />
              {pwError && <small className="help-text" style={{ color: '#c81912' }}>{pwError}</small>}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onCancel}
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
    </div>
  );
};

export default UserEdit;
