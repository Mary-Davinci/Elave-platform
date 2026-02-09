import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMessages, moveToTrash, markReadStatus, getMessageStats, Message, MessageStats } from '../services/messageService';
import '../styles/InArrivo.css';

const InArrivo: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageStats, setMessageStats] = useState<MessageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'trash'>('inbox');

  useEffect(() => {
    fetchMessages();
    fetchMessageStats();
  }, [activeTab]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const fetchedMessages = await getMessages(activeTab);
      setMessages(fetchedMessages);
      setError(null);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessageStats = async () => {
    try {
      const stats = await getMessageStats();
      setMessageStats(stats);
    } catch (err) {
      console.error('Error fetching message stats:', err);
    }
  };

  const handleReadMessage = async (message: Message) => {
    if (activeTab === 'inbox' && !message.read) {
      try {
        await markReadStatus(message._id, true);
        // Update message in state
        setMessages(messages.map(m => 
          m._id === message._id ? { ...m, read: true } : m
        ));
        // Update stats
        if (messageStats) {
          setMessageStats({
            ...messageStats,
            unread: messageStats.unread - 1
          });
        }
      } catch (err) {
        console.error('Error marking message as read:', err);
      }
    }
    
    // Navigate to message detail
    navigate(`/posta/messaggio/${message._id}`);
  };

  const handleMoveToTrash = async (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent message opening
    
    try {
      await moveToTrash(messageId);
      // Remove from current list
      setMessages(messages.filter(m => m._id !== messageId));
      // Update stats
      await fetchMessageStats();
    } catch (err) {
      console.error('Error moving message to trash:', err);
    }
  };

  const handleNewMessage = () => {
    navigate('/posta/nuovo');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    // If it's today, show only time
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString();
  };

  // Get display name for a user
  const getUserDisplayName = (user: any) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.email;
  };

  return (
    <div className="in-arrivo-container">
      <h1 className="page-title">
        {activeTab === 'inbox' ? 'Posta in arrivo' : 
         activeTab === 'sent' ? 'Posta inviata' : 
         'Cestino'}
      </h1>
      
      <div className="mail-content">
        <div className="mail-sidebar">
          <button className="new-message-button" onClick={handleNewMessage}>
            <i className="message-icon">✏️</i>
            <span>Nuovo messaggio</span>
          </button>
          
          <nav className="mail-navigation">
            <div 
              className={`nav-item ${activeTab === 'inbox' ? 'active' : ''}`}
              onClick={() => setActiveTab('inbox')}
            >
              <i className="nav-icon">📥</i>
              <span>In arrivo</span>
              {messageStats && messageStats.unread > 0 && (
                <span className="badge">{messageStats.unread}</span>
              )}
            </div>
            
            <div 
              className={`nav-item ${activeTab === 'sent' ? 'active' : ''}`}
              onClick={() => setActiveTab('sent')}
            >
              <i className="nav-icon">📤</i>
              <span>Inviata</span>
            </div>
            
            <div 
              className={`nav-item ${activeTab === 'trash' ? 'active' : ''}`}
              onClick={() => setActiveTab('trash')}
            >
              <i className="nav-icon">🗑️</i>
              <span>Cestino</span>
            </div>
          </nav>
        </div>
        
        <div className="mail-list-container">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Caricamento messaggi...</p>
            </div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : messages.length === 0 ? (
            <div className="no-messages">
              <div className="no-messages-box">Nessun elemento trovato</div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map(message => (
                <div 
                  key={message._id} 
                  className={`message-item ${!message.read ? 'unread' : ''}`}
                  onClick={() => handleReadMessage(message)}
                >
                  <div className="message-sender">
                    {activeTab === 'inbox' 
                      ? getUserDisplayName(message.sender)
                      : message.recipients.map(r => getUserDisplayName(r)).join(', ')}
                  </div>
                  <div className="message-subject">{message.subject}</div>
                  {message.attachments.length > 0 && (
                    <div className="attachment-indicator">📎</div>
                  )}
                  <div className="message-date">{formatDate(message.createdAt)}</div>
                  {activeTab !== 'trash' && (
                    <button 
                      className="trash-button"
                      onClick={(e) => handleMoveToTrash(message._id, e)}
                      title="Sposta nel cestino"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InArrivo;
