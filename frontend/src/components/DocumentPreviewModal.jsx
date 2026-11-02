import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Layers, 
  Search, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Upload, 
  Copy, 
  Check, 
  Eye, 
  Info,
  BookOpen,
  Sparkles
} from 'lucide-react';

export default function DocumentPreviewModal({ 
  isOpen, 
  onClose, 
  document: doc, 
  previewUrl, 
  onAttachFile,
  onLaunchStudy 
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState(previewUrl ? 'reader' : 'info');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedDocId, setCopiedDocId] = useState(false);

  if (!isOpen || !doc) return null;

  const handleCopyDocId = () => {
    navigator.clipboard.writeText(doc.doc_id);
    setCopiedDocId(true);
    setTimeout(() => setCopiedDocId(false), 2000);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onAttachFile(doc.doc_id, e.dataTransfer.files[0]);
      setActiveViewTab('reader');
    }
  };

  return (
    <div className="modal-backdrop preview-backdrop animate-fade-in" onClick={onClose}>
      <div 
        className={`preview-modal-container ${isFullscreen ? 'preview-fullscreen' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="preview-modal-header">
          <div className="preview-header-left">
            <div className="preview-icon-badge">
              <BookOpen size={20} className="text-crimson" />
            </div>
            <div className="preview-title-col">
              <div className="preview-title-row">
                <h2 className="preview-doc-title" title={doc.filename}>
                  {doc.filename}
                </h2>
                <span className="preview-badge-status">Indexed & Grounded</span>
              </div>
              <div className="preview-meta-row">
                <span>{doc.total_pages} {doc.total_pages === 1 ? 'Page' : 'Pages'}</span>
                <span className="meta-dot">•</span>
                <span>{doc.chunk_count} Semantic Chunks</span>
                <span className="meta-dot">•</span>
                <span className="preview-id-pill" onClick={handleCopyDocId} title="Click to copy ID">
                  ID: {doc.doc_id} {copiedDocId ? <Check size={11} className="text-emerald" /> : <Copy size={11} />}
                </span>
              </div>
            </div>
          </div>

          <div className="preview-header-actions">
            {/* View Mode Switcher */}
            <div className="preview-view-tabs">
              <button
                className={`preview-tab-btn ${activeViewTab === 'reader' ? 'tab-btn-active' : ''}`}
                onClick={() => setActiveViewTab('reader')}
              >
                <Eye size={14} />
                <span>Document View</span>
              </button>
              <button
                className={`preview-tab-btn ${activeViewTab === 'info' ? 'tab-btn-active' : ''}`}
                onClick={() => setActiveViewTab('info')}
              >
                <Info size={14} />
                <span>RAG Architecture</span>
              </button>
            </div>

            <button
              className="preview-btn-icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button className="preview-btn-icon btn-close" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="preview-modal-body">
          {activeViewTab === 'reader' ? (
            previewUrl ? (
              <div className="preview-embed-wrapper">
                <iframe
                  src={`${previewUrl}#toolbar=1&navpanes=0`}
                  title={doc.filename}
                  className="preview-iframe"
                />
              </div>
            ) : (
              <div 
                className="preview-no-file-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
              >
                <div className="no-file-icon-box">
                  <FileText size={40} className="text-crimson" />
                </div>
                <h3 className="no-file-title">Interactive Document Viewer</h3>
                <p className="no-file-desc">
                  This document was indexed into ChromaDB. To view the visual rendered PDF side-by-side, drop the original file <strong>"{doc.filename}"</strong> here or browse.
                </p>
                <label className="btn-primary btn-attach-local">
                  <Upload size={16} />
                  <span>Select File to Preview</span>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        onAttachFile(doc.doc_id, e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            )
          ) : (
            /* Information / RAG Architecture Tab */
            <div className="preview-info-tab">
              <div className="info-cards-grid">
                <div className="preview-stat-card">
                  <div className="stat-card-label">SEMANTIC CHUNKS</div>
                  <div className="stat-card-value text-crimson">{doc.chunk_count}</div>
                  <div className="stat-card-desc">800 characters per chunk with 150-char boundary overlap</div>
                </div>

                <div className="preview-stat-card">
                  <div className="stat-card-label">DOCUMENT PAGES</div>
                  <div className="stat-card-value">{doc.total_pages}</div>
                  <div className="stat-card-desc">Page-level citation metadata preserved for all responses</div>
                </div>

                <div className="preview-stat-card">
                  <div className="stat-card-label">VECTOR EMBEDDINGS</div>
                  <div className="stat-card-value">all-MiniLM-L6-v2</div>
                  <div className="stat-card-desc">384-dimensional dense semantic vectors persisted in ChromaDB</div>
                </div>
              </div>

              <div className="preview-grounding-explainer">
                <div className="explainer-header">
                  <Sparkles size={16} className="text-crimson" />
                  <h4>Strict Grounding Protocol</h4>
                </div>
                <p>
                  When you ask questions about <strong>"{doc.filename}"</strong>, AURA computes similarity cosine distance between your prompt and the {doc.chunk_count} indexed chunks. Only the highest-ranking passages are retrieved and injected into the Gemini context window. If the exact answer does not exist in these passages, the copilot explicitly declines to answer to guarantee zero hallucination.
                </p>
              </div>

              <div className="preview-actions-bar">
                <button 
                  className="btn-primary"
                  onClick={() => {
                    onClose();
                    onLaunchStudy(doc.doc_id, 'chat');
                  }}
                >
                  <span>Open Q&A Chat on this Document</span>
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    onClose();
                    onLaunchStudy(doc.doc_id, 'quiz');
                  }}
                >
                  <span>Generate Quiz Arena</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
