import React, { useState, useEffect } from 'react';
import { useApiOperation } from '../../hooks/useApiOperation';
import { Card, Button } from '../../components/common';
import { toast } from 'react-hot-toast';
import styles from './AdminDashboardPage.module.css';

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const { execute: fetchDocuments } = useApiOperation('fetch documents');

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        const response = await fetchDocuments(() => fetch('/api/uploads/admin/documents'));
        if (response.success) {
          setDocuments(response.data);
        }
      } catch (error) {
        console.error('Error loading documents:', error);
        toast.error('Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [fetchDocuments]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  };

  const getDocumentTypeIcon = (type) => {
    switch (type) {
      case 'pdf': return 'fas fa-file-pdf';
      case 'image': return 'fas fa-file-image';
      case 'document': return 'fas fa-file-word';
      default: return 'fas fa-file';
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading documents...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Documents Management</h1>
        <p>Review and manage uploaded documents</p>
      </div>

      <div className={styles.summaryGrid}>
        <Card className={styles.summaryCard}>
          <div className={styles.summaryContent}>
            <div className={styles.summaryIcon}>
              <i className="fas fa-file-alt"></i>
            </div>
            <div className={styles.summaryInfo}>
              <h3>Total Documents</h3>
              <p>All uploaded documents</p>
              <small>{documents.length || 0} Documents</small>
            </div>
          </div>
        </Card>

        <Card className={styles.summaryCard}>
          <div className={styles.summaryContent}>
            <div className={styles.summaryIcon}>
              <i className="fas fa-clock"></i>
            </div>
            <div className={styles.summaryInfo}>
              <h3>Pending Review</h3>
              <p>Documents awaiting approval</p>
              <small>{documents.filter(d => d.status === 'pending').length || 0} Pending</small>
            </div>
          </div>
        </Card>

        <Card className={styles.summaryCard}>
          <div className={styles.summaryContent}>
            <div className={styles.summaryIcon}>
              <i className="fas fa-check"></i>
            </div>
            <div className={styles.summaryInfo}>
              <h3>Approved</h3>
              <p>Approved documents</p>
              <small>{documents.filter(d => d.status === 'approved').length || 0} Approved</small>
            </div>
          </div>
        </Card>

        <Card className={styles.summaryCard}>
          <div className={styles.summaryContent}>
            <div className={styles.summaryIcon}>
              <i className="fas fa-times"></i>
            </div>
            <div className={styles.summaryInfo}>
              <h3>Rejected</h3>
              <p>Rejected documents</p>
              <small>{documents.filter(d => d.status === 'rejected').length || 0} Rejected</small>
            </div>
          </div>
        </Card>
      </div>

      <Card className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Document Review</h2>
          <Button variant="link" onClick={() => window.location.href = '/admin/users'}>
            View All Users
          </Button>
        </div>
        <div className={styles.userList}>
          {documents.map((document) => (
            <div key={document.id} className={styles.userItem}>
              <div className={styles.userInfo}>
                <div className={styles.userAvatar}>
                  <i className={getDocumentTypeIcon(document.fileType)}></i>
                </div>
                <div className={styles.userDetails}>
                  <h4>{document.fileName}</h4>
                  <p>Uploaded by: {document.firstName} {document.lastName}</p>
                  <div className={styles.userBadges}>
                    <span className={`${styles.statusBadge} ${styles[getStatusColor(document.status)]}`}>
                      {document.status}
                    </span>
                    <span className={styles.typeBadge}>
                      {document.documentType}
                    </span>
                  </div>
                </div>
              </div>
              <div className={styles.userMeta}>
                <small>{formatDate(document.uploadedAt)}</small>
                <small>{formatFileSize(document.fileSize)}</small>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {documents.length === 0 && (
        <Card className={styles.emptyCard}>
          <div className={styles.emptyState}>
            <i className="fas fa-file-alt"></i>
            <h3>No documents found</h3>
            <p>No documents have been uploaded yet</p>
          </div>
        </Card>
      )}

      <div className={styles.quickActions}>
        <h2>Quick Actions</h2>
        <div className={styles.actionGrid}>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/admin/users'}
            className={styles.actionButton}
          >
            <i className="fas fa-users"></i>
            Manage Users
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/admin/loans'}
            className={styles.actionButton}
          >
            <i className="fas fa-hand-holding-usd"></i>
            Review Loans
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/admin/reports'}
            className={styles.actionButton}
          >
            <i className="fas fa-chart-bar"></i>
            View Reports
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/admin/security'}
            className={styles.actionButton}
          >
            <i className="fas fa-shield-alt"></i>
            Security Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;
