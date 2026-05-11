import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import { ThemeProvider } from './ThemeContext';
import { useTheme } from './useTheme';
import { ThemeToggle } from './ThemeToggle';

/* ── Read API key from environment variable ── */
const API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

/* ═══════════════════════════════════════════════════════════
   Analysis modes — each one sends a different system prompt
   ═══════════════════════════════════════════════════════════ */
const MODES = [
  {
    id: "summary",
    label: "Summarize",
    icon: "📝",
    badge: "summary",
    prompt:
      "You are an expert study assistant. Summarize the following text concisely while preserving all key ideas. Use clear, student-friendly language. Structure your response with a brief overview paragraph followed by the main points.",
  },
  {
    id: "keypoints",
    label: "Key Points",
    icon: "🎯",
    badge: "keypoints",
    prompt:
      "You are an expert study assistant. Extract the most important key points from the following text. Present them as a numbered list. Each point should be clear and self-contained. Add a brief explanation where needed.",
  },
  {
    id: "explain",
    label: "Explain Simply",
    icon: "💡",
    badge: "explain",
    prompt:
      "You are an expert teacher. Explain the following text in the simplest possible way, as if teaching a beginner. Use analogies, simple language, and real-world examples. Break down complex concepts step by step.",
  },
  {
    id: "quiz",
    label: "Generate Quiz",
    icon: "❓",
    badge: "quiz",
    prompt:
      "You are an expert educator. Based on the following text, create 5 quiz questions with 4 multiple-choice answers each. Mark the correct answer with ✅. Add a brief explanation for each correct answer. Format clearly.",
  },
  {
    id: "translate",
    label: "Translate AR",
    icon: "🌍",
    badge: "translate",
    prompt:
      "You are an expert translator. Translate the following text into Arabic. Maintain the original meaning, tone, and structure. Provide a natural, fluent translation — not a word-for-word translation.",
  },
];

/* ═══════════════════════════════════════════════════════════
   Custom hook for analysis
   ═══════════════════════════════════════════════════════════ */
function useAnalysis() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyzeText = useCallback(async (text, mode) => {
    if (!API_KEY || API_KEY === "paste-your-groq-key-here") {
      setError("API key not configured. Get your FREE key from https://console.groq.com/keys and add it to the .env file.");
      return;
    }
    if (!text.trim()) {
      setError("Please enter some text to analyze.");
      return;
    }

    setError("");
    setResult("");
    setLoading(true);

    const currentMode = MODES.find((m) => m.id === mode);

    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: currentMode.prompt },
            { role: "user", content: text },
          ],
          temperature: 0.5,
          max_tokens: 2048,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `API error ${res.status}: ${res.statusText}`;
        throw new Error(errMsg);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error("No response content received.");
      setResult(content);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, analyzeText, setError };
}

/* ═══════════════════════════════════════════════════════════
   Floating particles background
   ═══════════════════════════════════════════════════════════ */
function Particles() {
  const { theme } = useTheme();

  const [particles] = useState(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const colors = theme === 'dark' ? [
        "rgba(168,85,247,0.25)",
        "rgba(99,102,241,0.2)",
        "rgba(34,211,238,0.18)",
        "rgba(52,211,153,0.15)",
      ] : [
        "rgba(124,58,237,0.15)",
        "rgba(79,70,229,0.12)",
        "rgba(8,145,178,0.1)",
        "rgba(5,150,105,0.08)",
      ];

      return {
        id: i,
        size: Math.random() * 3 + 1.5,
        left: Math.random() * 100,
        color: colors[i % colors.length],
        duration: Math.random() * 18 + 14,
        delay: Math.random() * 12,
      };
    });
  });

  // Update colors when theme changes
  const currentColors = theme === 'dark' ? [
    "rgba(168,85,247,0.25)",
    "rgba(99,102,241,0.2)",
    "rgba(34,211,238,0.18)",
    "rgba(52,211,153,0.15)",
  ] : [
    "rgba(124,58,237,0.15)",
    "rgba(79,70,229,0.12)",
    "rgba(8,145,178,0.1)",
    "rgba(5,150,105,0.08)",
  ];

  return (
    <div className="particles">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="particle"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.left}%`,
            background: currentColors[particle.id % currentColors.length],
            boxShadow: `0 0 ${particle.size * 3}px ${currentColors[particle.id % currentColors.length]}`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Structured Quiz Component
   ═══════════════════════════════════════════════════════════ */
function QuizDisplay({ content }) {
  // Simple parsing for quiz format
  const lines = content.split('\n').filter(line => line.trim());
  const questions = [];
  let currentQuestion = null;

  lines.forEach(line => {
    if (line.match(/^\d+\./)) {
      if (currentQuestion) questions.push(currentQuestion);
      currentQuestion = { question: line, options: [], explanation: '' };
    } else if (line.match(/^[A-D]\./) || line.includes('✅')) {
      if (currentQuestion) currentQuestion.options.push(line);
    } else if (line.startsWith('Explanation:')) {
      if (currentQuestion) currentQuestion.explanation = line;
    }
  });
  if (currentQuestion) questions.push(currentQuestion);

  return (
    <div className="quiz-container">
      {questions.map((q, idx) => (
        <div key={idx} className="quiz-question">
          <h4>{q.question}</h4>
          <div className="quiz-options">
            {q.options.map((opt, i) => (
              <div key={i} className={`quiz-option ${opt.includes('✅') ? 'correct' : ''}`}>
                {opt}
              </div>
            ))}
          </div>
          {q.explanation && <p className="quiz-explanation">{q.explanation}</p>}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main App
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("summary");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  const { result, loading, error, analyzeText, setError } = useAnalysis();

  /* ── Handle analyze ── */
  const handleAnalyze = useCallback(() => {
    analyzeText(text, mode);
  }, [text, mode, analyzeText]);

  /* ── Copy result ── */
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  /* ── Keyboard shortcut ── */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleAnalyze();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleAnalyze]);

  /* ── Auto-resize textarea ── */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [text]);

  const charCount = text.length;
  const currentMode = MODES.find((m) => m.id === mode);

  return (
    <ThemeProvider>
      <Particles />

      <div className="app-container">
        <ThemeToggle />

        {/* ─── Header ─── */}
        <header className="app-header">
          <div className="header-badge">
            <span className="dot" />
            Powered by Groq + Llama 3.3
          </div>
          <h1 className="app-title">AI Study Helper</h1>
          <p className="app-subtitle">
            Paste any text and let AI summarize, extract key points, simplify,
            generate quizzes, or translate — instantly.
          </p>
        </header>

        {/* ─── Main Card ─── */}
        <div className="main-card">
          {/* ── Input Section ── */}
          <div className="input-section">
            <div className="panel-header">
              <span className="panel-label">
                <span className="icon">📄</span>
                Input Text
              </span>
              <span className="char-count">{charCount.toLocaleString()} chars</span>
            </div>

            <div className="text-input">
              <textarea
                ref={textareaRef}
                placeholder={"Paste your study material here...\n\nSupports articles, lecture notes, book excerpts, research papers, and more."}
                value={text}
                onChange={(e) => setText(e.target.value)}
                id="text-input"
                spellCheck={false}
              />
            </div>

            {/* ── Mode selector ── */}
            <div className="mode-selector" id="mode-selector">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  className={`mode-btn ${mode === m.id ? "active" : ""}`}
                  onClick={() => setMode(m.id)}
                  id={`mode-${m.id}`}
                >
                  <span className="mode-icon">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>

            {/* ── Analyze button ── */}
            <div className="analyze-section">
              <button
                className="analyze-btn"
                onClick={handleAnalyze}
                disabled={loading || !text.trim()}
                id="analyze-btn"
              >
                {loading ? (
                  <>
                    <span className="btn-icon">⏳</span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">✨</span>
                    Analyze Text
                    <span style={{ opacity: 0.5, fontSize: "0.78rem", fontWeight: 400 }}>
                      Ctrl + Enter
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Result Section ── */}
          <div className="result-section">
            <div className="panel-header">
              <span className="panel-label">
                <span className="icon">🤖</span>
                AI Analysis
                {result && (
                  <span className={`result-badge ${currentMode.badge}`}>
                    {currentMode.icon} {currentMode.label}
                  </span>
                )}
              </span>
              {result && (
                <button
                  className={`copy-btn ${copied ? "copied" : ""}`}
                  onClick={handleCopy}
                  id="copy-btn"
                >
                  {copied ? "✓ Copied" : "📋 Copy"}
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="error-box" id="error-box">
                <span className="err-icon">⚠️</span>
                <div className="error-content">
                  <span>{error}</span>
                  <button
                    className="retry-btn"
                    onClick={() => setError("")}
                    title="Dismiss error"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="loading-state">
                <div className="loading-orbs">
                  <div className="orb" />
                  <div className="orb" />
                  <div className="orb" />
                </div>
                <p className="loading-text">Thinking deeply...</p>
              </div>
            )}

            {/* Result */}
            {!loading && result && (
              <div className="result-content" id="result-content">
                {mode === 'quiz' ? (
                  <QuizDisplay content={result} />
                ) : (
                  <div className="result-text">{result}</div>
                )}
              </div>
            )}

            {/* Empty */}
            {!loading && !result && !error && (
              <div className="empty-state">
                <div className="empty-icon">🧠</div>
                <p className="empty-title">Results will appear here</p>
                <p className="empty-hint">
                  Paste text above, choose a mode, and hit Analyze.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Footer ─── */}
        <footer className="app-footer">
          Built with React & Groq AI · AI Study Helper
        </footer>
      </div>
    </ThemeProvider>
  );
}