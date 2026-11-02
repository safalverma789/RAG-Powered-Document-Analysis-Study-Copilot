import React, { useState, useEffect } from 'react';
import { 
  ListChecks, 
  Sparkles, 
  Copy, 
  Check, 
  FileText, 
  Loader2, 
  AlertTriangle,
  Lightbulb,
  Bookmark
} from 'lucide-react';
import { api } from '../api/client';

export default function KeypointsView({ selectedDoc, setSelectedDoc, documents, onOpenUpload }) {
  const [targetDocId, setTargetDocId] = useState(selectedDoc || (documents[0]?.doc_id || ''));
  const [keypoints, setKeypoints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (selectedDoc) {
      setTargetDocId(selectedDoc);
    } else if (documents.length > 0 && !targetDocId) {
      setTargetDocId(documents[0].doc_id);
    }
  }, [selectedDoc, documents]);

  const activeDocObj = documents.find((d) => d.doc_id === targetDocId);

  const handleExtract = async () => {
    if (!targetDocId) return;

    setIsLoading(true);
    setErrorMsg('');
    setKeypoints([]);

    try {
      const res = await api.extractKeypoints({ docId: targetDocId });
      setKeypoints(res.key_points || []);
    } catch (err) {
      console.error('Keypoints error:', err);
      setErrorMsg(err.message || 'Failed to extract key points.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySingle = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = () => {
    if (!keypoints.length) return;
    const formatted = keypoints.map((pt, i) => `${i + 1}. ${pt}`).join('\n\n');
    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="view-container animate-fade-in">
      {/* Control Card */}
      <div className="view-control-card">
        <div className="control-header">
          <div className="control-title-col">
            <h2 className="view-section-title">Key Concepts & Takeaways</h2>
            <p className="view-section-desc">
              Extract high-yield concepts, definitions, and essential exam facts straight from your documents.
            </p>
          </div>
          <div className="map-reduce-badge">
            <Bookmark size={14} className="text-crimson" />
            <span>High-Yield Extraction</span>
          </div>
        </div>

        <div className="control-grid">
          <div className="control-field">
            <label className="field-label">Target Document</label>
            {documents.length === 0 ? (
              <div className="field-empty-box">
                <span>No documents found.</span>
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
        </div>

        <div className="control-action-row">
          <button
            className="btn-primary"
            onClick={handleExtract}
            disabled={!targetDocId || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Distilling Key Points...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Extract Key Points</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="upload-alert alert-error animate-fade-in">
          <AlertTriangle size={16} />
          <div className="alert-text">{errorMsg}</div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="view-loading-card animate-fade-in">
          <Loader2 size={32} className="animate-spin text-crimson" />
          <h3 className="loading-title">Analyzing Core Concepts</h3>
          <p className="loading-subtitle">
            Scanning document chunks to isolate critical principles and high-frequency facts...
          </p>
        </div>
      )}

      {/* Rendered Keypoints List */}
      {keypoints.length > 0 && !isLoading && (
        <div className="keypoints-result-section animate-fade-in">
          <div className="keypoints-header-row">
            <div className="header-left-stat">
              <span className="keypoint-count-pill">
                {keypoints.length} Essential Takeaways
              </span>
              <span className="source-label">Source: {activeDocObj?.filename}</span>
            </div>

            <button className="btn-copy" onClick={handleCopyAll} title="Copy all key points">
              {copiedAll ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
              <span>{copiedAll ? 'All Copied' : 'Copy All'}</span>
            </button>
          </div>

          <div className="keypoints-cards-grid">
            {keypoints.map((point, index) => {
              const isCopied = copiedIndex === index;
              return (
                <div key={index} className="keypoint-card">
                  <div className="keypoint-index-badge">#{index + 1}</div>
                  <p className="keypoint-text">{point}</p>
                  <button
                    className="keypoint-btn-copy"
                    onClick={() => handleCopySingle(point, index)}
                    title="Copy this key point"
                  >
                    {isCopied ? (
                      <Check size={13} className="text-emerald" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
