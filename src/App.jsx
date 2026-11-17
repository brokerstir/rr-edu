/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import MathText from './components/MathText';
import SubpartCard from './components/SubpartCard';
import SessionLengthModal from './components/SessionLengthModal';
import AuthModal from './components/AuthModal';
import ReportIssueModal from './components/ReportIssueModal';
import LandingPage from './components/LandingPage';
import CourseCatalog from './components/CourseCatalog';
import { AuthProvider, useAuth } from './context/AuthContext';
import { generatePracticeSession } from './utils/quizUtils';
import {
  saveQuestionAttempt,
  resolveUserId,
  verifyQuestion,
  unverifyQuestion,
  getVerifiedQuestions
} from './services/dbService';

function MainApp() {
  const { user, isAdmin, signOut } = useAuth();

  // Navigation State: 'landing' | 'catalog' | 'practice'
  const [view, setView] = useState('landing');
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [topics, setTopics] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isAuditMode, setIsAuditMode] = useState(false);
  const [verifiedQuestions, setVerifiedQuestions] = useState(new Set());
  const [verifying, setVerifying] = useState(false);

  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // Dynamic topic list fetching routed by the selected course ID
  useEffect(() => {
    let ignore = false;
    if (!selectedCourse?.id) return;

    fetch(`./data/${selectedCourse.id}/topics.json`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!ignore) setTopics(data);
      })
      .catch(err => {
        console.error(`Error loading topics.json for ${selectedCourse.id}:`, err);
        if (!ignore) setTopics([]);
      });

    return () => {
      ignore = true;
    };
  }, [selectedCourse]);

  // Diagram & image URL resolution to ./data/<course_id>/questions/<image_file>
  const resolveDiagramUrl = (imageFile) => {
    if (!imageFile) return '';
    if (imageFile.startsWith('http://') || imageFile.startsWith('https://')) {
      return imageFile;
    }
    const filename = imageFile.split('/').pop();
    const courseId = selectedCourse?.id || 'ib_math_aa_sl';
    return `./data/${courseId}/questions/${filename}`;
  };

  // Load verified questions for the active topic when admin is signed in
  useEffect(() => {
    let ignore = false;
    if (!isAdmin || !selectedCourse?.id || !activeTopic?.topic_number) {
      setVerifiedQuestions(new Set());
      return;
    }

    getVerifiedQuestions(selectedCourse.id, activeTopic.topic_number)
      .then((items) => {
        if (!ignore) {
          const idSet = new Set(items.map((i) => i.questionId));
          setVerifiedQuestions(idSet);
        }
      })
      .catch((err) => {
        console.warn('Error fetching verified questions:', err);
      });

    return () => {
      ignore = true;
    };
  }, [isAdmin, selectedCourse?.id, activeTopic?.topic_number]);

  // Auto-redirect authenticated users from landing page to catalog; redirect unauthenticated users to landing
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (user && view === 'landing') {
      setView('catalog');
    } else if (!user && view !== 'landing') {
      setView('landing');
    }
  }, [user, view]);

  const handleTopicClick = (topic) => {
    setActiveTopic(topic);
    setModalOpen(true);
  };

  const handleVerifyQuestion = async () => {
    const q = sessionQuestions[currentIndex];
    if (!q || verifying) return;
    const qIdStr = String(q.id || q.original_number || q.number || '');
    if (!qIdStr) return;
    const courseId = selectedCourse?.id || 'ib_math_aa_sl';
    const topicId = activeTopic?.topic_number || 1;

    // Optimistic UI update
    setVerifiedQuestions((prev) => new Set([...prev, qIdStr]));
    setVerifying(true);

    try {
      await verifyQuestion({
        courseId,
        topicId,
        questionId: qIdStr,
        userId: resolveUserId(user)
      });
      showToast('Question marked as verified');
    } catch (err) {
      console.error('Failed to verify question:', err);
      // Revert optimistic update
      setVerifiedQuestions((prev) => {
        const next = new Set(prev);
        next.delete(qIdStr);
        return next;
      });
      showToast('Error marking question as verified');
    } finally {
      setVerifying(false);
    }
  };

  const handleUnverifyQuestion = async () => {
    const q = sessionQuestions[currentIndex];
    if (!q || verifying) return;
    const qIdStr = String(q.id || q.original_number || q.number || '');
    if (!qIdStr) return;
    const courseId = selectedCourse?.id || 'ib_math_aa_sl';
    const topicId = activeTopic?.topic_number || 1;

    // Optimistic UI update
    setVerifiedQuestions((prev) => {
      const next = new Set(prev);
      next.delete(qIdStr);
      return next;
    });
    setVerifying(true);

    try {
      await unverifyQuestion({
        courseId,
        topicId,
        questionId: qIdStr
      });
      showToast('Question unmarked as verified');
    } catch (err) {
      console.error('Failed to unverify question:', err);
      // Revert optimistic update
      setVerifiedQuestions((prev) => new Set([...prev, qIdStr]));
      showToast('Error unmarking question');
    } finally {
      setVerifying(false);
    }
  };

  const handleStartSession = async (questionCount) => {
    if (!activeTopic || !selectedCourse) return;
    try {
      const res = await fetch(`./data/${selectedCourse.id}/topic_${activeTopic.topic_number}.json`);
      const fullTopicData = await res.json();
      const sessionSet = generatePracticeSession(fullTopicData, questionCount);

      setSessionQuestions(sessionSet);
      setIsAuditMode(questionCount === 'all');
      setCurrentIndex(0);
      setModalOpen(false);
      setView('practice');
    } catch (err) {
      console.error("Error loading practice bundle:", err);
    }
  };

  const handleExitPractice = () => {
    setSessionQuestions([]);
    setIsAuditMode(false);
    setCurrentIndex(0);
    setView('catalog');
  };

  // 1. Landing View
  if (view === 'landing') {
    return (
      <>
        <LandingPage
          onExploreCourses={() => setView('catalog')}
          onOpenAuth={() => setAuthModalOpen(true)}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </>
    );
  }

  // 2. Course Catalog View
  if (view === 'catalog' && sessionQuestions.length === 0) {
    return (
      <div className="min-h-screen text-slate-100">
        {/* Navigation Bar */}
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('landing')}>
            <span className="text-xl">📐</span>
            <span className="text-base font-extrabold text-white tracking-tight">RR-EDU</span>
          </div>

          <div>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-300 font-medium bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
                  <span>👤 {user.attributes?.email || 'Student'}</span>
                  {isAdmin && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </span>
                <button onClick={signOut} className="text-xs font-semibold text-slate-400 hover:text-white">
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>

        {!selectedCourse ? (
          <CourseCatalog
            user={user}
            onSelectCourse={(course) => setSelectedCourse(course)}
            onBackToLanding={() => setView('landing')}
          />
        ) : (
          /* Topic Selection for Course */
          <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <button
                onClick={() => { setSelectedCourse(null); setTopics([]); }}
                className="text-xs font-semibold text-slate-400 hover:text-white"
              >
                ← All Courses
              </button>
              <span className="text-xs text-indigo-400 font-bold uppercase bg-indigo-500/10 px-3 py-1 rounded-full">
                {selectedCourse.title}
              </span>
            </div>

            {topics.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
                <p className="text-white font-semibold text-base">Course Content Under Preparation</p>
                <p className="text-slate-400 text-xs">No topics are currently available for {selectedCourse.title}. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {topics.map(t => (
                  <div key={t.topic_number} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/50 transition-all">
                    <div>
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md uppercase">
                        Topic {t.topic_number}
                      </span>
                      <h2 className="text-xl font-bold text-white mt-3 mb-1">{t.topic_name}</h2>
                      <p className="text-xs text-slate-400">{t.question_count} Skill Builder Questions</p>
                    </div>
                    <button
                      onClick={() => handleTopicClick(t)}
                      className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                    >
                      Select Practice Set →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {modalOpen && (
          <SessionLengthModal
            topic={activeTopic}
            isAdmin={isAdmin}
            onClose={() => setModalOpen(false)}
            onStartSession={handleStartSession}
          />
        )}

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </div>
    );
  }

  // 3. Practice Engine View
  const currentQ = sessionQuestions[currentIndex];

  return (
    <div className="min-h-screen flex flex-col text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handleExitPractice} className="text-slate-400 hover:text-white text-sm font-semibold">
            ← Topics
          </button>
          <div className="border-l border-slate-800 pl-3">
            <div className="text-xs text-slate-400 font-semibold uppercase">Topic {activeTopic?.topic_number}</div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>
                Question {currentIndex + 1} of {sessionQuestions.length}
              </span>
              {isAuditMode && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                  [Audit Mode]
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">
                👤 {user.attributes?.email}
              </span>
              {isAdmin && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              )}
            </div>
          ) : (
            <button onClick={() => setAuthModalOpen(true)} className="text-xs text-indigo-400 hover:underline font-semibold">
              Sign In
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-28 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                Question {currentIndex + 1}
              </span>
              {isAuditMode && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  Sequential Audit
                </span>
              )}

              {/* Admin Diagnostic Badge & Persistent Issue Reporting / Verify Workflow */}
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-[11px] font-mono text-amber-300 bg-amber-950/70 border border-amber-600/40 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm"
                    title="Underlying source identifiers and diagram metadata from parsed JSON bundle"
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/80 bg-amber-500/15 px-1 rounded">Admin</span>
                    <span>[Original: #{currentQ?.id || currentQ?.original_number || currentQ?.number || 'unknown'}]</span>
                    {((currentQ?.diagram_url || currentQ?.diagram || currentQ?.image || currentQ?.diagram_file) || currentQ?.has_diagram) && (
                      <span className="text-amber-400/90 border-l border-amber-800/80 pl-1.5 font-sans text-[10px]">
                        Diagram: {(currentQ?.diagram_url || currentQ?.diagram || currentQ?.image || currentQ?.diagram_file)?.split('/')?.pop() || (currentQ?.has_diagram ? 'Yes' : 'None')}
                      </span>
                    )}
                  </span>

                  {!verifiedQuestions.has(String(currentQ?.id || currentQ?.original_number || currentQ?.number || '')) ? (
                    <>
                      <button
                        onClick={handleVerifyQuestion}
                        disabled={verifying}
                        className="text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-600/60 hover:border-emerald-400/80 px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Mark this question as verified (Admin only)"
                      >
                        <span>✓</span>
                        <span>Verify</span>
                      </button>

                      <button
                        onClick={() => setReportModalOpen(true)}
                        className="text-[11px] font-semibold text-rose-300 hover:text-rose-200 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-700/50 hover:border-rose-500/70 px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                        title="Report an issue with this question (Admin only)"
                      >
                        <span>⚠️</span>
                        <span>Report Issue</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/60 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                        <span>✓</span>
                        <span>Verified</span>
                      </span>
                      <button
                        onClick={handleUnverifyQuestion}
                        disabled={verifying}
                        className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 px-2 py-0.5 rounded-md transition-all cursor-pointer disabled:opacity-50"
                        title="Unmark as verified or re-flag this question"
                      >
                        Unverify
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {currentQ?.has_diagram && (
              <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                📐 Diagram Included
              </span>
            )}
          </div>

          <div className="text-lg font-medium text-white leading-relaxed">
            <MathText text={currentQ?.question_text} />
          </div>

          {(currentQ?.diagram_url || currentQ?.diagram || currentQ?.image || currentQ?.diagram_file) && (
            <div className="my-4 flex justify-center p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <img
                src={resolveDiagramUrl(currentQ.diagram_url || currentQ.diagram || currentQ.image || currentQ.diagram_file)}
                alt={`Diagram for Question ${currentIndex + 1}`}
                className="max-h-80 max-w-full rounded-lg object-contain"
              />
            </div>
          )}

          <div className="space-y-6 pt-2">
            {currentQ?.subparts.map((sp, idx) => {
              const subKey = `${currentQ.id}_sp_${idx}`;
              return (
                <SubpartCard
                  key={subKey}
                  sp={sp}
                  subKey={subKey}
                  resolveDiagramUrl={resolveDiagramUrl}
                  isAdmin={isAdmin}
                />
              );
            })}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-4 z-30">
        <div className="max-w-4xl mx-auto flex justify-between gap-3">
          <button
            disabled={currentIndex === 0}
            onClick={() => { setCurrentIndex(i => i - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex-1 py-3 px-4 bg-slate-800 border border-slate-700 disabled:opacity-30 text-slate-200 font-semibold text-sm rounded-xl"
          >
            ← Previous Question
          </button>
          <button
            disabled={currentIndex === sessionQuestions.length - 1}
            onClick={() => {
              if (user && currentQ) {
                saveQuestionAttempt({
                  userId: resolveUserId(user),
                  courseId: selectedCourse?.id || 'ib_math_aa_sl',
                  questionId: currentQ.id,
                  mode: 'self',
                  result: 'completed'
                });
              }
              setCurrentIndex(i => i + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex-1 py-3 px-4 bg-indigo-600 border border-indigo-500 disabled:opacity-30 text-white font-semibold text-sm rounded-xl shadow-lg"
          >
            Next Question →
          </button>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 border border-emerald-400 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span>✅</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Report Issue Modal */}
      <ReportIssueModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        courseId={selectedCourse?.id || 'ib_math_aa_sl'}
        topicId={activeTopic?.topic_number || 1}
        questionId={currentQ?.id || currentQ?.original_number || currentQ?.number || 'unknown'}
        userId={resolveUserId(user)}
        onSuccess={(msg) => showToast(msg)}
      />

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}