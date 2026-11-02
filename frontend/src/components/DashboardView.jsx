import React from 'react';
import { 
  MessageSquare, 
  FileText, 
  ListChecks, 
  GraduationCap, 
  Lightbulb, 
  Upload, 
  Eye, 
  Trash2, 
  Layers, 
  Database, 
  Flame, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  ArrowRight,
  BookOpen,
  Split,
  FileCheck2,
  Clock,
  Zap
} from 'lucide-react';

export default function DashboardView({
  documents,
  selectedDoc,
  setSelectedDoc,
  onOpenUpload,
  onOpenPreview,
  onNavigateTab,
  onDeleteDocument,
  totalChunks,
  backendStatus
}) {
  const currentDocObj = documents.find((d) => d.doc_id === selectedDoc);

  const dashboardModules = [
    {
      id: 'chat',
      title: 'Neural Q&A Chat',
      category: 'STRICT GROUNDING',
      desc: 'Ask complex questions across your study materials. Every answer is mathematically grounded in local vector chunks with page citations.',
      icon: MessageSquare,
      badge: 'Anti-Hallucination',
      stats: 'Top-5 Semantic Retrieval',
      gradient: 'var(--gradient-crimson)',
      actionText: 'Launch Chat Session'
    },
    {
      id: 'summary',
      title: 'Map-Reduce Synthesizer',
      category: 'HIERARCHICAL SYNTHESIS',
      desc: 'Distill multi-page textbooks and extensive lecture slide decks using an enterprise two-stage Map & Reduce hierarchical aggregation.',
      icon: Split,
      badge: 'Executive Briefs',
      stats: 'Short & Detailed Modes',
      gradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 60%, #881337 100%)',
      actionText: 'Generate Summary'
    },
    {
      id: 'keypoints',
      title: 'Key Takeaways Vault',
      category: 'CONCEPT ISOLATION',
      desc: 'Extract essential definitions, critical equations, and high-yield exam takeaways organized into numbered flashcards with one-click copying.',
      icon: ListChecks,
      badge: 'High-Yield Facts',
      stats: 'Instant Extraction',
      gradient: 'linear-gradient(135deg, #ff2a5f 0%, #e11d48 60%, #4c0519 100%)',
      actionText: 'Extract Key Points'
    },
    {
      id: 'quiz',
      title: 'Interactive Quiz Arena',
      category: 'ASSESSMENT ENGINE',
      desc: 'Test your retention with multiple-choice questions strictly sourced from your notes. Features real-time validation, grounded explanations, and scoring.',
      icon: GraduationCap,
      badge: 'Interactive Testing',
      stats: '3 Difficulty Tiers',
      gradient: 'linear-gradient(135deg, #fb7185 0%, #e11d48 50%, #9f1239 100%)',
      actionText: 'Enter Quiz Arena'
    },
    {
      id: 'tutor',
      title: 'AI Concept Tutor',
      category: 'INTUITIVE ANALOGIES',
      desc: 'Translate complex mathematical, computing, or engineering concepts into memorable real-world analogies tailored for quick comprehension.',
      icon: Lightbulb,
      badge: 'Analogy Engine',
      stats: 'Beginner-Friendly',
      gradient: 'linear-gradient(135deg, #ff1a48 0%, #be123c 50%, #500724 100%)',
      actionText: 'Request Tutor Breakdown'
    }
  ];

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Massive AURA Brand Hero Banner */}
      <section className="aura-hero-banner">
        <div className="hero-radial-glow" />
        
        <div className="hero-content">
          <div className="hero-badge-row">
            <span className="hero-tag-pill">
              <Zap size={13} className="text-crimson" />
              RAG Study Intelligence Platform
            </span>
            <span className="hero-status-pill">
              <span className={`status-dot ${backendStatus === 'online' ? 'dot-green' : 'dot-red'}`} />
              {backendStatus === 'online' ? 'FastAPI Neural Engine Active' : 'Connecting Engine...'}
            </span>
          </div>

          <div className="hero-title-group">
            <h1 className="hero-aura-title">
              AURA
              <span className="hero-aura-dot">.</span>
            </h1>
            <p className="hero-aura-subtitle">
              AUTONOMOUS UNDERSTANDING & RETRIEVAL ARCHITECTURE
            </p>
          </div>

          <p className="hero-lead-text">
            Ingest course documents into a private local vector database. Generate strictly verified Q&A, map-reduce summaries, quizzes, and intuitive tutoring powered by Google Gemini and ChromaDB.
          </p>

          <div className="hero-cta-row">
            <button className="btn-hero-primary" onClick={onOpenUpload}>
              <Upload size={18} />
              <span>Upload Document</span>
            </button>
            
            {currentDocObj && (
              <button 
                className="btn-hero-secondary"
                onClick={() => onOpenPreview(currentDocObj.doc_id)}
              >
                <Eye size={18} className="text-crimson" />
                <span>Preview "{currentDocObj.filename}"</span>
              </button>
            )}

            <button 
              className="btn-hero-ghost"
              onClick={() => onNavigateTab('chat')}
            >
              <MessageSquare size={18} />
              <span>Open Study Chat</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* System Vitals Strip */}
        <div className="hero-vitals-strip">
          <div className="vital-item">
            <div className="vital-icon-box">
              <Database size={16} className="text-crimson" />
            </div>
            <div className="vital-data">
              <span className="vital-val">{totalChunks}</span>
              <span className="vital-lbl">Indexed Chunks</span>
            </div>
          </div>

          <div className="vital-divider" />

          <div className="vital-item">
            <div className="vital-icon-box">
              <Layers size={16} className="text-crimson" />
            </div>
            <div className="vital-data">
              <span className="vital-val">{documents.length}</span>
              <span className="vital-lbl">Active Documents</span>
            </div>
          </div>

          <div className="vital-divider" />

          <div className="vital-item">
            <div className="vital-icon-box">
              <Cpu size={16} className="text-crimson" />
            </div>
            <div className="vital-data">
              <span className="vital-val">MiniLM-L6-v2</span>
              <span className="vital-lbl">Local Vector Embedding</span>
            </div>
          </div>

          <div className="vital-divider" />

          <div className="vital-item">
            <div className="vital-icon-box">
              <ShieldCheck size={16} className="text-emerald" />
            </div>
            <div className="vital-data">
              <span className="vital-val">Strict Grounding</span>
              <span className="vital-lbl">Zero-Hallucination Shield</span>
            </div>
          </div>
        </div>
      </section>

      {/* Big Dashboard of Interactive Tool Cards */}
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div className="header-titles-col">
            <h2 className="dash-heading">STUDY INTELLIGENCE MODULES</h2>
            <p className="dash-sub">Select an interactive tool to analyze and test your uploaded study materials</p>
          </div>
        </div>

        <div className="big-dashboard-grid">
          {dashboardModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div 
                key={mod.id} 
                className="big-tool-card"
                onClick={() => onNavigateTab(mod.id)}
              >
                <div className="tool-card-glow-bg" />
                
                <div className="tool-card-top">
                  <div className="big-icon-box" style={{ background: mod.gradient }}>
                    <Icon size={26} className="tool-main-icon" />
                  </div>
                  <div className="tool-badge-col">
                    <span className="tool-category-badge">{mod.category}</span>
                    <span className="tool-feature-chip">{mod.badge}</span>
                  </div>
                </div>

                <div className="tool-card-body">
                  <h3 className="big-tool-title">{mod.title}</h3>
                  <p className="big-tool-desc">{mod.desc}</p>
                </div>

                <div className="tool-card-footer">
                  <span className="tool-stats-meta">{mod.stats}</span>
                  <div className="tool-action-btn">
                    <span>{mod.actionText}</span>
                    <ArrowRight size={14} className="action-arrow" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Document Knowledge Base Dashboard */}
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div className="header-titles-col">
            <h2 className="dash-heading">KNOWLEDGE BASE REPOSITORY</h2>
            <p className="dash-sub">Your uploaded documents stored in persistent ChromaDB vector storage</p>
          </div>
          <button className="btn-upload-primary" onClick={onOpenUpload}>
            <Upload size={15} />
            <span>Upload New Material</span>
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="dashboard-docs-empty" onClick={onOpenUpload}>
            <div className="empty-drop-circle">
              <Upload size={32} className="text-crimson" />
            </div>
            <h3 className="empty-drop-title">No Documents in Vector Store</h3>
            <p className="empty-drop-sub">
              Upload PDF or plain text documents. AURA will chunk and embed them for instant grounded Q&A, summaries, and quizzes.
            </p>
            <button className="btn-primary">Browse Files (.pdf, .txt)</button>
          </div>
        ) : (
          <div className="dashboard-docs-grid">
            {documents.map((doc) => {
              const isSelected = selectedDoc === doc.doc_id;
              return (
                <div 
                  key={doc.doc_id}
                  className={`big-doc-card ${isSelected ? 'doc-card-selected' : ''}`}
                  onClick={() => setSelectedDoc(doc.doc_id)}
                >
                  <div className="doc-card-top-row">
                    <div className="doc-icon-box">
                      <FileText size={22} className="text-crimson" />
                    </div>
                    <div className="doc-badge-group">
                      <span className="doc-chip-pages">{doc.total_pages} Pages</span>
                      <span className="doc-chip-chunks">{doc.chunk_count} Chunks</span>
                    </div>
                  </div>

                  <div className="doc-card-body">
                    <h4 className="doc-card-title" title={doc.filename}>
                      {doc.filename}
                    </h4>
                    <span className="doc-card-id">ID: {doc.doc_id}</span>
                  </div>

                  <div className="doc-card-actions">
                    <button
                      className="btn-doc-preview"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPreview(doc.doc_id);
                      }}
                      title="Preview Document Pages & Architecture"
                    >
                      <Eye size={14} />
                      <span>Preview</span>
                    </button>

                    <button
                      className="btn-doc-study"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDoc(doc.doc_id);
                        onNavigateTab('chat');
                      }}
                      title="Study this document in Q&A Chat"
                    >
                      <span>Study Now</span>
                      <ArrowRight size={13} />
                    </button>

                    <button
                      className="btn-doc-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${doc.filename}" from ChromaDB?`)) {
                          onDeleteDocument(doc.doc_id);
                        }
                      }}
                      title="Delete from Vector Store"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
