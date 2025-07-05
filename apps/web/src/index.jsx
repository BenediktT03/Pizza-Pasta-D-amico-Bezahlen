import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#FF6B6B' }}>🍔 EATECH</h1>
      <p>Willkommen bei EATECH - Bestellen Sie von Ihrem Lieblings-Foodtruck!</p>
      <div style={{ marginTop: '3rem' }}>
        <a 
          href="/admin" 
          style={{ 
            padding: '1rem 2rem', 
            background: '#FF6B6B', 
            color: 'white', 
            textDecoration: 'none',
            borderRadius: '8px'
          }}
        >
          Admin Login →
        </a>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
