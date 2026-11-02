import React from 'react';
import { 
  Sparkles, 
  Upload, 
  FileText, 
  Layers, 
  Eye, 
  LayoutDashboard,
  ShieldCheck,
  Flame,
  FileCheck2
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab,
  selectedDoc, 
  documents, 
  onOpenUpload, 
  onOpenPreview,
  backendStatus 
}) {
  const getTabDetails = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Study Intelligence Hub',
          subtitle: 'Interactive modules, document repository, and vector store vitals',
        };
      case 'chat':
        return {
          title: 'Document Q&A Chat',
          subtitle: 'Strictly grounded answers with page-level citations',
        };
      case 'summary':
        return {
          title: 'Map-Reduce Executive Summary',
          subtitle: 'Multi-stage hierarchical distillation of long documents',
        };
      case 'keypoints':
        return {
          title: 'Key Takeaways & Concepts',
          subtitle: 'High-value bullet points and critical takeaways',
        };
      case 'quiz':
        return {
          title: 'Interactive Quiz Arena',
          subtitle: 'Auto-generated multiple choice questions with grounded rationale',
        };
      case 'tutor':
        return {
          title: 'AI Concept Tutor',
          subtitle: 'Intuitive analogies and simplified concept breakdowns',
        };
      default:
        return { title: 'Study Copilot', subtitle: 'Grounded document intelligence' };
    }
  };

  const currentDocObj = documents.find((d) => d.doc_id === selectedDoc);
  const { title, subtitle } = getTabDetails();

  return (
    <header className="header-container">
      <div className="header-left">
        {/* Header AURA Micro Brand */}
        <div 
          className="header-brand-micro"
          onClick={() => setActiveTab('dashboard')}
          title="Return to Study Hub"
        >
          <span className="header-aura-text">AURA</span>
          <span className="header-aura-badge">RAG</span>
        </div>

        <div className="header-divider-v" />

        <div className="header-titles">
          <div className="header-title-row">
            <h1 className="header-title">{title}</h1>
            <span className="copilot-badge">
              <Sparkles size={12} className="badge-sparkle" />
              Gemini 3.5
            </span>
          </div>
          <p className="header-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="header-right">
        {/* Quick Nav to Dashboard if on another tab */}
        {activeTab !== 'dashboard' && (
          <button 
            className="btn-header-hub"
            onClick={() => setActiveTab('dashboard')}
            title="Open Study Hub Dashboard"
          >
            <LayoutDashboard size={15} />
            <span>Dashboard Hub</span>
          </button>
        )}

        {/* Active Scope Pill with Preview Action */}
        <div className="scope-pill">
          <span className="scope-label">Scope:</span>
          {currentDocObj ? (
            <div className="scope-doc-active">
              <FileText size={14} className="scope-icon" />
              <span className="scope-name" title={currentDocObj.filename}>
                {currentDocObj.filename}
              </span>
              <span className="scope-meta">
                {currentDocObj.total_pages}p • {currentDocObj.chunk_count} chunks
              </span>
              <button
                className="btn-scope-preview"
                onClick={() => onOpenPreview(currentDocObj.doc_id)}
                title="Preview this document pages and architecture"
              >
                <Eye size={13} />
                <span>Preview</span>
              </button>
            </div>
          ) : (
            <div className="scope-all">
              <Layers size={14} className="scope-icon" />
              <span>All Documents ({documents.length})</span>
            </div>
          )}
        </div>

        {/* Upload Action */}
        <button 
          className="btn-upload-primary"
          onClick={onOpenUpload}
          title="Upload new document"
        >
          <Upload size={16} />
          <span>Upload Material</span>
        </button>

        {/* Backend Status Indicator */}
        <div 
          className={`status-pill ${backendStatus === 'online' ? 'status-online' : 'status-offline'}`}
          title={backendStatus === 'online' ? 'FastAPI Backend Connected' : 'Connecting to Backend...'}
        >
          <span className="status-dot" />
          <span className="status-text">
            {backendStatus === 'online' ? 'API LIVE' : 'CONNECTING'}
          </span>
        </div>
      </div>
    </header>
  );
}
