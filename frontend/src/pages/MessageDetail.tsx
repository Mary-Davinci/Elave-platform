import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMessageById, moveToTrash, getAttachmentUrl, Message } from '../services/messageService';
import '../styles/MessageDetail.css';

const MessageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchMessage(id);
    }
  }, [id]);

  const fetchMessage = async (messageId: string) => {
    try {
      setLoading(true);
      const data = await getMessageById(messageId);
      setMessage(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching message:', err);
      setError('Failed to load message. It may have been deleted or moved.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  const handleReply = () => {
    if (!message) return;
    
    navigate('/posta/nuovo', {
      state: {
        replyTo: message,
        recipient: message.sender,
        subject: `Re: ${message.subject}`,
        body: `\n\n--------- Messaggio originale ---------\nDa: ${getUserDisplayName(message.sender)}\nData: ${formatDate(message.createdAt)}\nOggetto: ${message.subject}\n\n${message.body}`
      }
    });
  };

  const handleForward = () => {
    if (!message) return;
    
    navigate('/posta/nuovo', {
      state: {
        forward: message,
        subject: `Fwd: ${message.subject}`,
        body: `\n\n--------- Messaggio inoltrato ---------\nDa: ${getUserDisplayName(message.sender)}\nData: ${formatDate(message.createdAt)}\nOggetto: ${message.subject}\n\n${message.body}`
      }
    });
  };

  const handleDelete = async () => {
    if (!message || !id) return;
    
    try {
      await moveToTrash(id);
      navigate('/posta/in-arrivo');
    } catch (err) {
      console.error('Error moving message to trash:', err);
      setError('Failed to delete message. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserDisplayName = (user: any) => {
    if (!user) return '';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.email;
  };

  if (loading) {
    return (
      <div className="message-detail-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Caricamento messaggio...</p>
        </div>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="message-detail-container">
        <div className="error-container">
          <h2>Si è verificato un errore</h2>
          <p>{error || 'Messaggio non trovato'}</p>
          <button onClick={handleBack}>Torna indietro</button>
        </div>
      </div>
    );
  }

  return (
    <div className="message-detail-container">
      <div className="message-toolbar">
        <button className="toolbar-button" onClick={handleBack}>
          <i className="toolbar-icon">⬅️</i>
          <span>Indietro</span>
        </button>
        
        <div className="toolbar-actions">
          <button className="toolbar-button" onClick={handleReply}>
            <i className="toolbar-icon">↩️</i>
            <span>Rispondi</span>
          </button>
          
          <button className="toolbar-button" onClick={handleForward}>
            <i className="toolbar-icon">↪️</i>
            <span>Inoltra</span>
          </button>
          
          <button className="toolbar-button delete" onClick={handleDelete}>
            <i className="toolbar-icon">🗑️</i>
            <span>Elimina</span>
          </button>
        </div>
      </div>
      
      <div className="message-header">
        <h1 className="message-subject">{message.subject}</h1>
        
        <div className="message-meta">
          <div className="sender-info">
            <span className="meta-label">Da:</span>
            <span className="meta-value">{getUserDisplayName(message.sender)}</span>
            <span className="meta-email">&lt;{message.sender.email}&gt;</span>
          </div>
          
          <div className="recipients-info">
            <span className="meta-label">A:</span>
            <span className="meta-value">
              {message.recipients.map(recipient => getUserDisplayName(recipient)).join(', ')}
            </span>
          </div>
          
          <div className="date-info">
            <span className="meta-label">Data:</span>
            <span className="meta-value">{formatDate(message.createdAt)}</span>
          </div>
        </div>
      </div>
      
      {message.attachments.length > 0 && (
        <div className="message-attachments">
          <h3 className="attachments-title">Allegati ({message.attachments.length})</h3>
          <div className="attachments-list">
            {message.attachments.map(attachment => (
              <a 
                key={attachment._id}
                href={getAttachmentUrl(message._id, attachment._id)}
                download={attachment.filename}
                className="attachment-link"
              >
                <div className="attachment-item">
                  <i className="attachment-icon">📎</i>
                  <span className="attachment-name">{attachment.filename}</span>
                  <span className="attachment-size">
                    {Math.round(attachment.size / 1024)} KB
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      
      <div className="message-body">
        {message.body.split('\n').map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
    </div>
  );
};

export default MessageDetail;