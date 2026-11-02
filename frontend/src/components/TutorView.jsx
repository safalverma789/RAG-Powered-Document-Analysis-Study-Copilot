import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  Sparkles, 
  Copy, 
  Check, 
  BookOpen, 
  Loader2, 
  AlertTriangle,
  Compass,
  GraduationCap
} from 'lucide-react';
import { api } from '../api/client';

export default function TutorView({ selectedDoc, setSelectedDoc, documents, onOpenUpload }) {
  const [targetDocId, setTargetDocId] = useState(selectedDoc || (documents[0]?.doc_id || ''));
  const [topic, setTopic] = useState('');
  const [tutorData, setTutorData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (selectedDoc) {
      setTargetDocId(selectedDoc);
    } else if (documents.length > 0 && !targetDocId) {
      setTargetDocId(documents[0].doc_id);
    }
  }, [selectedDoc, documents]);

  const activeDocObj = documents.find((d) => d.doc_id === targetDocId);

  const handleExplain = async (topicToExplain = topic) => {
    const t = topicToExplain.trim();
    if (!targetDocId || !t) return;

    setIsLoading(true);
    setErrorMsg('');
    setTutorData(null);

    try {
      const res = await api.explainTopic({
        docId: targetDocId,
        topic: t,
      });
      setTutorData(res);
    } catch (err) {
      console.error('Tutor explanation error:', err);
      setErrorMsg(err.message || 'Failed to explain concept.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!tutorData?.explanation) return;
    navigator.clipboard.writeText(tutorData.explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sampleTopics = [
    'Virtual Memory',
    'Process vs Thread',
    'Deadlocks & Coffman Conditions',
    'Context Switching Overhead',
    'System Calls vs Library Functions',
  ];

  return (
    <div className="view-container animate-fade-in">
      {/* Control Card */}
      <div className="view-control-card">
        <div className="control-header">
          <div className="control-title-col">
            <h2 className="view-section-title">AI Concept Tutor</h2>
            <p className="view-section-desc">
              Get patient, friendly explanations with relatable analogies and intuitive step-by-step breakdowns grounded in your documents.
            </p>
          </div>
          <div className="map-reduce-badge">
            <GraduationCap size={14} className="text-crimson" />
            <span>Analogies & Intuition</span>
          </div>
        </div>

        <div className="control-grid">
          {/* Target Document */}
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
                    {doc.filename}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Topic to explain */}
          <div className="control-field">
            <label className="field-label">Concept / Topic to Explain</label>
            <input
              type="text"
              className="text-input"
              placeholder="e.g. Virtual Memory, Deadlock, Semaphore..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExplain()}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Suggested Topic Chips */}
        <div className="topic-suggestions-row">
          <span className="suggested-label">Quick topics:</span>
          <div className="suggested-chips">
            {sampleTopics.map((item, idx) => (
              <button
                key={idx}
                className="prompt-chip"
                onClick={() => {
                  setTopic(item);
                  handleExplain(item);
                }}
                disabled={isLoading}
              >
                <span>{item}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="control-action-row">
          <button
            className="btn-primary"
            onClick={() => handleExplain()}
            disabled={!targetDocId || !topic.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Formulating Tutor Analogy...</span>
              </>
            ) : (
              <>
                <Lightbulb size={16} />
                <span>Explain Like I'm a Beginner</span>
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
          <h3 className="loading-title">Drafting Intuitive Analogy</h3>
          <p className="loading-subtitle">
            Searching for "{topic}" across "{activeDocObj?.filename}" and crafting simple explanations...
          </p>
        </div>
      )}

      {/* Explanation Result Card */}
      {tutorData && !isLoading && (
        <div className="summary-result-card animate-fade-in">
          <div className="result-header">
            <div className="result-meta-left">
              <Compass size={18} className="text-crimson" />
              <span className="result-doc-name">{tutorData.topic}</span>
              <span className="result-badge-style">Tutor Explanation</span>
            </div>

            <button className="btn-copy" onClick={handleCopy} title="Copy explanation">
              {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="summary-content">
            {tutorData.explanation.split('\n\n').map((para, i) => (
              <p key={i} className="summary-paragraph">
                {para}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
