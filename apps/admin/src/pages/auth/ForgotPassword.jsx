import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setMessage('');
      setError('');
      setLoading(true);
      await resetPassword(email);
      setMessage('Überprüfen Sie Ihre E-Mails für weitere Anweisungen');
    } catch (error) {
      setError('Fehler beim Zurücksetzen des Passworts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '2rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Passwort zurücksetzen</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="email"
              placeholder="E-Mail Adresse"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p style={{ color: '#FF6B6B', marginBottom: '1rem' }}>{error}</p>}
          {message && <p style={{ color: '#4CAF50', marginBottom: '1rem' }}>{message}</p>}
          <button 
            type="submit" 
            className="btn" 
            style={{ width: '100%', marginBottom: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Wird gesendet...' : 'Passwort zurücksetzen'}
          </button>
          <p style={{ textAlign: 'center', color: '#888' }}>
            <Link to="/login">Zurück zur Anmeldung</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
