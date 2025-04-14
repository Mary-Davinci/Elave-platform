import api from './api';

interface Recipient {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Attachment {
  _id: string;
  filename: string;
  path: string;
  contentType: string;
  size: number;
}

export interface Message {
  _id: string;
  sender: Recipient;
  recipients: Recipient[];
  subject: string;
  body: string;
  attachments: Attachment[];
  read: boolean;
  status: 'inbox' | 'sent' | 'draft' | 'trash';
  createdAt: string;
  updatedAt: string;
}

export interface MessageStats {
  unread: number;
  inbox: number;
  sent: number;
  draft: number;
  trash: number;
}

// Get messages by status
export const getMessages = async (status: string = 'inbox'): Promise<Message[]> => {
  const response = await api.get(`/api/messages?status=${status}`);
  return response.data;
};

// Get a single message by ID
export const getMessageById = async (id: string): Promise<Message> => {
  const response = await api.get(`/api/messages/${id}`);
  return response.data;
};

// Send a new message
export const sendMessage = async (
  formData: FormData
): Promise<Message> => {
  const response = await api.post('/api/messages', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

// Save message as draft
export const saveDraft = async (
  formData: FormData,
  draftId?: string
): Promise<Message> => {
  const url = draftId 
    ? `/api/messages/drafts/${draftId}`
    : '/api/messages/drafts';
  
  const method = draftId ? 'put' : 'post';
  
  const response = await api({
    method,
    url,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return response.data;
};

// Move message to trash
export const moveToTrash = async (id: string): Promise<void> => {
  await api.put(`/api/messages/${id}/trash`);
};

// Delete message permanently
export const deleteMessage = async (id: string): Promise<void> => {
  await api.delete(`/api/messages/${id}`);
};

// Mark message as read/unread
export const markReadStatus = async (id: string, read: boolean): Promise<void> => {
  await api.put(`/api/messages/${id}/read`, { read });
};

// Search messages
export const searchMessages = async (
  query: string,
  status: string = 'all'
): Promise<Message[]> => {
  const response = await api.get(`/api/messages/search?query=${query}&status=${status}`);
  return response.data;
};

// Get message counts
export const getMessageStats = async (): Promise<MessageStats> => {
  const response = await api.get('/api/messages/stats');
  return response.data;
};

// Get download URL for attachment
export const getAttachmentUrl = (messageId: string, attachmentId: string): string => {
  return `${api.defaults.baseURL}/messages/${messageId}/attachments/${attachmentId}`;
};

// Search for recipients (users)
export const searchRecipients = async (query: string): Promise<Recipient[]> => {
  const response = await api.get(`/api/users/search?query=${query}`);
  return response.data;
};