import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  FileText, 
  Layers, 
  Copy, 
  Check, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  AlertCircle,
  RotateCcw,
  Bot,
  User,
  Quote
} from 'lucide-react';
import { api } from '../api/client';

export default function ChatView({ selectedDoc, documents, onOpenUpload }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to AURA Study Copilot. Ask any question about your course materials, lecture notes, or textbooks. Every single response is strictly grounded in the document context with source citations.',
      sources: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [openSources, setOpenSources] = useState({});
  const messagesEndRef = useRef(null);

  const activeDocObj = documents.find((d) => d.doc_id === selectedDoc);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSource = (msgId) => {
    setOpenSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleSend = async (questionText = inputQuestion) => {
    const q = questionText.trim();
    if (!q || isLoading) return;

    const userMessageId = `user_${Date.now()}`;
    const userMsg = {
      id: userMessageId,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsLoading(true);

    try {
      const response = await api.askQuestion({
        question: q,
        docId: selectedDoc || null,
      });

      const assistantMsg = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sources: response.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Q&A error:', err);
      let errorDetail = err.message || 'Unable to retrieve answer. Please verify the backend connection.';
      
      const assistantMsg = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        isError: true,
        content: `Error: ${errorDetail}`,
        sources: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sampleQuestions = [
    'What are the core concepts covered in this document?',
    'Summarize the primary takeaways and key definitions.',
    'What are the key trade-offs or methodologies explained?',
    'Can you list any formulas, algorithms, or rules highlighted?',
  ];

  return (
    <div className="chat-view-container">
      {/* Top Banner Notice */}
      <div className="grounding-banner">
        <div className="grounding-badge">
          <ShieldCheck size={14} className="text-crimson" />
          <span>Strictly Grounded Search</span>
        </div>
        <span className="grounding-text">
          Searching {activeDocObj ? `"${activeDocObj.filename}"` : 'across all uploaded documents in ChromaDB'}.
          If the document does not contain the answer, Gemini will explicitly tell you.
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-messages-area">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const hasSources = msg.sources && msg.sources.length > 0;
          const isSourcesOpen = openSources[msg.id];

          return (
            <div
              key={msg.id}
              className={`chat-bubble-row ${isUser ? 'chat-row-user' : 'chat-row-ai'}`}
            >
              <div className="chat-avatar">
                {isUser ? <User size={15} /> : <Bot size={16} className="text-crimson" />}
              </div>

              <div className="chat-bubble-content">
                <div className="bubble-header">
                  <span className="bubble-sender">
                    {isUser ? 'You' : 'AURA Copilot'}
                  </span>
                  <span className="bubble-time">{msg.timestamp}</span>
                </div>

                <div className={`bubble-body ${msg.isError ? 'bubble-error' : ''}`}>
                  <p className="bubble-text">{msg.content}</p>
                </div>

                {/* Sources Accordion */}
                {hasSources && (
                  <div className="sources-container">
                    <button
                      className="sources-toggle-btn"
                      onClick={() => toggleSource(msg.id)}
                    >
                      <div className="sources-toggle-left">
                        <Quote size={13} className="text-crimson" />
                        <span>
                          {msg.sources.length} Cited Source{msg.sources.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      {isSourcesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isSourcesOpen && (
                      <div className="sources-list animate-fade-in">
                        {msg.sources.map((src, i) => (
                          <div key={i} className="source-item-card">
                            <div className="source-meta-row">
                              <span className="source-file">
                                <FileText size={12} />
                                {src.filename}
                              </span>
                              <span className="source-page-badge">
                                Page {src.page}
                              </span>
                            </div>
                            <blockquote className="source-snippet">
                              "{src.snippet}"
                            </blockquote>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons (Copy) */}
                {!isUser && !msg.isError && (
                  <div className="bubble-actions">
                    <button
                      className="btn-copy-bubble"
                      onClick={() => handleCopy(msg.content, msg.id)}
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={12} className="text-emerald" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="chat-bubble-row chat-row-ai animate-fade-in">
            <div className="chat-avatar">
              <Bot size={16} className="text-crimson animate-pulse" />
            </div>
            <div className="chat-bubble-content">
              <div className="bubble-header">
                <span className="bubble-sender">AURA Copilot</span>
                <span className="bubble-time">Searching embeddings...</span>
              </div>
              <div className="loading-dots-container">
                <span className="dot dot-1" />
                <span className="dot dot-2" />
                <span className="dot dot-3" />
                <span className="loading-hint">Consulting ChromaDB & Gemini...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts if chat is short */}
      {messages.length <= 2 && documents.length > 0 && (
        <div className="suggested-prompts-container">
          <span className="suggested-label">Suggested prompts:</span>
          <div className="suggested-chips">
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                className="prompt-chip"
                onClick={() => handleSend(q)}
                disabled={isLoading}
              >
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* If no documents uploaded prompt */}
      {documents.length === 0 && (
        <div className="no-docs-warning">
          <AlertCircle size={15} className="text-crimson" />
          <span>No documents uploaded yet. For grounded answers, please upload a document first.</span>
          <button className="btn-inline-upload" onClick={onOpenUpload}>
            Upload Now
          </button>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="chat-input-bar">
        <div className="input-field-wrapper">
          <textarea
            className="chat-textarea"
            rows={1}
            placeholder={
              activeDocObj
                ? `Ask anything about "${activeDocObj.filename}"... (Press Enter to send)`
                : 'Ask anything across your study materials... (Press Enter to send)'
            }
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            className="btn-chat-send"
            onClick={() => handleSend()}
            disabled={!inputQuestion.trim() || isLoading}
            title="Send question"
          >
            <Send size={16} />
          </button>
        </div>

        <div className="chat-input-footer">
          <span className="input-scope-indicator">
            Scope: {activeDocObj ? activeDocObj.filename : 'Global Search (All Docs)'}
          </span>
          {messages.length > 2 && (
            <button
              className="btn-clear-chat"
              onClick={() =>
                setMessages([
                  {
                    id: 'reset',
                    role: 'assistant',
                    content: 'Chat history cleared. How can I assist you with your documents?',
                    sources: [],
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ])
              }
            >
              <RotateCcw size={11} />
              <span>Reset Chat</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
