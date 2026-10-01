import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { SetupWizard } from './SetupWizard';
import { Roster } from './Roster';
import { PrintCards } from './PrintCards';
import { Marketplace } from './Marketplace';
import { Catalog } from './Catalog';
import { Dashboard } from './Dashboard';
import { EReport } from './EReport';
import { Approvals } from './Approvals';
import { initDb, getSetting } from './db/store';
import { performHubSync } from './sync';
import { Button } from '@chalk/ui';
import '@chalk/ui/index.css';
import './App.css';

function Layout({ children }: { children: React.ReactNode }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await performHubSync();
      alert('Sync complete!');
      window.location.reload(); // Refresh to update all views
    } catch (e: any) {
      alert('Sync failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <nav className="no-print" style={{ width: '250px', background: '#f5f5f5', padding: '16px', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ margin: '0 0 24px 0' }}>Gyan Gullak Hub</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <li><Link to="/hub/dashboard" style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>Dashboard (Skills)</Link></li>
          <li><Link to="/hub/marketplace" style={{ textDecoration: 'none', color: '#333' }}>Marketplace</Link></li>
          <li><Link to="/hub/catalog" style={{ textDecoration: 'none', color: '#333' }}>Manage Catalog</Link></li>
          <li><Link to="/hub/roster" style={{ textDecoration: 'none', color: '#333' }}>Roster</Link></li>
          <li><Link to="/hub/print" style={{ textDecoration: 'none', color: '#333' }}>Print ID Cards</Link></li>
          <li><Link to="/hub/approvals" style={{ textDecoration: 'none', color: '#333' }}>Device Approvals</Link></li>
          <li><Link to="/hub/ereport" style={{ textDecoration: 'none', color: '#333' }}>e-Report (Parents)</Link></li>
        </ul>
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #ddd' }}>
          <Button onClick={handleSync} disabled={syncing} className={syncing ? 'ui-bg-gray-400' : 'ui-bg-blue-600'}>
            {syncing ? 'Syncing...' : 'Sync with Server'}
          </Button>
        </div>
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
          navigate('/hub/dashboard', { replace: true });
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
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="roster" element={<Roster />} />
            <Route path="print" element={<PrintCards />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="ereport" element={<EReport />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
}
