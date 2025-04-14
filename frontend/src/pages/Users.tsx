// src/pages/Users.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import '../styles/Users.css';

// User interface
interface User {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  role: string;
  createdAt: string;
}

const Users: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');


  console.log("Current user:", user);
  console.log("Is user admin?", user?.role === 'admin');
  
  // New user form state
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    organization: '',
    role: 'user',
    password: '',
    confirmPassword: ''
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    // Set active tab based on URL path
    if (location.pathname.includes('/users/create')) {
      setActiveTab('create');
    } else {
      setActiveTab('list');
      fetchUsers();
    }
  }, [location.pathname]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users');
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again later.');
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'list' | 'create') => {
    setActiveTab(tab);
    if (tab === 'list') {
      navigate('/users');
      fetchUsers();
    } else {
      navigate('/users/create');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // src/pages/Users.tsx - update the handleCreateUser function
const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!newUser.username || !newUser.email || !newUser.password) {
      setFormError('Username, email and password are required');
      return;
    }
  
    if (newUser.password !== newUser.confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
  
    try {
      setLoading(true);
      setFormError(null);
      await api.post('/api/utilities', newUser); // Changed from '/api/admin/users'
      setNewUser({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        organization: '',
        role: 'user',
        password: '',
        confirmPassword: ''
      });
      setLoading(false);
      // Navigate back to the list tab after successful creation
      handleTabChange('list');
    } catch (err: any) {
      console.error('Error creating user:', err);
      setFormError(err.response?.data?.error || 'Failed to create user');
      setLoading(false);
    }
  };
  const handleEditUser = (userId: string) => {
    navigate(`/users/edit/${userId}`);
  };

  // src/pages/Users.tsx - update the handleDeleteUser function
const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/api/utilities/${userId}`); // Changed from '/api/admin/users/${userId}'
        fetchUsers(); // Refresh the list
      } catch (err) {
        console.error('Error deleting user:', err);
        setError('Failed to delete user. Please try again later.');
      }
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Format user name for display
  const formatName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else {
      return user.username;
    }
  };

  return (
    <div className="users-container">
      <div className="page-header">
        <h1>Utenti</h1>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => handleTabChange('list')}
        >
          <i className="icon">📋</i> Elenco
        </button>
        <button 
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => handleTabChange('create')}
        >
          <i className="icon">➕</i> Crea
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="users-list">
          <div className="filters">
            <div className="search">
              <input 
                type="text" 
                placeholder="Cerca..." 
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
              />
            </div>
          </div>

          {loading ? (
            <div className="loading">Caricamento...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Livello</th>
                  <th>Riferimento</th>
                  <th>Nominativo</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <tr key={user._id}>
                      <td>{user.role === 'admin' ? 'Amministratore' : 'Attuatore'}</td>
                      <td>{user.organization || user.username}</td>
                      <td>{formatName(user)}</td>
                      <td className="actions">
                        <button 
                          onClick={() => handleEditUser(user._id)}
                          className="edit-button"
                          title="Modifica"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user._id)}
                          className="delete-button"
                          title="Elimina"
                        >
                          🗑️
                        </button>
                        <button className="more-button" title="Altro">⋮</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="no-results">
                      {searchTerm ? 'Nessun utente trovato' : 'Nessun utente disponibile'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="create-user-form">
          <h2>Nuovo Utente</h2>
          {formError && <div className="form-error">{formError}</div>}
          
          <form onSubmit={handleCreateUser}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="username">Username*</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={newUser.username}
                  onChange={handleNewUserChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email*</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleNewUserChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="firstName">Nome</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={newUser.firstName}
                  onChange={handleNewUserChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Cognome</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={newUser.lastName}
                  onChange={handleNewUserChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="organization">Organizzazione</label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  value={newUser.organization}
                  onChange={handleNewUserChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Ruolo*</label>
                <select
                  id="role"
                  name="role"
                  value={newUser.role}
                  onChange={handleNewUserChange}
                  required
                >
                  <option value="user">Utente</option>
                  <option value="attuatore">Attuatore</option>
                  <option value="admin">Amministratore</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password*</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={newUser.password}
                  onChange={handleNewUserChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Conferma Password*</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={newUser.confirmPassword}
                  onChange={handleNewUserChange}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-button"
                onClick={() => handleTabChange('list')}
              >
                Annulla
              </button>
              <button 
                type="submit" 
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Creazione in corso...' : 'Crea Utente'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Users;