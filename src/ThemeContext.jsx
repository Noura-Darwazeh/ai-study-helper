import { createContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export default ThemeContext;

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Get initial theme from localStorage or default to dark
    const saved = localStorage.getItem('theme');
    return saved || 'dark';
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const value = { theme, toggleTheme };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}