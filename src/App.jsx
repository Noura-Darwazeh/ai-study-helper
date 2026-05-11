import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";

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
   Floating particles background
   ═══════════════════════════════════════════════════════════ */
function Particles() {
  const particles = Array.from({ length: 18 }, (_, i) => {
    const size = Math.random() * 3 + 1.5;
    const colors = [
      "rgba(168,85,247,0.25)",
      "rgba(99,102,241,0.2)",
      "rgba(34,211,238,0.18)",
      "rgba(52,211,153,0.15)",
    ];
    return (
      <div
        key={i}
        className="particle"
        style={{
          width: size,
          height: size,
          left: `${Math.random() * 100}%`,
          background: colors[i % colors.length],
          boxShadow: `0 0 ${size * 3}px ${colors[i % colors.length]}`,
          animationDuration: `${Math.random() * 18 + 14}s`,
          animationDelay: `${Math.random() * 12}s`,
        }}
      />
    );
  });
  return <div className="particles">{particles}</div>;
}

/* ═══════════════════════════════════════════════════════════
   Main App
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("summary");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  /* ── Call Groq API (free, fast, 30 req/min) ── */
  const handleAnalyze = useCallback(async () => {
    if (!API_KEY || API_KEY === "paste-your-groq-key-here") {
      setError("API key not configured. Get your FREE key from https://console.groq.com/keys and add it to the .env file.");
      return;
    }
    if (!text.trim()) {
      setError("Please paste some text to analyze.");
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
  }, [text, mode]);

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

  const charCount = text.length;
  const currentMode = MODES.find((m) => m.id === mode);

  return (
    <>
      <Particles />

      <div className="app-container">
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

        {/* ─── Main Grid ─── */}
        <div className="main-grid">
          {/* ── Left: Input panel ── */}
          <div className="glass-panel" id="input-panel">
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

          {/* ── Right: Result panel ── */}
          <div className="glass-panel" id="result-panel">
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
                <span>{error}</span>
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
                <div className="result-text">{result}</div>
              </div>
            )}

            {/* Empty */}
            {!loading && !result && !error && (
              <div className="empty-state">
                <div className="empty-icon">🧠</div>
                <p className="empty-title">Results will appear here</p>
                <p className="empty-hint">
                  Paste text on the left, choose a mode, and hit Analyze.
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
    </>
  );
}