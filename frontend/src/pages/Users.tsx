// src/pages/Users.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import '../styles/Users.css';

// User interface with new approval system
interface User {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  role: 'super_admin' | 'admin' | 'responsabile_territoriale' | 'sportello_lavoro' | 'segnalatori';
  profitSharePercentage?: number;
  isActive?: boolean;
  isApproved?: boolean;
  pendingApproval?: boolean;
  approvedBy?: {
    _id: string;
    username: string;
    email: string;
  };
  approvedAt?: string;
  managedBy?: {
    _id: string;
    username: string;
    email: string;
    role: string;
  };
  createdAt: string;
}

const Users: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'pending'>('list');
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  console.log("Current user:", user);
  console.log("User role:", user?.role);
  
  // New user form state with new role system
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    organization: '',
    role: 'segnalatori' as User['role'],
    profitSharePercentage: 20,
    password: '',
    confirmPassword: ''
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Role display mapping
  const roleDisplayNames = {
    'super_admin': 'Super Amministratore',
    'admin': 'Amministratore',
    'responsabile_territoriale': 'Responsabile Territoriale',
    'sportello_lavoro': 'Sportello Lavoro',
    'segnalatori': 'Segnalatori'
  };

  // Default profit sharing percentages
  const defaultProfitShares = {
    'super_admin': 0,
    'admin': 0,
    'responsabile_territoriale': 80,
    'sportello_lavoro': 40,
    'segnalatori': 20
  };

  // Role checking functions
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isResponsabileTerritoriale = user?.role === 'responsabile_territoriale' || isAdmin;

  useEffect(() => {
    // Set active tab based on URL path
    if (location.pathname.includes('/users/create')) {
      setActiveTab('create');
    } else if (location.pathname.includes('/users/pending')) {
      setActiveTab('pending');
    } else {
      setActiveTab('list');
      fetchUsers();
    }
  }, [location.pathname]);

  useEffect(() => {
    // Fetch pending users if admin
    if (isAdmin && activeTab === 'pending') {
      fetchPendingUsers();
    }
  }, [activeTab, isAdmin]);

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

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users/pending');
      setPendingUsers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      setError('Failed to load pending users. Please try again later.');
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'list' | 'create' | 'pending') => {
    setActiveTab(tab);
    if (tab === 'list') {
      navigate('/users');
      fetchUsers();
    } else if (tab === 'create') {
      navigate('/users/create');
    } else if (tab === 'pending') {
      navigate('/users/pending');
      fetchPendingUsers();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'role') {
      // Update profit share percentage when role changes
      const roleValue = value as User['role'];
      setNewUser(prev => ({
        ...prev,
        [name]: roleValue,
        profitSharePercentage: defaultProfitShares[roleValue]
      }));
    } else if (name === 'profitSharePercentage') {
      setNewUser(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setNewUser(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

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

    // Check if current user can create this role
    if (!canCreateRole(newUser.role)) {
      setFormError('You do not have permission to create users with this role');
      return;
    }

    try {
      setLoading(true);
      setFormError(null);
      const response = await api.post('/api/users', newUser);
      
      // Reset form
      setNewUser({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        organization: '',
        role: 'segnalatori',
        profitSharePercentage: 20,
        password: '',
        confirmPassword: ''
      });
      
      setLoading(false);
      
      // Show appropriate message based on approval status
      if (response.data.pendingApproval) {
        setFormError(null);
        alert('User created successfully and is pending admin approval');
      } else {
        alert('User created successfully');
      }
      
      // Navigate back to the list tab after successful creation
      handleTabChange('list');
    } catch (err: any) {
      console.error('Error creating user:', err);
      setFormError(err.response?.data?.error || 'Failed to create user');
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to approve this user?')) {
      try {
        await api.post(`/api/users/${userId}/approve`);
        // Refresh pending users list
        fetchPendingUsers();
        // Also refresh main users list
        fetchUsers();
        alert('User approved successfully');
      } catch (err) {
        console.error('Error approving user:', err);
        setError('Failed to approve user. Please try again later.');
      }
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to reject and delete this user? This action cannot be undone.')) {
      try {
        await api.post(`/api/users/${userId}/reject`);
        // Refresh pending users list
        fetchPendingUsers();
        alert('User rejected and deleted successfully');
      } catch (err) {
        console.error('Error rejecting user:', err);
        setError('Failed to reject user. Please try again later.');
      }
    }
  };

  const handleEditUser = (userId: string) => {
    navigate(`/users/edit/${userId}`);
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/api/users/${userId}`);
        fetchUsers(); // Refresh the list
      } catch (err) {
        console.error('Error deleting user:', err);
        setError('Failed to delete user. Please try again later.');
      }
    }
  };

  // UPDATED: Check if current user can create a specific role
  const canCreateRole = (targetRole: User['role']): boolean => {
    if (!user) return false;
    
    const roleHierarchy = {
      'segnalatori': 1,
      'sportello_lavoro': 2,
      'responsabile_territoriale': 3,
      'admin': 4,
      'super_admin': 5
    };
    
    const currentUserLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
    const targetRoleLevel = roleHierarchy[targetRole] || 0;
    
    // Users can only create roles BELOW their level (not equal to their level)
    const canCreate = currentUserLevel > targetRoleLevel;
    
    // SPECIAL RESTRICTION: responsabile_territoriale cannot create other responsabile_territoriale
    if (user.role === 'responsabile_territoriale' && targetRole === 'responsabile_territoriale') {
      return false;
    }
    
    return canCreate;
  };

  // UPDATED: Get available roles for current user
  const getAvailableRoles = (): User['role'][] => {
    if (!user) return [];
    
    const allRoles: User['role'][] = ['segnalatori', 'sportello_lavoro', 'responsabile_territoriale', 'admin', 'super_admin'];
    return allRoles.filter(role => canCreateRole(role));
  };

  // Filter users based on search term
  const filteredUsers = users.filter(userItem => 
    userItem.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    userItem.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (userItem.firstName && userItem.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (userItem.lastName && userItem.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filter pending users based on search term
  const filteredPendingUsers = pendingUsers.filter(userItem => 
    userItem.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    userItem.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (userItem.firstName && userItem.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (userItem.lastName && userItem.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Format user name for display
  const formatName = (userItem: User) => {
    if (userItem.firstName && userItem.lastName) {
      return `${userItem.firstName} ${userItem.lastName}`;
    } else {
      return userItem.username;
    }
  };

  return (
    <div className="users-container">
      <div className="page-header">
        <h1>Utenti</h1>
        <div className="role-info">
          <span className="current-role">Il tuo ruolo: {roleDisplayNames[user?.role as keyof typeof roleDisplayNames]}</span>
        </div>
      </div>

      <div className="tabs">
  <button 
    className={`tab ${activeTab === 'list' ? 'active' : ''}`}
    onClick={() => handleTabChange('list')}
  >
    <i className="icon">📋</i> Elenco
  </button>

  {isResponsabileTerritoriale && (
    <button 
      className={`tab ${activeTab === 'create' ? 'active' : ''}`}
      onClick={() => handleTabChange('create')}
    >
      <i className="icon">➕</i> Crea
    </button>
  )}

  {/**isAdmin && (
    <button 
      className={`tab tab--pending ${activeTab === 'pending' ? 'active' : ''}`}
      onClick={() => handleTabChange('pending')}
    >
      <i className="icon">⏳</i> In Attesa
      <span className="tab-badge">{pendingUsers.length}</span>
    </button>
  )**/}
</div>


      {activeTab === 'list' ? (
        <div className="users-list">
          <div className="filters">
            <div className="search">
              <input 
                type="text" 
                placeholder="Cerca utenti..." 
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
              />
            </div>
          </div>

          {loading ? (
            <div className="loading">Caricamento utenti...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <div className="table-scroll">
            <table className="users-table users-table--minimal users-table--compact">
              <thead>
                <tr>
                  <th>Ruolo</th>
                  <th>Organizzazione</th>
                  <th>Nominativo</th>
                  <th>Email</th>
                  <th>Profit Share %</th>
                  <th>Status</th>
                  <th>Approvazione</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(userItem => (
                    <tr key={userItem._id}>
                      <td>
                        <span className={`role-badge role-${userItem.role}`}>
                          {roleDisplayNames[userItem.role]}
                        </span>
                      </td>
                      <td>{userItem.organization || '-'}</td>
                      <td>{formatName(userItem)}</td>
                      <td>{userItem.email}</td>
                      <td>
                        {userItem.profitSharePercentage ? `${userItem.profitSharePercentage}%` : '-'}
                      </td>
                      <td>
                        <span className={`status ${userItem.isActive !== false ? 'active' : 'inactive'}`}>
                          {userItem.isActive !== false ? 'Attivo' : 'Inattivo'}
                        </span>
                      </td>
                      <td>
                        {userItem.isApproved ? (
                          <span className="approval-status approved">
                            ✅ Approvato
                            {userItem.approvedBy && (
                              <small className="approved-by">
                                da {userItem.approvedBy.username}
                              </small>
                            )}
                          </span>
                        ) : userItem.pendingApproval ? (
                          <span className="approval-status pending">⏳ In Attesa</span>
                        ) : (
                          <span className="approval-status auto">🔄 Auto</span>
                        )}
                      </td>
                      <td className="actions">
                        <button 
                          onClick={() => handleEditUser(userItem._id)}
                          className="edit-button"
                          title="Modifica"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(userItem._id)}
                          className="delete-button"
                          title="Elimina"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="no-results">
                      {searchTerm ? 'Nessun utente trovato' : 'Nessun utente disponibile'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}
        </div>
      ) : activeTab === 'pending' ? (
        <div className="pending-users-list">
          <div className="filters">
            <div className="search">
              <input 
                type="text" 
                placeholder="Cerca utenti in attesa..." 
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
              />
            </div>
          </div>

          {loading ? (
            <div className="loading">Caricamento utenti in attesa...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <div>
              <div className="pending-header">
                <h3>Utenti in Attesa di Approvazione ({filteredPendingUsers.length})</h3>
                <p>Questi utenti sono stati creati da Responsabili Territoriali e necessitano della tua approvazione.</p>
              </div>
              
              {filteredPendingUsers.length > 0 ? (
                <table className="users-table pending-table">
                  <thead>
                    <tr>
                      <th>Ruolo</th>
                      <th>Nominativo</th>
                      <th>Email</th>
                      <th>Organizzazione</th>
                      <th>Creato da</th>
                      <th>Data Creazione</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingUsers.map(userItem => (
                      <tr key={userItem._id}>
                        <td>
                          <span className={`role-badge role-${userItem.role}`}>
                            {roleDisplayNames[userItem.role]}
                          </span>
                        </td>
                        <td>{formatName(userItem)}</td>
                        <td>{userItem.email}</td>
                        <td>{userItem.organization || '-'}</td>
                        <td>
                          {userItem.managedBy ? (
                            <div>
                              <strong>{userItem.managedBy.username}</strong>
                              <br />
                              <small>{roleDisplayNames[userItem.managedBy.role as keyof typeof roleDisplayNames]}</small>
                            </div>
                          ) : '-'}
                        </td>
                        <td>{new Date(userItem.createdAt).toLocaleDateString('it-IT')}</td>
                        <td className="actions">
                          <button 
                            onClick={() => handleApproveUser(userItem._id)}
                            className="approve-button"
                            title="Approva"
                          >
                            ✅ Approva
                          </button>
                          <button 
                            onClick={() => handleRejectUser(userItem._id)}
                            className="reject-button"
                            title="Rifiuta"
                          >
                            ❌ Rifiuta
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-results">
                  {searchTerm ? 'Nessun utente in attesa trovato' : 'Nessun utente in attesa di approvazione'}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="create-user-form">
          <h2>Nuovo Utente</h2>
          {formError && <div className="form-error">{formError}</div>}
          
          {/* Role Restriction Notice */}
          {user?.role === 'responsabile_territoriale' && (
            <div className="role-restriction-notice">
              <h4>⚠️ Note sui Permessi:</h4>
              <ul>
                <li>• Non puoi creare altri Responsabili Territoriali</li>
                <li>• Gli utenti che crei necessiteranno dell'approvazione dell'amministratore</li>
                <li>• Puoi creare solo ruoli inferiori al tuo</li>
              </ul>
            </div>
          )}
          
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
                  {getAvailableRoles().map(role => (
                    <option key={role} value={role}>
                      {roleDisplayNames[role]}
                    </option>
                  ))}
                </select>
                <small className="help-text">
                  Puoi creare solo utenti con ruoli inferiori al tuo
                  {user?.role === 'responsabile_territoriale' && ' (escluso Responsabile Territoriale)'}
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="profitSharePercentage">Percentuale Profitto (%)</label>
                <input
                  type="number"
                  id="profitSharePercentage"
                  name="profitSharePercentage"
                  value={newUser.profitSharePercentage}
                  onChange={handleNewUserChange}
                  min="0"
                  max="100"
                />
                <small className="help-text">
                  Percentuale del versato totale assegnata a questo utente
                </small>
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