// src/pages/ProfilePage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/ProfilePage.css';

interface ProfileData {
  _id?: string;
  username?: string;
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        console.log('Fetching profile data...');
        
        // If you have an API endpoint, use it here instead
        // const response = await fetch('/api/dashboard/profile');
        // const data = await response.json();
        // if (data.success) {
        //   setProfile(data.data);
        // } else {
        //   throw new Error(data.message || 'Failed to fetch profile data');
        // }
        
        // For now, use the user data from auth context
        setProfile({
          _id: user?._id,
          username: user?.username || '',
          email: user?.email || '',
          role: user?.role || 'user',
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          organization: user?.organization || 'no company name'
        });
        
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading profile data:', err);
        setError(err.message || 'Failed to load profile data');
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  // Show loading spinner when data is being fetched
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading profile data...</p>
      </div>
    );
  }

  // Show error message if there was a problem
  if (error) {
    return (
      <div className="error-container">
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }


  // Format role for display
  const roleDisplay = user?.role === 'admin' ? 'Amministratore' : 'Attuatore';
    
  return (
    <div className="profile-page">
      <h1 className="page-title">Profilo</h1>
      
      <div className="profile-card">
        <div className="profile-info">
          <div className="company-info">
            <h2 className="company-name">{profile.username}</h2>
            <div className="user-role">{roleDisplay}</div>
          </div>
          
          <div className="contact-section">
            <h3 className="section-title">Contatti</h3>
            <div className="contact-info">
              <div className="email-contact">
                <span className="contact-icon">✉️</span>
                <span className="contact-text">{profile.email}</span>
              </div>
            </div>
          </div>
          
          {(profile.firstName || profile.lastName) && (
            <div className="personal-section">
              <h3 className="section-title">Informazioni Personali</h3>
              <div className="personal-info">
                {profile.firstName && (
                  <div className="info-row">
                    <span className="info-label">Nome:</span>
                    <span className="info-value">{profile.firstName}</span>
                  </div>
                )}
                {profile.lastName && (
                  <div className="info-row">
                    <span className="info-label">Cognome:</span>
                    <span className="info-value">{profile.lastName}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;