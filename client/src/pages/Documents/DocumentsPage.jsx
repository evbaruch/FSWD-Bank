import React, { useState, useEffect, useRef } from "react";
import {
  FolderOpen,
  Upload,
  Download,
  Trash2,
  FileText,
  Image,
  File,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Search,
} from "lucide-react";
import { Button, Input, Card } from "../../components/common";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/apiService";
import styles from "./DocumentsPage.module.css";
import { useForm } from "react-hook-form";

const DocumentsPage = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    search: "",
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    fetchDocuments();
  }, [filters]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.documents.getAll(filters);
      setDocuments(data.data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError("");

      const formData = new FormData();
      formData.append("document", data.file[0]);
      formData.append("documentType", data.documentType);

      const result = await apiService.documents.upload(formData);

      // Normalize backend response to match UI expectations
      const newDoc = {
        id: result.data.id,
        fileName: result.data.fileName,
        mimeType: result.data.mimeType,
        fileSize: result.data.fileSize,
        status: "pending",
        uploadedAt: new Date().toISOString(),
        documentType: data.documentType,
      };

      setDocuments((prev) => [newDoc, ...prev]);
      setShowUploadForm(false);
      reset();
      setUploadProgress(0);
    } catch (error) {
      console.error("Error uploading document:", error);
      setError(
        error.response?.data?.error ||
          error.message ||
          "Failed to upload document"
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteDocument = async (documentId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      await apiService.documents.delete(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (error) {
      console.error("Error deleting document:", error);
      setError(
        error.response?.data?.error ||
          error.message ||
          "Failed to delete document"
      );
    }
  };

  const downloadDocument = async (documentId) => {
    try {
      const blob = await apiService.documents.download(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        documents.find((doc) => doc.id === documentId)?.fileName || "document";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading document:", error);
      setError("Failed to download document");
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      type: "",
      status: "",
      search: "",
    });
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <File className={styles.fileIcon} />;
    if (mimeType.startsWith("image/")) {
      return <Image className={styles.fileIcon} />;
    } else if (mimeType === "application/pdf") {
      return <FileText className={styles.fileIcon} />;
    } else {
      return <File className={styles.fileIcon} />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return <CheckCircle className={styles.statusIcon} />;
      case "pending":
        return <Clock className={styles.statusIcon} />;
      case "rejected":
        return <AlertCircle className={styles.statusIcon} />;
      default:
        return <Clock className={styles.statusIcon} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return styles.statusApproved;
      case "pending":
        return styles.statusPending;
      case "rejected":
        return styles.statusRejected;
      default:
        return styles.statusPending;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading && documents.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Documents</h1>
          <p className={styles.subtitle}>Upload and manage your documents</p>
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={styles.filterButton}
          >
            <Filter className={styles.icon} />
            Filters
          </Button>

          <Button
            variant="primary"
            onClick={() => setShowUploadForm(true)}
            className={styles.uploadButton}
          >
            <Upload className={styles.icon} />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.errorContainer}>
          <AlertCircle className={styles.errorIcon} />
          <span className={styles.errorText}>{error}</span>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card className={styles.filtersCard}>
          <div className={styles.filtersHeader}>
            <h3>Filter Documents</h3>
            <Button variant="ghost" onClick={() => setShowFilters(false)}>
              ×
            </Button>
          </div>

          <div className={styles.filtersContent}>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label>Document Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                  className={styles.select}
                >
                  <option value="">All Types</option>
                  <option value="id_proof">ID Proof</option>
                  <option value="address_proof">Address Proof</option>
                  <option value="income_proof">Income Proof</option>
                  <option value="loan_document">Loan Document</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className={styles.select}
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Search</label>
                <div className={styles.searchContainer}>
                  <Search className={styles.searchIcon} />
                  <Input
                    type="text"
                    placeholder="Search documents..."
                    value={filters.search}
                    onChange={(e) =>
                      handleFilterChange("search", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className={styles.filterActions}>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
              <Button variant="primary" onClick={() => setShowFilters(false)}>
                Apply Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <Card className={styles.uploadForm}>
          <div className={styles.formHeader}>
            <h3>Upload Document</h3>
            <Button
              variant="ghost"
              onClick={() => {
                setShowUploadForm(false);
                reset();
              }}
            >
              ×
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Document Type</label>
              <select
                {...register("documentType", {
                  required: "Document type is required",
                })}
                className={styles.select}
              >
                <option value="id_proof">ID Proof</option>
                <option value="address_proof">Address Proof</option>
                <option value="income_proof">Income Proof</option>
                <option value="loan_document">Loan Document</option>
                <option value="other">Other</option>
              </select>
              {errors.documentType && (
                <span className={styles.error}>
                  {errors.documentType.message}
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>File</label>
              <Input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png,.gif"
                {...register("file", {
                  required: "File is required",
                  validate: {
                    fileSize: (files) => {
                      if (files[0] && files[0].size > 5 * 1024 * 1024) {
                        return "File size must be less than 5MB";
                      }
                      return true;
                    },
                    fileType: (files) => {
                      const allowedTypes = [
                        "application/pdf",
                        "image/jpeg",
                        "image/png",
                        "image/gif",
                      ];
                      if (files[0] && !allowedTypes.includes(files[0].type)) {
                        return "Only PDF and image files are allowed";
                      }
                      return true;
                    },
                  },
                })}
                error={errors.file?.message}
              />
            </div>

            {isUploading && (
              <div className={styles.uploadProgress}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <span className={styles.progressText}>{uploadProgress}%</span>
              </div>
            )}

            <div className={styles.formActions}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUploadForm(false);
                  reset();
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Documents List */}
      <div className={styles.documentsContainer}>
        {documents.length === 0 ? (
          <div className={styles.emptyState}>
            <FolderOpen className={styles.emptyIcon} />
            <h3>No documents found</h3>
            <p>Upload your first document to get started</p>
            <Button variant="primary" onClick={() => setShowUploadForm(true)}>
              <Upload className={styles.icon} />
              Upload Document
            </Button>
          </div>
        ) : (
          <div className={styles.documentsList}>
            {documents.map((document) => (
              <Card key={document.id} className={styles.documentCard}>
                <div className={styles.documentHeader}>
                  <div className={styles.documentInfo}>
                    {getFileIcon(document.mimeType)}
                    <div className={styles.documentDetails}>
                      <h4 className={styles.documentName}>
                        {document.fileName}
                      </h4>
                      <p className={styles.documentType}>
                        {document.documentType} •{" "}
                        {formatFileSize(document.fileSize)}
                      </p>
                    </div>
                  </div>

                  <div className={styles.documentStatus}>
                    <span
                      className={`${styles.status} ${getStatusColor(document.status)}`}
                    >
                      {getStatusIcon(document.status)}
                      {document.status}
                    </span>
                  </div>
                </div>

                <div className={styles.documentFooter}>
                  <div className={styles.documentDates}>
                    <span className={styles.uploadDate}>
                      Uploaded: {formatDate(document.uploadedAt)}
                    </span>
                    {document.reviewedAt && (
                      <span className={styles.reviewedDate}>
                        Reviewed: {formatDate(document.reviewedAt)}
                      </span>
                    )}
                  </div>

                  <div className={styles.documentActions}>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => downloadDocument(document.id)}
                    >
                      <Download className={styles.icon} />
                      Download
                    </Button>

                    {document.status === "pending" && (
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => deleteDocument(document.id)}
                      >
                        <Trash2 className={styles.icon} />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsPage;
