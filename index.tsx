
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error listener to catch crashes before React mounts
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Critical Startup Error:", message, "at", source, lineno, ":", colno, error);
  // Optional: You could render a basic "Something went wrong" div here if the root is empty
};

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Fatal: #root element not found in DOM.");
} else {
  try {
    console.log("Mounting SpeakCoaching AI...");
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("React Mounting Failure:", error);
    rootElement.innerHTML = `
      <div style="background: #020617; color: white; height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; text-align: center; padding: 20px;">
        <div>
          <h1 style="color: #ef4444;">Application Failed to Load</h1>
          <p style="color: #94a3b8;">A critical error occurred during startup. Please check the browser console for details.</p>
          <button onclick="window.location.reload()" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-top: 20px;">Reload Application</button>
        </div>
      </div>
    `;
  }
}
