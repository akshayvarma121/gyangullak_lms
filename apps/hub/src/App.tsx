import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { SetupWizard } from './SetupWizard';
import { Roster } from './Roster';
import { PrintCards } from './PrintCards';
import { initDb, getSetting } from './db/store';
import '@chalk/ui/index.css';
import './App.css';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <nav className="no-print" style={{ width: '250px', background: '#f5f5f5', padding: '16px', borderRight: '1px solid #ddd' }}>
        <h2 style={{ margin: '0 0 24px 0' }}>Gyan Gullak Hub</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <li><Link to="/hub/roster" style={{ textDecoration: 'none', color: '#333' }}>Roster</Link></li>
          <li><Link to="/hub/print" style={{ textDecoration: 'none', color: '#333' }}>Print ID Cards</Link></li>
          <li><Link to="/hub/approvals" style={{ textDecoration: 'none', color: '#333' }}>Device Approvals</Link></li>
        </ul>
      </nav>
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkSetup() {
      try {
        await initDb();
        const isComplete = await getSetting('setup_complete');
        if (isComplete !== 'true') {
          navigate('/setup', { replace: true });
        } else if (window.location.pathname === '/' || window.location.pathname === '/setup') {
          navigate('/hub/roster', { replace: true });
        }
      } catch (e) {
        console.error("DB Init failed", e);
      } finally {
        setLoading(false);
      }
    }
    checkSetup();
  }, [navigate]);

  if (loading) return <div className="ui-p-8">Loading...</div>;

  return (
    <Routes>
      <Route path="/setup" element={<SetupWizard />} />
      <Route path="/hub/*" element={
        <Layout>
          <Routes>
            <Route path="roster" element={<Roster />} />
            <Route path="print" element={<PrintCards />} />
            <Route path="approvals" element={<div className="ui-p-4"><h2>Pending Approvals (D-06)</h2></div>} />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
}
