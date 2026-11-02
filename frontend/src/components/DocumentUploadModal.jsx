import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  FileCheck,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../api/client';

export default function DocumentUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Clean up blob URL on unmount or file change
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    const validExtensions = ['.pdf', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setErrorMsg('Please upload a valid PDF (.pdf) or Plain Text (.txt) file.');
      setSelectedFile(null);
      setPreviewBlobUrl(null);
      return;
    }

    setErrorMsg('');
    setSuccessData(null);
    setSelectedFile(file);

    // Create instant preview blob
    const url = URL.createObjectURL(file);
    setPreviewBlobUrl(url);
    setShowLivePreview(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMsg('');
    setSuccessData(null);

    try {
      const response = await api.uploadDocument(selectedFile);
      setSuccessData(response);
      
      // Pass file and previewUrl back to parent App state
      onUploadSuccess({
        ...response,
        file: selectedFile,
        previewUrl: previewBlobUrl
      });

      setTimeout(() => {
        handleClose();
      }, 1600);
    } catch (err) {
      console.error('Upload failed:', err);
      setErrorMsg(err.message || 'Failed to upload and process document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewBlobUrl(null);
    setShowLivePreview(false);
    setErrorMsg('');
    setSuccessData(null);
    setIsUploading(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div 
        className={`modal-content animate-fade-in ${showLivePreview ? 'modal-content-wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-text">
            <h2 className="modal-title">Upload & Ingest Study Material</h2>
            <p className="modal-subtitle">
              Preview documents instantly and compute 384-dim semantic embeddings for ChromaDB.
            </p>
          </div>
          <button className="modal-btn-close" onClick={handleClose} disabled={isUploading}>
            <X size={18} />
          </button>
        </div>

        <div className="upload-modal-layout">
          {/* Left Column: Dropzone and Controls */}
          <div className="upload-dropzone-col">
            <div
              className={`dropzone ${dragActive ? 'dropzone-active' : ''} ${selectedFile ? 'dropzone-has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isUploading && inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.txt"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={isUploading}
              />

              {selectedFile ? (
                <div className="dropzone-file-preview">
                  <div className="preview-icon-box">
                    <FileCheck size={28} className="text-crimson" />
                  </div>
                  <div className="preview-info">
                    <span className="preview-name">{selectedFile.name}</span>
                    <span className="preview-size">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type || 'text/plain'}
                    </span>
                  </div>
                  {!isUploading && !successData && (
                    <button
                      className="preview-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setPreviewBlobUrl(null);
                        setShowLivePreview(false);
                      }}
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="dropzone-empty">
                  <div className="dropzone-icon-circle">
                    <Upload size={28} className="dropzone-icon" />
                  </div>
                  <p className="dropzone-title">Click to browse or drop file here</p>
                  <p className="dropzone-hint">Supports PDF (.pdf) and Plain Text (.txt)</p>
                </div>
              )}
            </div>

            {/* Toggle live preview button if file selected */}
            {selectedFile && previewBlobUrl && (
              <div className="preview-toggle-row">
                <button
                  type="button"
                  className="btn-toggle-preview"
                  onClick={() => setShowLivePreview(!showLivePreview)}
                >
                  {showLivePreview ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showLivePreview ? 'Hide File Preview' : 'Show Live Preview'}</span>
                </button>
                <span className="preview-hint-tag">Ready for Ingestion</span>
              </div>
            )}

            {/* Feature Highlights */}
            <div className="upload-notice">
              <Info size={14} className="notice-icon" />
              <span>
                Pages are partitioned into 800-character chunks with 150-char overlap to preserve semantic context for Gemini.
              </span>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="upload-alert alert-error animate-fade-in">
                <AlertTriangle size={16} />
                <div className="alert-text">{errorMsg}</div>
              </div>
            )}

            {/* Success message */}
            {successData && (
              <div className="upload-alert alert-success animate-fade-in">
                <CheckCircle2 size={16} />
                <div className="alert-text">
                  Successfully indexed {successData.chunk_count} chunks across {successData.total_pages} page(s)!
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Document Preview Frame (if file selected) */}
          {showLivePreview && previewBlobUrl && (
            <div className="upload-live-preview-col animate-slide-right">
              <div className="live-preview-header">
                <div className="live-preview-title">
                  <Eye size={14} className="text-crimson" />
                  <span>Live Document Preview</span>
                </div>
                <span className="live-preview-badge">Instant Render</span>
              </div>
              <div className="live-preview-viewport">
                {selectedFile.name.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={`${previewBlobUrl}#toolbar=0&navpanes=0`}
                    title="Document Preview"
                    className="live-preview-iframe"
                  />
                ) : (
                  <div className="live-preview-text">
                    <p className="text-muted">Plain text document loaded. Click upload to index chunks.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          <button 
            className="btn-secondary" 
            onClick={handleClose} 
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || successData}
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Extracting & Indexing...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>Upload & Ingest to ChromaDB</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
