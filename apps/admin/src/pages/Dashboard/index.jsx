import React from 'react';

const Dashboard = () => {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Willkommen bei EATECH Admin!</p>
      <div className="card" style={{ marginTop: '2rem' }}>
        <h2>Quick Stats</h2>
        <p>Bestellungen heute: 0</p>
        <p>Umsatz heute: CHF 0.00</p>
        <p>Aktive Kunden: 0</p>
      </div>
    </div>
  );
};

export default Dashboard;
