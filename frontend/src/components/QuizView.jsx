import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowRight, 
  Trophy, 
  Loader2, 
  AlertTriangle,
  HelpCircle,
  Award,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';

export default function QuizView({ selectedDoc, setSelectedDoc, documents, onOpenUpload }) {
  const [targetDocId, setTargetDocId] = useState(selectedDoc || (documents[0]?.doc_id || ''));
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  
  const [quizData, setQuizData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Interactive Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [index]: selectedOptionLetter }
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
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
    setQuizData(null);
    setUserAnswers({});
    setCurrentIndex(0);
    setQuizFinished(false);

    try {
      const res = await api.generateQuiz({
        docId: targetDocId,
        numQuestions: parseInt(numQuestions, 10),
        difficulty,
      });
      setQuizData(res);
    } catch (err) {
      console.error('Quiz generation error:', err);
      setErrorMsg(err.message || 'Failed to generate quiz questions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (letter) => {
    if (userAnswers[currentIndex] !== undefined) return; // already answered this question

    const updated = {
      ...userAnswers,
      [currentIndex]: letter,
    };
    setUserAnswers(updated);

    // If this was the last question, wait for user to click "Complete Quiz"
  };

  const handleNext = () => {
    if (!quizData?.questions) return;
    if (currentIndex + 1 < quizData.questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setQuizFinished(true);
      // Trigger confetti celebration!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff1a48', '#e11d48', '#ffffff', '#fb7185'],
      });
    }
  };

  const handleRetake = () => {
    setUserAnswers({});
    setCurrentIndex(0);
    setQuizFinished(false);
  };

  // Helper to extract option letter (e.g. "A) option text" -> "A")
  const getOptionLetter = (optionStr, fallbackIndex) => {
    const match = optionStr.match(/^([A-D])[\)\.\:\s]/i);
    if (match) return match[1].toUpperCase();
    return String.fromCharCode(65 + fallbackIndex);
  };

  // Calculate score
  const calculateScore = () => {
    if (!quizData?.questions) return { score: 0, total: 0, percentage: 0 };
    let correct = 0;
    quizData.questions.forEach((q, idx) => {
      const selected = userAnswers[idx];
      const correctLetter = q.correct_answer.trim().charAt(0).toUpperCase();
      if (selected === correctLetter) {
        correct++;
      }
    });
    const total = quizData.questions.length;
    const percentage = Math.round((correct / total) * 100);
    return { score: correct, total, percentage };
  };

  const currentQ = quizData?.questions?.[currentIndex];
  const { score, total, percentage } = calculateScore();

  return (
    <div className="view-container animate-fade-in">
      {/* Quiz Configuration Bar */}
      <div className="view-control-card">
        <div className="control-header">
          <div className="control-title-col">
            <h2 className="view-section-title">Interactive Quiz Arena</h2>
            <p className="view-section-desc">
              Test your retention with multiple-choice questions grounded in your course materials.
            </p>
          </div>
          <div className="map-reduce-badge">
            <Award size={14} className="text-crimson" />
            <span>Strictly Grounded Multiple Choice</span>
          </div>
        </div>

        <div className="control-grid control-grid-3">
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

          {/* Number of questions */}
          <div className="control-field">
            <label className="field-label">Question Count</label>
            <select
              className="select-input"
              value={numQuestions}
              onChange={(e) => setNumQuestions(e.target.value)}
              disabled={isLoading}
            >
              <option value={3}>3 Questions (Quick Drill)</option>
              <option value={5}>5 Questions (Standard)</option>
              <option value={8}>8 Questions (Deep Test)</option>
              <option value={10}>10 Questions (Mastery Exam)</option>
            </select>
          </div>

          {/* Difficulty */}
          <div className="control-field">
            <label className="field-label">Difficulty Level</label>
            <div className="difficulty-tabs">
              {['easy', 'medium', 'hard'].map((lvl) => (
                <button
                  key={lvl}
                  className={`diff-btn ${difficulty === lvl ? 'diff-btn-active' : ''}`}
                  onClick={() => setDifficulty(lvl)}
                  disabled={isLoading}
                >
                  {lvl.toUpperCase()}
                </button>
              ))}
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
                <span>Crafting Quiz Questions...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate New Quiz</span>
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

      {/* Loading animation */}
      {isLoading && (
        <div className="view-loading-card animate-fade-in">
          <Loader2 size={32} className="animate-spin text-crimson" />
          <h3 className="loading-title">Synthesizing Questions</h3>
          <p className="loading-subtitle">
            Analyzing concepts from "{activeDocObj?.filename}" and enforcing Pydantic schema validation...
          </p>
        </div>
      )}

      {/* Interactive Arena (when quiz is loaded and not finished) */}
      {quizData && !quizFinished && currentQ && (
        <div className="quiz-arena-card animate-fade-in">
          {/* Progress Header */}
          <div className="quiz-progress-bar-wrapper">
            <div className="quiz-progress-meta">
              <span className="quiz-step-label">
                Question {currentIndex + 1} of {quizData.questions.length}
              </span>
              <span className="quiz-diff-chip">{difficulty.toUpperCase()}</span>
            </div>
            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentIndex + 1) / quizData.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="quiz-question-box">
            <h3 className="quiz-question-text">{currentQ.question}</h3>
          </div>

          {/* Options List */}
          <div className="quiz-options-grid">
            {currentQ.options.map((option, oIdx) => {
              const optLetter = getOptionLetter(option, oIdx);
              const isSelected = userAnswers[currentIndex] === optLetter;
              const hasAnswered = userAnswers[currentIndex] !== undefined;
              const correctLetter = currentQ.correct_answer.trim().charAt(0).toUpperCase();
              const isCorrect = optLetter === correctLetter;

              let btnClass = 'quiz-opt-btn';
              if (hasAnswered) {
                if (isCorrect) {
                  btnClass += ' opt-correct';
                } else if (isSelected && !isCorrect) {
                  btnClass += ' opt-wrong';
                } else {
                  btnClass += ' opt-dimmed';
                }
              }

              return (
                <button
                  key={oIdx}
                  className={btnClass}
                  onClick={() => handleSelectOption(optLetter)}
                  disabled={hasAnswered}
                >
                  <span className="opt-letter-badge">{optLetter}</span>
                  <span className="opt-text">{option.replace(/^[A-D][\)\.\:\s]*/i, '')}</span>
                  {hasAnswered && isCorrect && <CheckCircle2 size={18} className="text-emerald" />}
                  {hasAnswered && isSelected && !isCorrect && <XCircle size={18} className="text-crimson" />}
                </button>
              );
            })}
          </div>

          {/* Explanation if Answered */}
          {userAnswers[currentIndex] !== undefined && (
            <div className="quiz-explanation-box animate-fade-in">
              <div className="explanation-header">
                <BookOpen size={15} className="text-crimson" />
                <span>Grounded Rationale</span>
              </div>
              <p className="explanation-text">{currentQ.explanation}</p>
            </div>
          )}

          {/* Next / Finish Button */}
          {userAnswers[currentIndex] !== undefined && (
            <div className="quiz-nav-row animate-fade-in">
              <button className="btn-primary" onClick={handleNext}>
                <span>
                  {currentIndex + 1 === quizData.questions.length ? 'Finish & View Score' : 'Next Question'}
                </span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quiz Finished / Score Screen */}
      {quizFinished && (
        <div className="quiz-finished-card animate-fade-in">
          <div className="trophy-glow-circle">
            <Trophy size={42} className="trophy-icon" />
          </div>

          <h2 className="finished-title">Quiz Completed!</h2>
          <p className="finished-subtitle">
            Grounded assessment on "{activeDocObj?.filename}"
          </p>

          <div className="score-stat-display">
            <span className="score-digits">
              {score} / {total}
            </span>
            <span className="score-percent">{percentage}% Score</span>
          </div>

          <div className="finished-badge-pill">
            {percentage >= 80 ? '🌟 Distinction // Ready for Exams' : percentage >= 50 ? '👍 Solid Understanding' : '📚 Needs Review'}
          </div>

          <div className="finished-actions">
            <button className="btn-secondary" onClick={handleRetake}>
              <RotateCcw size={16} />
              <span>Retake This Quiz</span>
            </button>
            <button className="btn-primary" onClick={handleGenerate}>
              <Sparkles size={16} />
              <span>Generate New Set</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
