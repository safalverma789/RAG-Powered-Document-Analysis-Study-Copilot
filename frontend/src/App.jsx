import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import ChatView from './components/ChatView';
import SummaryView from './components/SummaryView';
import KeypointsView from './components/KeypointsView';
import QuizView from './components/QuizView';
import TutorView from './components/TutorView';
import DocumentUploadModal from './components/DocumentUploadModal';
import DocumentPreviewModal from './components/DocumentPreviewModal';
import { api } from './api/client';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking' | 'online' | 'offline'

  // Document preview states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState(null);
  const [fileMap, setFileMap] = useState({}); // { [doc_id]: { file, previewUrl } }

  // Check backend health on mount and periodically
  const checkBackendHealth = async () => {
    try {
      const res = await api.checkHealth();
      if (res && res.status === 'ok') {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch {
      setBackendStatus('offline');
    }
  };

  const loadDocuments = async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs || []);
      // If selected document was deleted, reset to null
      if (selectedDoc && !docs.some((d) => d.doc_id === selectedDoc)) {
        setSelectedDoc(null);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  useEffect(() => {
    checkBackendHealth();
    loadDocuments();

    const interval = setInterval(checkBackendHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteDocument = async (docId) => {
    try {
      await api.deleteDocument(docId);
      await loadDocuments();
      if (selectedDoc === docId) {
        setSelectedDoc(null);
      }
      if (previewDocId === docId) {
        setIsPreviewOpen(false);
      }
    } catch (err) {
      alert(`Failed to delete document: ${err.message || 'Unknown error'}`);
    }
  };

  const handleUploadSuccess = (response) => {
    loadDocuments();
    if (response?.doc_id) {
      setSelectedDoc(response.doc_id);

      // Save blob URL for instant previewing
      if (response.previewUrl) {
        setFileMap((prev) => ({
          ...prev,
          [response.doc_id]: {
            file: response.file,
            previewUrl: response.previewUrl,
          },
        }));
      }
    }
  };

  const handleOpenPreview = (docId) => {
    setPreviewDocId(docId);
    setIsPreviewOpen(true);
  };

  const handleAttachLocalFile = (docId, file) => {
    const url = URL.createObjectURL(file);
    setFileMap((prev) => ({
      ...prev,
      [docId]: {
        file,
        previewUrl: url,
      },
    }));
  };

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);
  const docToPreview = documents.find((d) => d.doc_id === previewDocId) || documents.find((d) => d.doc_id === selectedDoc);
  const activePreviewUrl = previewDocId ? fileMap[previewDocId]?.previewUrl : null;

  return (
    <div className="app-layout">
      {/* Interactive Collapsible / Hover-Expand Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documents={documents}
        selectedDoc={selectedDoc}
        setSelectedDoc={setSelectedDoc}
        onDeleteDocument={handleDeleteDocument}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenPreview={handleOpenPreview}
        totalChunks={totalChunks}
        backendStatus={backendStatus}
      />

      {/* Main Viewport */}
      <main className="main-viewport">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedDoc={selectedDoc}
          documents={documents}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenPreview={handleOpenPreview}
          backendStatus={backendStatus}
        />

        <div className="content-container">
          {activeTab === 'dashboard' && (
            <DashboardView
              documents={documents}
              selectedDoc={selectedDoc}
              setSelectedDoc={setSelectedDoc}
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenPreview={handleOpenPreview}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onDeleteDocument={handleDeleteDocument}
              totalChunks={totalChunks}
              backendStatus={backendStatus}
            />
          )}

          {activeTab === 'chat' && (
            <ChatView
              selectedDoc={selectedDoc}
              documents={documents}
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenPreview={handleOpenPreview}
            />
          )}

          {activeTab === 'summary' && (
            <SummaryView
              selectedDoc={selectedDoc}
              setSelectedDoc={setSelectedDoc}
              documents={documents}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}

          {activeTab === 'keypoints' && (
            <KeypointsView
              selectedDoc={selectedDoc}
              setSelectedDoc={setSelectedDoc}
              documents={documents}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}

          {activeTab === 'quiz' && (
            <QuizView
              selectedDoc={selectedDoc}
              setSelectedDoc={setSelectedDoc}
              documents={documents}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}

          {activeTab === 'tutor' && (
            <TutorView
              selectedDoc={selectedDoc}
              setSelectedDoc={setSelectedDoc}
              documents={documents}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Upload Modal with Live Preview */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Dedicated Full Document Previewer & Architecture Inspector */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        document={docToPreview}
        previewUrl={activePreviewUrl}
        onAttachFile={handleAttachLocalFile}
        onLaunchStudy={(docId, tab) => {
          setSelectedDoc(docId);
          setActiveTab(tab);
        }}
      />
    </div>
  );
}
