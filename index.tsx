
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("Entry point reached. Checking environment...");

// Global error listener to catch crashes during module evaluation
window.onerror = (message, source, lineno, colno, error) => {
  console.error("GLOBAL ERROR DETECTED:", { message, source, lineno, colno, error });
};

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("CRITICAL: Root element #root not found.");
} else {
  try {
    console.log("Starting React render...");
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("React mount requested.");
  } catch (error) {
    console.error("FAILED TO MOUNT REACT:", error);
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="background: #020617; color: white; height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; text-align: center; padding: 20px;">
          <div>
            <h1 style="color: #ef4444; font-size: 24px;">Application Initialization Error</h1>
            <p style="color: #94a3b8; margin-top: 10px;">The application failed to start. This is usually due to a missing environment variable or a network error.</p>
            <pre style="background: #0f172a; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: left; font-size: 12px; color: #f472b6; overflow-x: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
            <button onclick="window.location.reload()" style="background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin-top: 20px; font-weight: bold;">Retry Loading</button>
          </div>
        </div>
      `;
    }
  }
}
