import React, { useState, useEffect } from 'react';
import MathText from './components/MathText';
import SubpartCard from './components/SubpartCard';
import SessionLengthModal from './components/SessionLengthModal';
import AuthModal from './components/AuthModal';
import LandingPage from './components/LandingPage';
import CourseCatalog from './components/CourseCatalog';
import { AuthProvider, useAuth } from './context/AuthContext';
import { generatePracticeSession } from './utils/quizUtils';
import { syncUserProfile, saveQuestionAttempt, resolveUserId } from './services/dbService';

function MainApp() {
  const { user, signOut } = useAuth();

  // Navigation State: 'landing' | 'catalog' | 'practice'
  const [view, setView] = useState('landing');
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [topics, setTopics] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Sync profile when signed in
  useEffect(() => {
    if (user) {
      syncUserProfile(user);
    }
  }, [user]);

  useEffect(() => {
    fetch('./data/topics.json')
      .then(res => res.json())
      .then(data => setTopics(data))
      .catch(err => console.error("Error loading topics.json:", err));
  }, []);

  // Auto-redirect authenticated users from landing page to catalog; redirect unauthenticated users to landing
  useEffect(() => {
    if (user && view === 'landing') {
      setView('catalog');
    } else if (!user && view !== 'landing') {
      setView('landing');
    }
  }, [user]);

  const handleTopicClick = (topic) => {
    setActiveTopic(topic);
    setModalOpen(true);
  };

  const handleStartSession = async (questionCount) => {
    if (!activeTopic) return;
    try {
      const res = await fetch(`./data/topic_${activeTopic.topic_number}.json`);
      const fullTopicData = await res.json();
      const randomizedSet = generatePracticeSession(fullTopicData, questionCount);

      setSessionQuestions(randomizedSet);
      setCurrentIndex(0);
      setModalOpen(false);
      setView('practice');
    } catch (err) {
      console.error("Error loading practice bundle:", err);
    }
  };

  const handleExitPractice = () => {
    setSessionQuestions([]);
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
                <span className="text-xs text-slate-300 font-medium bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                  👤 {user.attributes?.email || 'Student'}
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
            onSelectCourse={(course) => setSelectedCourse(course)}
            onBackToLanding={() => setView('landing')}
          />
        ) : (
          /* Topic Selection for Course */
          <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <button
                onClick={() => setSelectedCourse(null)}
                className="text-xs font-semibold text-slate-400 hover:text-white"
              >
                ← All Courses
              </button>
              <span className="text-xs text-indigo-400 font-bold uppercase bg-indigo-500/10 px-3 py-1 rounded-full">
                {selectedCourse.title}
              </span>
            </div>

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
          </div>
        )}

        {modalOpen && (
          <SessionLengthModal
            topic={activeTopic}
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
            <div className="text-sm font-bold text-white">
              Question {currentIndex + 1} of {sessionQuestions.length}
            </div>
          </div>
        </div>

        <div>
          {user ? (
            <span className="text-xs text-slate-400 font-mono">
              👤 {user.attributes?.email}
            </span>
          ) : (
            <button onClick={() => setAuthModalOpen(true)} className="text-xs text-indigo-400 hover:underline font-semibold">
              Sign In
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-28 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
              Question {currentIndex + 1}
            </span>
            {currentQ?.has_diagram && (
              <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                📐 Diagram Included
              </span>
            )}
          </div>

          <div className="text-lg font-medium text-white leading-relaxed">
            <MathText text={currentQ?.question_text} />
          </div>

          <div className="space-y-6 pt-2">
            {currentQ?.subparts.map((sp, idx) => {
              const subKey = `${currentQ.id}_sp_${idx}`;
              return <SubpartCard key={subKey} sp={sp} subKey={subKey} />;
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