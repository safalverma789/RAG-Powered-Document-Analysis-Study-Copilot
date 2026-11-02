import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Layers, 
  Clock, 
  AlignLeft, 
  Loader2, 
  AlertTriangle,
  BookOpenCheck,
  Split
} from 'lucide-react';
import { api } from '../api/client';

export default function SummaryView({ selectedDoc, setSelectedDoc, documents, onOpenUpload }) {
  const [style, setStyle] = useState('short');
  const [targetDocId, setTargetDocId] = useState(selectedDoc || (documents[0]?.doc_id || ''));
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Sync if selectedDoc changes from sidebar
  React.useEffect(() => {
    if (selectedDoc) {
      setTargetDocId(selectedDoc);
    } else if (documents.length > 0 && !targetDocId) {
      setTargetDocId(documents[0].doc_id);
    }
  }, [selectedDoc, documents]);

  const activeDocObj = documents.find((d) => d.doc_id === targetDocId);

  const handleGenerate = async () => {
    if (!targetDocId) return;

    setIsLoading(true);
    setErrorMsg('');
    setSummaryData(null);

    try {
      const res = await api.summarizeDocument({
        docId: targetDocId,
        style,
      });
      setSummaryData(res);
    } catch (err) {
      console.error('Summarize error:', err);
      setErrorMsg(err.message || 'Failed to generate map-reduce summary.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summaryData?.summary) return;
    navigator.clipboard.writeText(summaryData.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = summaryData?.summary ? summaryData.summary.split(/\s+/).filter(Boolean).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="view-container animate-fade-in">
      {/* Control Card */}
      <div className="view-control-card">
        <div className="control-header">
          <div className="control-title-col">
            <h2 className="view-section-title">Map-Reduce Document Summarization</h2>
            <p className="view-section-desc">
              For long notes or multi-page textbooks, Map-Reduce divides chunks into parallel sections (Map) and synthesizes them into an executive overview (Reduce).
            </p>
          </div>
          <div className="map-reduce-badge">
            <Split size={14} className="text-crimson" />
            <span>2-Stage Map-Reduce</span>
          </div>
        </div>

        <div className="control-grid">
          {/* Target Document Picker */}
          <div className="control-field">
            <label className="field-label">Target Document</label>
            {documents.length === 0 ? (
              <div className="field-empty-box">
                <span>No documents available.</span>
                <button className="btn-link text-crimson" onClick={onOpenUpload}>
                  Upload one now
                </button>
              </div>
            ) : (
              <select
                className="select-input"
                value={targetDocId}
                onChange={(e) => {
                  setTargetDocId(e.target.value);
                  setSelectedDoc(e.target.value);
                }}
                disabled={isLoading}
              >
                {documents.map((doc) => (
                  <option key={doc.doc_id} value={doc.doc_id}>
                    {doc.filename} ({doc.total_pages}p, {doc.chunk_count} chunks)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Style Selector */}
          <div className="control-field">
            <label className="field-label">Summary Depth</label>
            <div className="style-toggle-group">
              <button
                className={`btn-toggle ${style === 'short' ? 'btn-toggle-active' : ''}`}
                onClick={() => setStyle('short')}
                disabled={isLoading}
              >
                <span>Executive Brief (Short)</span>
              </button>
              <button
                className={`btn-toggle ${style === 'detailed' ? 'btn-toggle-active' : ''}`}
                onClick={() => setStyle('detailed')}
                disabled={isLoading}
              >
                <span>In-Depth Analysis (Detailed)</span>
              </button>
            </div>
          </div>
        </div>

        <div className="control-action-row">
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={!targetDocId || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Generating Map-Reduce Synthesis...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate Summary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="upload-alert alert-error animate-fade-in">
          <AlertTriangle size={16} />
          <div className="alert-text">{errorMsg}</div>
        </div>
      )}

      {/* Loading state animation */}
      {isLoading && (
        <div className="view-loading-card animate-fade-in">
          <div className="pulsing-radar-box">
            <Loader2 size={32} className="animate-spin text-crimson" />
          </div>
          <h3 className="loading-title">Distilling Document Content</h3>
          <p className="loading-subtitle">
            Running Map step across {activeDocObj?.chunk_count || 'document'} chunks, followed by Gemini Reduce synthesis...
          </p>
        </div>
      )}

      {/* Rendered Summary Result */}
      {summaryData && !isLoading && (
        <div className="summary-result-card animate-fade-in">
          <div className="result-header">
            <div className="result-meta-left">
              <BookOpenCheck size={18} className="text-crimson" />
              <span className="result-doc-name">{activeDocObj?.filename}</span>
              <span className="result-badge-style">
                {summaryData.style === 'detailed' ? 'Detailed Synthesis' : 'Executive Overview'}
              </span>
            </div>

            <div className="result-meta-right">
              <div className="meta-stat">
                <AlignLeft size={13} />
                <span>{wordCount} words</span>
              </div>
              <div className="meta-stat">
                <Clock size={13} />
                <span>~{readingTime} min read</span>
              </div>
              <button className="btn-copy" onClick={handleCopy} title="Copy summary">
                {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="summary-content">
            {summaryData.summary.split('\n\n').map((paragraph, index) => (
              <p key={index} className="summary-paragraph">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
