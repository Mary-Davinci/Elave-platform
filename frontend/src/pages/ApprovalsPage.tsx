import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock, Building2, Briefcase, Users, MessageSquare, AlertCircle, Search, Filter } from 'lucide-react';
import { approvalService } from '../services/api';

// Enhanced interfaces
interface AddressObject {
  street?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
}

interface PendingItem {
  _id: string;
  businessName?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  vatNumber?: string;
  role?: string;
  email?: string;
  address?: string | AddressObject;
  city?: string;
  province?: string;
  user?: {
    username: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
  createdAt: string;
  status?: string;
}

interface PendingItemsData {
  companies: PendingItem[];
  sportelloLavoro: PendingItem[];
  agenti: PendingItem[];
  segnalatori: PendingItem[];
  total: number;
}

const StyledApprovalsPage: React.FC = () => {
  const [pendingItems, setPendingItems] = useState<PendingItemsData>({
    companies: [],
    sportelloLavoro: [],
    agenti: [],
    segnalatori: [],
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('companies');
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch pending items from API
  const fetchPendingItems = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching pending items from API...');
      
      const data = await approvalService.getPendingItems();
      console.log('✅ Pending items fetched successfully:', data);
      
      setPendingItems(data);
    } catch (err: any) {
      console.error('❌ Error fetching pending items:', err);
      setError(err.message || 'Failed to fetch pending items');
      
      // Set empty data on error
      setPendingItems({
        companies: [],
        sportelloLavoro: [],
        agenti: [],
        segnalatori: [],
        total: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchPendingItems();
  }, []);

  const handleApprove = async (type: string, itemId: string, itemName: string) => {
    if (processingItems.has(itemId)) return;
    
    setProcessingItems(prev => new Set(prev).add(itemId));
    
    try {
      console.log(`✅ Approving ${type}:`, itemId);
      
      // Call appropriate approval API
      switch (type) {
        case 'company':
          await approvalService.approveCompany(itemId);
          break;
        case 'sportello':
          await approvalService.approveSportello(itemId);
          break;
        case 'agente':
          await approvalService.approveAgente(itemId);
          break;
        case 'user':
          await approvalService.approveUser(itemId);
          break;
        default:
          throw new Error('Invalid item type');
      }
      
      // Remove item from local state
      setPendingItems(prev => {
        const key = type === 'user' ? 'segnalatori' : 
                   type === 'sportello' ? 'sportelloLavoro' : 
                   type === 'company' ? 'companies' :
                   type === 'agente' ? 'agenti' : 'companies';
        
        const currentItems = prev[key as keyof PendingItemsData];
        
        if (Array.isArray(currentItems)) {
          return {
            ...prev,
            [key]: currentItems.filter((item: PendingItem) => item._id !== itemId),
            total: Math.max(0, prev.total - 1)
          };
        }
        return prev;
      });
      
      console.log(`✅ ${type} approved successfully:`, itemName);
      
    } catch (err: any) {
      console.error(`❌ Error approving ${type}:`, err);
      setError(err.message || `Failed to approve ${type}`);
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleReject = async (type: string, itemId: string, itemName: string, reason?: string) => {
    if (processingItems.has(itemId)) return;
    
    setProcessingItems(prev => new Set(prev).add(itemId));
    
    try {
      console.log(`❌ Rejecting ${type}:`, itemId);
      
      await approvalService.rejectItem(type, itemId, reason);
      
      // Remove item from local state
      setPendingItems(prev => {
        const key = type === 'user' ? 'segnalatori' : 
                   type === 'sportello' ? 'sportelloLavoro' : 
                   type === 'company' ? 'companies' :
                   type === 'agente' ? 'agenti' : 'companies';
        
        const currentItems = prev[key as keyof PendingItemsData];
        
        if (Array.isArray(currentItems)) {
          return {
            ...prev,
            [key]: currentItems.filter((item: PendingItem) => item._id !== itemId),
            total: Math.max(0, prev.total - 1)
          };
        }
        return prev;
      });
      
      console.log(`✅ ${type} rejected successfully:`, itemName);
      
    } catch (err: any) {
      console.error(`❌ Error rejecting ${type}:`, err);
      setError(err.message || `Failed to reject ${type}`);
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const renderAddress = (address: string | AddressObject | undefined): string => {
    if (!address) return 'Address not specified';
    
    if (typeof address === 'string') {
      return address;
    }
    
    if (typeof address === 'object' && address !== null) {
      const addressParts = [
        address.street,
        address.city,
        address.postalCode,
        address.province,
        address.country
      ].filter(Boolean);
      
      return addressParts.length > 0 ? addressParts.join(', ') : 'Address not specified';
    }
    
    return 'Address not specified';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'company': return <Building2 size={20} />;
      case 'sportello': return <Briefcase size={20} />;
      case 'agente': return <Users size={20} />;
      case 'user': return <MessageSquare size={20} />;
      default: return <Building2 size={20} />;
    }
  };

  const renderItemCard = (item: PendingItem, type: string) => {
    const itemName = item?.businessName || 
                    `${item?.firstName || ''} ${item?.lastName || ''}`.trim() || 
                    item?.username || 
                    'Unknown';
    
    const isProcessing = processingItems.has(item._id);
    
    return (
      <div key={item._id} className="approval-card">
        {/* Card Header */}
        <div className="card-header">
          <div className="card-title-section">
            <div className="icon-wrapper">
              {getTypeIcon(type)}
            </div>
            <div>
              <h3 className="item-title">{itemName}</h3>
              <div className="item-date">
                <Clock size={16} />
                <span>
                  {new Date(item.createdAt).toLocaleDateString('it-IT', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              onClick={() => handleApprove(type, item._id, itemName)}
              disabled={isProcessing}
              className={`btn-approve ${isProcessing ? 'btn-processing' : ''}`}
            >
              {isProcessing ? (
                <div className="spinner" />
              ) : (
                <CheckCircle size={16} />
              )}
              <span>Approva</span>
            </button>
            <button
              onClick={() => handleReject(type, item._id, itemName)}
              disabled={isProcessing}
              className={`btn-reject ${isProcessing ? 'btn-processing' : ''}`}
            >
              {isProcessing ? (
                <div className="spinner" />
              ) : (
                <XCircle size={16} />
              )}
              <span>Rifiuta</span>
            </button>
          </div>
        </div>

        {/* Card Content */}
        <div className="card-content">
          <div className="content-grid">
            <div className="content-column">
              {item?.vatNumber && (
                <div className="info-row">
                  <span className="info-label">VAT:</span>
                  <span className="info-value vat-number">{item.vatNumber}</span>
                </div>
              )}
              {item?.email && (
                <div className="info-row">
                  <span className="info-label">Email:</span>
                  <a href={`mailto:${item.email}`} className="info-link">
                    {item.email}
                  </a>
                </div>
              )}
              {item?.role && (
                <div className="info-row">
                  <span className="info-label">Role:</span>
                  <span className={`role-badge role-${item.role}`}>
                    {item.role.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            <div className="content-column">
              {item?.address && (
                <div className="info-row">
                  <span className="info-label">Address:</span>
                  <span className="info-value">
                    {renderAddress(item.address)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="card-footer">
          <div className="creator-info">
            <span className="creator-label">Created by:</span>
            <span className="creator-name">
              {item?.user?.firstName 
                ? `${item.user.firstName} ${item.user.lastName}` 
                : item?.user?.username || 'Unknown'
              }
            </span>
            <span className={`role-badge role-${item?.user?.role || 'unknown'}`}>
              {item?.user?.role?.replace('_', ' ').toUpperCase() || 'Unknown'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = (items: PendingItem[], type: string, emptyMessage: string) => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Caricamento elementi in attesa...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-container">
          <AlertCircle size={64} className="error-icon" />
          <p className="error-title">Errore nel caricamento dei dati</p>
          <p className="error-message">{error}</p>
          <button onClick={fetchPendingItems} className="btn-retry">
            Try Again
          </button>
        </div>
      );
    }

    if (!Array.isArray(items)) {
      return (
        <div className="error-container">
          <AlertCircle size={64} className="error-icon" />
          <p className="error-title">Error: Invalid data format</p>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="empty-container">
          <CheckCircle size={64} className="success-icon" />
          <h3 className="empty-title">Tutto fatto!</h3>
          <p className="empty-message">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="items-grid">
        {items.map(item => renderItemCard(item, type))}
      </div>
    );
  };

  const tabsConfig = [
    { key: 'companies', label: 'Aziende', count: pendingItems.companies?.length || 0, icon: Building2 },
    { key: 'sportelloLavoro', label: 'sportello Lavoro', count: pendingItems.sportelloLavoro?.length || 0, icon: Briefcase },
    { key: 'agenti', label: 'Responsabile Territoriale', count: pendingItems.agenti?.length || 0, icon: Users },
    { key: 'segnalatori', label: 'Segnalatori', count: pendingItems.segnalatori?.length || 0, icon: MessageSquare }
  ];

  return (
    <>
      <style>{`
        .approvals-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%, #e8eaf6 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .header-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        @media (min-width: 1024px) {
          .header-content {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .title-section h1 {
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #1f2937 0%, #1e40af 50%, #3730a3 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 0.5rem 0;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .status-loading { color: #1d4ed8; }
        .status-error { color: #dc2626; }
        .status-success { color: #059669; }
        .status-pending { color: #d97706; width: fit-content; }

        .controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .search-wrapper {
          position: relative;
        }

        .search-input {
          padding: 0.5rem 0.75rem 0.5rem 2.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          width: 16rem;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          ring: 2px solid #3b82f6;
          border-color: transparent;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }

        .control-btn {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .control-btn:hover {
          background: #f9fafb;
        }

        .refresh-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        .refresh-btn:hover {
          background: #f9fafb;
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .tabs-container {
          margin-bottom: 2rem;
        }

        .tabs-wrapper {
          background: white;
          border-radius: 0.75rem 0.75rem 0 0;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          border-bottom: 1px solid #e5e7eb;
        }

        .tabs-nav {
          display: flex;
        }

        .tab-button {
          position: relative;
          padding: 1rem 1.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          border: none;
          background: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
        }

        .tab-button:first-child {
          border-radius: 0.75rem 0 0 0;
        }

        .tab-button:last-child {
          border-radius: 0 0.75rem 0 0;
        }

        .tab-button.active {
          color: #1d4ed8;
          background: #dbeafe;
          border-bottom-color: #3b82f6;
        }

        .tab-button:not(.active) {
          color: #6b7280;
        }

        .tab-button:not(.active):hover {
          color: #111827;
          background: #f9fafb;
        }

        .tab-count {
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .tab-count.has-items.active {
          background: #dbeafe;
          color: #1e40af;
        }

        .tab-count.has-items:not(.active) {
          background: #fee2e2;
          color: #dc2626;
        }

        .tab-count:not(.has-items) {
          background: #f3f4f6;
          color: #6b7280;
        }

        .content-area {
          background: white;
          border-radius: 0 0 0.75rem 0.75rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          border-top: none;
          min-height: 24rem;
        }

        .content-padding {
          padding: 2rem;
        }

        .loading-container, .error-container, .empty-container {
          text-align: center;
          padding: 4rem 0;
        }

        .loading-spinner, .spinner {
          width: 4rem;
          height: 4rem;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        .spinner {
          width: 1rem;
          height: 1rem;
        }

        .loading-text, .error-message, .empty-message {
          color: #6b7280;
          font-size: 1.125rem;
        }

        .error-icon {
          color: #ef4444;
          margin: 0 auto 1rem;
        }

        .error-title, .empty-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 0.5rem 0;
        }

        .success-icon {
          color: #10b981;
          margin: 0 auto 1rem;
        }

        .btn-retry {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .btn-retry:hover {
          background: #2563eb;
        }

        .items-grid {
          display: grid;
          gap: 1.5rem;
        }

        .approval-card {
          background: white;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: all 0.3s;
        }

        .approval-card:hover {
          box-shadow: 0 10px 25px 0 rgba(0, 0, 0, 0.1);
          border-color: #93c5fd;
        }

        .card-header {
          background: linear-gradient(135deg, #f9fafb 0%, #dbeafe 100%);
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .card-title-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .icon-wrapper {
          padding: 0.5rem;
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          color: #3b82f6;
        }

        .item-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 0.25rem 0;
          transition: color 0.3s;
        }

        .approval-card:hover .item-title {
          color: #3b82f6;
        }

        .item-date {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn-approve, .btn-reject {
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          border: 1px solid;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .btn-approve {
          background: #f0fdf4;
          color: #15803d;
          border-color: #bbf7d0;
        }

        .btn-approve:hover:not(.btn-processing) {
          background: #dcfce7;
          color: #166534;
          border-color: #86efac;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .btn-reject {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }

        .btn-reject:hover:not(.btn-processing) {
          background: #fee2e2;
          color: #b91c1c;
          border-color: #fca5a5;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .btn-processing {
          background: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
          border-color: #d1d5db;
        }

        .card-content {
          padding: 1.5rem;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .content-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .content-column {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .info-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          min-width: 5rem;
        }

        .info-value {
          font-size: 0.875rem;
          color: #111827;
          line-height: 1.5;
        }

        .vat-number {
          font-family: 'Monaco', 'Menlo', monospace;
          background: #f9fafb;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
        }

        .info-link {
          font-size: 0.875rem;
          color: #3b82f6;
          text-decoration: none;
        }

        .info-link:hover {
          color: #1e40af;
          text-decoration: underline;
        }

        .role-badge {
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          border: 1px solid;
        }

        .role-admin { background: #f3e8ff; color: #7c3aed; border-color: #d8b4fe; }
        .role-manager { background: #dbeafe; color: #1e40af; border-color: #93c5fd; }
        .role-supervisor { background: #d1fae5; color: #065f46; border-color: #86efac; }
        .role-coordinator { background: #fed7aa; color: #ea580c; border-color: #fdba74; }
        .role-agente { background: #cffafe; color: #0e7490; border-color: #67e8f9; }
        .role-segnalatore { background: #fce7f3; color: #be185d; border-color: #f9a8d4; }
        .role-sportello_lavoro { background: #e0e7ff; color: #3730a3; border-color: #a5b4fc; }
        .role-unknown { background: #f3f4f6; color: #6b7280; border-color: #d1d5db; }

        .card-footer {
          background: #f9fafb;
          padding: 0.75rem 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .creator-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .creator-label {
          font-weight: 500;
        }

        .creator-name {
          color: #111827;
        }
      `}</style>
      
      <div className="approvals-page">
        <div className="container">
          {/* Enhanced Header */}
          <div className="page-header">
            <div className="header-content">
              <div className="title-section">
                <h1>Approvazioni in Attesa</h1>
                <div className={`status-indicator ${
                  loading ? 'status-loading' : 
                  error ? 'status-error' : 
                  pendingItems.total === 0 ? 'status-success' : 'status-pending'
                }`}>
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      <span>Caricamento elementi in attesa...</span>
                    </>
                  ) : error ? (
                    <>
                      <AlertCircle size={20} />
                      <span>Errore nel caricamento dei dati</span>
                    </>
                  ) : pendingItems.total === 0 ? (
                    <>
                      <CheckCircle size={20} />
                      <span>Tutto fatto!</span>
                    </>
                  ) : (
                    <>
                      <Clock size={20} />
                      <span>
                        <strong>{pendingItems.total}</strong> item{pendingItems.total !== 1 ? 's' : ''} awaiting your review
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="controls">
                {/* Search Bar */}
                <div className="search-wrapper">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Cerca approvazioni.."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                
                {/* Filter Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="control-btn"
                >
                  <Filter size={16} />
                </button>
                
                {/* Refresh Button */}
                <button
                  onClick={fetchPendingItems}
                  disabled={loading}
                  className="refresh-btn"
                >
                  <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                  <span>Aggiorna</span>
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Tabs */}
          <div className="tabs-container">
            <div className="tabs-wrapper">
              <nav className="tabs-nav">
                {tabsConfig.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
                    >
                      <Icon size={16} />
                      <span>{tab.label}</span>
                      <span className={`tab-count ${tab.count > 0 ? 'has-items' : ''} ${activeTab === tab.key ? 'active' : ''}`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="content-area">
            <div className="content-padding">
              {activeTab === 'companies' && renderTabContent(
                pendingItems.companies, 
                'company', 
                'No companies pending approval'
              )}

              {activeTab === 'sportelloLavoro' && renderTabContent(
                pendingItems.sportelloLavoro, 
                'sportello', 
                'No job centers pending approval'
              )}

              {activeTab === 'agenti' && renderTabContent(
                pendingItems.agenti, 
                'agente', 
                'No agents pending approval'
              )}

              {activeTab === 'segnalatori' && renderTabContent(
                pendingItems.segnalatori, 
                'user', 
                'No reporters pending approval'
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StyledApprovalsPage;
