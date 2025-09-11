import React, { useState, useRef, useEffect } from 'react';
import '../styles/NewCompany.css';
import { AgenteFormData, FormTemplate } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';

const Agenti: React.FC = () => {
  const { user } = useAuth();

  const [formData, setFormData] = useState<AgenteFormData>({
    businessName: '',
    vatNumber: '',
    address: '',
    city: '',
    postalCode: '',
    province: '',
    agreedCommission: 0,
    email: '',
    pec: ''
  });

  const [signedContract, setSignedContract] = useState<File | null>(null);
  const [legalDoc, setLegalDoc] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Templates state
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [contractTemplate, setContractTemplate] = useState<File | null>(null);
  const [legalTemplate, setLegalTemplate] = useState<File | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [templateUploadMessage, setTemplateUploadMessage] = useState('');

  // Refs
  const signedContractRef = useRef<HTMLInputElement>(null);
  const legalDocRef = useRef<HTMLInputElement>(null);
  const contractTemplateRef = useRef<HTMLInputElement>(null);
  const legalTemplateRef = useRef<HTMLInputElement>(null);

  // Role checks actually used in the JSX
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Fetch form templates on mount
  useEffect(() => {
    const fetchFormTemplates = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const response = await fetch(`${apiBaseUrl}/api/form-templates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const templates = await response.json();
          setFormTemplates(templates);
        } else {
          console.error('Failed to fetch templates:', response.status);
        }
      } catch (error) {
        console.error('Error fetching form templates:', error);
      }
    };
    fetchFormTemplates();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'agreedCommission' ? parseFloat(value) || 0 : value
    }));
    if (errors.length) setErrors([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'contract' | 'doc') => {
    const file = e.target.files?.[0] || null;
    if (type === 'contract') setSignedContract(file);
    else setLegalDoc(file);
  };

  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'contract' | 'legal') => {
    const file = e.target.files?.[0] || null;
    if (type === 'contract') setContractTemplate(file);
    else setLegalTemplate(file);
  };

  const validateForm = (): string[] => {
    const validationErrors: string[] = [];
    if (!formData.businessName.trim()) validationErrors.push('Ragione Sociale is required');
    if (!formData.vatNumber.trim()) validationErrors.push('Partita IVA is required');
    if (!formData.address.trim()) validationErrors.push('Indirizzo is required');
    if (!formData.city.trim()) validationErrors.push('Città is required');
    if (!formData.postalCode.trim()) validationErrors.push('CAP is required');
    if (!formData.province.trim()) validationErrors.push('Provincia is required');
    if (!formData.agreedCommission || formData.agreedCommission <= 0) {
      validationErrors.push('Competenze concordate must be greater than 0');
    }
    return validationErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage('');

    const validationErrors = validateForm();
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const submitFormData = new FormData();
      Object.entries(formData).forEach(([k, v]) => submitFormData.append(k, v.toString()));
      if (signedContract) submitFormData.append('signedContractFile', signedContract);
      if (legalDoc) submitFormData.append('legalDocumentFile', legalDoc);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/agenti`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: submitFormData,
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Agente created successfully!');
        setFormData({
          businessName: '',
          vatNumber: '',
          address: '',
          city: '',
          postalCode: '',
          province: '',
          agreedCommission: 0,
          email: '',
          pec: ''
        });
        setSignedContract(null);
        setLegalDoc(null);
        if (signedContractRef.current) signedContractRef.current.value = '';
        if (legalDocRef.current) legalDocRef.current.value = '';
      } else {
        if (result?.errors && Array.isArray(result.errors)) setErrors(result.errors);
        else if (result?.error) setErrors([result.error]);
        else setErrors(['An unexpected error occurred']);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors(['Network error. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFile = (type: 'contract' | 'doc') => {
    if (type === 'contract') {
      setSignedContract(null);
      if (signedContractRef.current) signedContractRef.current.value = '';
    } else {
      setLegalDoc(null);
      if (legalDocRef.current) legalDocRef.current.value = '';
    }
  };

  const handleUploadTemplate = async (type: 'contract' | 'legal') => {
    const file = type === 'contract' ? contractTemplate : legalTemplate;
    if (!file) return;

    setIsUploadingTemplate(true);
    setTemplateUploadMessage('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('template', file);
      uploadFormData.append('type', type);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/form-templates`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadFormData,
      });

      if (response.ok) {
        await response.json(); // keep, but we don't need the value
        setTemplateUploadMessage(`${type === 'contract' ? 'Contract' : 'Legal'} template uploaded successfully!`);
        if (type === 'contract') {
          setContractTemplate(null);
          if (contractTemplateRef.current) contractTemplateRef.current.value = '';
        } else {
          setLegalTemplate(null);
          if (legalTemplateRef.current) legalTemplateRef.current.value = '';
        }

        // Refresh templates list
        const templatesResponse = await fetch(`${apiBaseUrl}/api/form-templates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (templatesResponse.ok) {
          const templates = await templatesResponse.json();
          setFormTemplates(templates);
        }
      } else {
        const result = await response.json();
        setTemplateUploadMessage(result?.error || 'Failed to upload template');
      }
    } catch (error) {
      console.error('Error uploading template:', error);
      setTemplateUploadMessage('Network error. Please try again.');
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  const handleDownloadTemplate = async (type: 'contract' | 'legal') => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/form-templates/download/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const template = getAvailableTemplate(type);
        const filename = template?.originalName || `${type}_template.pdf`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const result = await response.json();
        setErrors([result?.error || `Failed to download ${type} template`]);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      setErrors(['Network error. Please try again.']);
    }
  };

  const getAvailableTemplate = (type: 'contract' | 'legal') =>
    formTemplates.find(t => t.type === type);

  return (
    /* … JSX unchanged below this point (your original JSX) … */
    // keep all the render code you posted; only the top logic changed
    <div className="add-company-container">
      {/* … the rest of your JSX from the original file … */}
    </div>
  );
};

export default Agenti;
