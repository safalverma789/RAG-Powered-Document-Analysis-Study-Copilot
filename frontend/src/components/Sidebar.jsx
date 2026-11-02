import React, { useState } from 'react';
import { 
  LayoutDashboard,
  MessageSquare, 
  FileText, 
  ListChecks, 
  GraduationCap, 
  Lightbulb, 
  Upload, 
  Trash2, 
  Layers, 
  Database, 
  Flame, 
  FileUp, 
  Cpu,
  Pin,
  PinOff,
  Eye,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  documents, 
  selectedDoc, 
  setSelectedDoc, 
  onDeleteDocument, 
  onOpenUpload,
  onOpenPreview,
  totalChunks,
  backendStatus 
}) {
  const [deletingId, setDeletingId] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Expanded if either pinned open OR cursor is hovering
  const isExpanded = isPinned || isHovered;

  const navItems = [
    { id: 'dashboard', label: 'Study Hub', icon: LayoutDashboard, badge: 'Overview' },
    { id: 'chat', label: 'Q&A Chat', icon: MessageSquare, badge: 'Grounded' },
    { id: 'summary', label: 'Map-Reduce', icon: FileText, badge: 'AI' },
    { id: 'keypoints', label: 'Key Takeaways', icon: ListChecks },
    { id: 'quiz', label: 'Quiz Arena', icon: GraduationCap, badge: 'Interactive' },
    { id: 'tutor', label: 'Concept Tutor', icon: Lightbulb },
  ];

  const handleDelete = async (e, docId, filename) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${filename}" and purge all its embeddings from ChromaDB?`)) {
      setDeletingId(docId);
      try {
        await onDeleteDocument(docId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <aside 
      className={`sidebar-container ${isExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'} ${isPinned ? 'sidebar-pinned' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-expanded={isExpanded}
    >
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div 
          className="brand-logo-glow" 
          title="AURA RAG Study Copilot"
          onClick={() => setActiveTab('dashboard')}
        >
          <Flame size={24} className="brand-icon" />
        </div>

        <div className="brand-text-col">
          <div className="brand-title-wrap">
            <span className="brand-name-mega">AURA</span>
            <span className="brand-tag-glow">RAG 2.5</span>
          </div>
          <span className="brand-sub-glow">NEURAL STUDY COPILOT</span>
        </div>

        {/* Pin / Unpin button */}
        <button
          className={`btn-pin-sidebar ${isPinned ? 'pin-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsPinned(!isPinned);
          }}
          title={isPinned ? 'Unpin sidebar (auto-collapse on hover off)' : 'Pin sidebar open'}
        >
          {isPinned ? <Pin size={14} className="text-crimson" /> : <PinOff size={14} />}
        </button>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="sidebar-section">
        <span className="section-label">STUDY TOOLS</span>
        <nav className="nav-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                title={!isExpanded ? item.label : undefined}
              >
                <div className="nav-item-left">
                  <div className="nav-icon-wrapper">
                    <Icon size={19} className="nav-icon" />
                  </div>
                  <span className="nav-label">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`nav-badge ${isActive ? 'nav-badge-active' : ''}`}>
                    {item.badge}
                  </span>
                )}
                
                {/* Floating tooltip when collapsed */}
                {!isExpanded && (
                  <div className="nav-collapsed-tooltip">
                    <span>{item.label}</span>
                    {item.badge && <span className="tooltip-badge">{item.badge}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Documents Library */}
      <div className="sidebar-section sidebar-docs-section">
        <div className="section-header-row">
          <div className="section-header-left">
            <span className="section-label">DOCUMENTS</span>
            <span className="doc-count-badge">{documents.length}</span>
          </div>
          <button 
            className="btn-quick-upload"
            onClick={onOpenUpload}
            title="Upload Document"
          >
            <Upload size={13} />
            <span>Add</span>
          </button>
        </div>

        <div className="doc-list-scroll">
          {/* Option: All Documents (Global search) */}
          <div
            className={`doc-item ${selectedDoc === null ? 'doc-item-active' : ''}`}
            onClick={() => setSelectedDoc(null)}
            title={!isExpanded ? 'All Documents (Global Search)' : undefined}
          >
            <div className="doc-item-icon-box">
              <Layers size={16} />
            </div>
            <div className="doc-item-info">
              <span className="doc-item-title">All Documents</span>
              <span className="doc-item-meta">Search entire library</span>
            </div>
          </div>

          {/* Individual uploaded documents */}
          {documents.length === 0 ? (
            <div className="docs-empty-state">
              <FileUp size={22} className="empty-icon" />
              <p className="empty-title">No docs yet</p>
              <p className="empty-sub">Upload notes to start.</p>
              <button className="btn-empty-upload" onClick={onOpenUpload}>
                Upload
              </button>
            </div>
          ) : (
            documents.map((doc) => {
              const isSelected = selectedDoc === doc.doc_id;
              const isDeleting = deletingId === doc.doc_id;
              return (
                <div
                  key={doc.doc_id}
                  className={`doc-item ${isSelected ? 'doc-item-active' : ''}`}
                  onClick={() => setSelectedDoc(doc.doc_id)}
                  title={!isExpanded ? `${doc.filename} (${doc.total_pages}p, ${doc.chunk_count} chunks)` : undefined}
                >
                  <div className="doc-item-icon-box">
                    <FileText size={16} />
                  </div>
                  <div className="doc-item-info">
                    <span className="doc-item-title" title={doc.filename}>
                      {doc.filename}
                    </span>
                    <span className="doc-item-meta">
                      {doc.total_pages} {doc.total_pages === 1 ? 'page' : 'pages'} • {doc.chunk_count} chunks
                    </span>
                  </div>

                  {/* Document Action Buttons: Preview & Delete */}
                  <div className="doc-item-actions-group">
                    <button
                      className="btn-doc-action btn-preview-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPreview(doc.doc_id);
                      }}
                      title="Preview Document"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      className="btn-doc-action btn-delete-action"
                      onClick={(e) => handleDelete(e, doc.doc_id, doc.filename)}
                      disabled={isDeleting}
                      title="Delete document and embeddings"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* System Footer Widget */}
      <div className="sidebar-footer">
        <div className="system-stat-card">
          <div className="stat-header">
            <Database size={14} className="stat-icon" />
            <span className="stat-label">ChromaDB Store</span>
          </div>
          <div className="stat-row">
            <span className="stat-value">{totalChunks} chunks</span>
            <span className="stat-chip">MiniLM-L6</span>
          </div>
          <div className="stat-footer-info">
            <Cpu size={12} className="text-crimson" />
            <span>Strict Shield Active</span>
          </div>
        </div>

        {/* Collapsed mini indicator */}
        <div className="collapsed-stat-mini" title={`ChromaDB: ${totalChunks} chunks indexed`}>
          <Database size={16} className="text-crimson" />
          <span className="mini-chunk-count">{totalChunks}</span>
        </div>
      </div>
    </aside>
  );
}
