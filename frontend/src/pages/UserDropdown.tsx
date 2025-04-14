// src/components/UserDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserDropdownProps {
  className?: string;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ className }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user's display name
  const displayName = user?.username || user?.email?.split('@')[0] || 'User';
  // Get user's role for display
  const role = user?.role === 'admin' ? 'Amministratore' : 'Attuatore';

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle navigation
  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  return (
    <div className={`user-dropdown ${className || ''}`} ref={dropdownRef}>
      <button className="user-dropdown-toggle" onClick={toggleDropdown}>
        <span className="user-icon">👤</span>
        <div className="user-info">
          <div className="user-name">{displayName}</div>
          <div className="user-role">{role}</div>
        </div>
      </button>
      
      {isOpen && (
        <div className="dropdown-menu">
          <button className="dropdown-item" onClick={() => handleNavigation('/profile')}>
            <span className="dropdown-icon">👤</span>
            Profilo
          </button>
          
          <button className="dropdown-item" onClick={() => handleNavigation('/change-password')}>
            <span className="dropdown-icon">🔒</span>
            Cambio Password
          </button>
          
          <div className="dropdown-divider"></div>
          
          <button className="dropdown-item logout" onClick={handleLogout}>
            <span className="dropdown-icon">🚪</span>
            Esci
          </button>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;