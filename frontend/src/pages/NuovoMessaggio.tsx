import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sendMessage, getMessageById, saveDraft, searchRecipients } from '../services/messageService';
import '../styles/NuovoMessaggio.css';

interface Recipient {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

const NuovoMessaggio: React.FC = () => {
  const navigate = useNavigate();
  const { id: draftId } = useParams<{ id: string }>();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If draftId is provided, load draft
  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    }
  }, [draftId]);

  const loadDraft = async (id: string) => {
    try {
      setLoading(true);
      const draft = await getMessageById(id);
      
      if (draft.status !== 'draft') {
        throw new Error('Not a draft message');
      }
      
      setRecipients(draft.recipients);
      setSubject(draft.subject);
      setMessage(draft.body);
      setExistingAttachments(draft.attachments);
    } catch (err) {
      console.error('Error loading draft:', err);
      setError('Failed to load draft. It may have been deleted or moved.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (term.length > 1) {
      setIsSearching(true);
      try {
        const users = await searchRecipients(term);
        setSearchResults(users);
      } catch (err) {
        console.error('Error searching recipients:', err);
        setSearchResults([]);
      }
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const addRecipient = (recipient: Recipient) => {
    if (!recipients.some(r => r._id === recipient._id)) {
      setRecipients([...recipients, recipient]);
    }
    setSearchTerm('');
    setIsSearching(false);
    setSearchResults([]);
  };

  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter(r => r._id !== id));
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Check file size (limit to 10MB per file)
      const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
      
      if (invalidFiles.length > 0) {
        alert(`File troppo grande: ${invalidFiles.map(f => f.name).join(', ')}. Il limite è 10MB per file.`);
        return;
      }
      
      setAttachments([...attachments, ...files]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (id: string) => {
    setExistingAttachments(existingAttachments.filter(a => a._id !== id));
  };

  const handleSend = async () => {
    if (recipients.length === 0 || !subject || !message) {
      setError('Destinatari, oggetto e messaggio sono campi obbligatori.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create form data
      const formData = new FormData();
      
      // Add recipients
      recipients.forEach(recipient => {
        formData.append('recipients', recipient._id);
      });
      
      // Add subject and body
      formData.append('subject', subject);
      formData.append('body', message);
      
      // Add new attachments
      attachments.forEach(file => {
        formData.append('attachments', file);
      });
      
      // Add existing attachment IDs if updating a draft
      if (draftId && existingAttachments.length > 0) {
        existingAttachments.forEach(attachment => {
          formData.append('existingAttachments', attachment._id);
        });
      }
      
      // Send message
      await sendMessage(formData);
      
      // Success - navigate back to inbox
      navigate('/posta/in-arrivo');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      
      // Create form data
      const formData = new FormData();
      
      // Add recipients
      recipients.forEach(recipient => {
        formData.append('recipients', recipient._id);
      });
      
      // Add subject and body
      formData.append('subject', subject);
      formData.append('body', message);
      
      // Add new attachments
      attachments.forEach(file => {
        formData.append('attachments', file);
      });
      
      // Add existing attachment IDs if updating a draft
      if (draftId && existingAttachments.length > 0) {
        existingAttachments.forEach(attachment => {
          formData.append('existingAttachments', attachment._id);
        });
      }
      
      // Save draft
      await saveDraft(formData, draftId);
      
      // Show success message
      alert('Bozza salvata con successo!');
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/posta/in-arrivo');
  };

  // Get display name for a user
  const getUserDisplayName = (user: any) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.email;
  };

  if (loading && draftId) {
    return (
      <div className="nuovo-messaggio-container">
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Caricamento bozza...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nuovo-messaggio-container">
      <h1 className="page-title">Nuovo messaggio</h1>
      
      {error && <div className="error-alert">{error}</div>}
      
      <div className="message-form">
        <div className="form-group recipients-group">
          <label>Destinatari:</label>
          <div className="recipients-input-container">
            <div className="recipients-tags">
              {recipients.map(recipient => (
                <div key={recipient._id} className="recipient-tag">
                  <span className="recipient-name">{getUserDisplayName(recipient)}</span>
                  <button 
                    className="remove-recipient" 
                    onClick={() => removeRecipient(recipient._id)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
              <input 
                type="text" 
                className="recipient-search" 
                placeholder={recipients.length ? '' : 'Cerca destinatari...'}
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            
            {isSearching && (
              <div className="search-results">
                {searchResults.length === 0 ? (
                  <div className="no-results">Nessun risultato trovato</div>
                ) : (
                  searchResults.map(result => (
                    <div 
                      key={result._id} 
                      className="search-result-item"
                      onClick={() => addRecipient(result)}
                    >
                      <div className="result-name">{getUserDisplayName(result)}</div>
                      <div className="result-email">{result.email}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="subject">Oggetto:</label>
          <input 
            type="text" 
            id="subject"
            className="form-control"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Oggetto del messaggio"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="message">Messaggio:</label>
          <textarea 
            id="message"
            className="form-control message-body"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Scrivi il tuo messaggio qui..."
            rows={10}
          />
        </div>
        
        <div className="form-group">
          <label>Allegati:</label>
          <div className="attachments-container">
            {existingAttachments.map(attachment => (
              <div key={attachment._id} className="attachment-item">
                <span className="attachment-name">{attachment.filename}</span>
                <button 
                  className="remove-attachment" 
                  onClick={() => removeExistingAttachment(attachment._id)}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
            
            {attachments.map((file, index) => (
              <div key={index} className="attachment-item">
                <span className="attachment-name">{file.name}</span>
                <button 
                  className="remove-attachment" 
                  onClick={() => removeAttachment(index)}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
            
            <div className="attachment-upload">
              <label className="upload-button">
                <input 
                  type="file" 
                  multiple 
                  onChange={handleAttachmentChange} 
                  style={{ display: 'none' }}
                />
                <span>+ Aggiungi allegato</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            className="cancel-button" 
            onClick={handleCancel}
            type="button"
          >
            Annulla
          </button>
          
          <button 
            className="save-button" 
            onClick={handleSaveDraft}
            disabled={saving || loading}
            type="button"
          >
            {saving ? 'Salvando...' : 'Salva bozza'}
          </button>
          
          <button 
            className="send-button" 
            onClick={handleSend}
            disabled={loading || recipients.length === 0 || !subject || !message}
            type="button"
          >
            {loading ? 'Invio...' : 'Invia'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NuovoMessaggio;