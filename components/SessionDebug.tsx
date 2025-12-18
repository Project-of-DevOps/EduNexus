import React, { useEffect, useState } from 'react';
import { supabase, getCurrentSession } from '../services/supabaseClient';

const SessionDebug: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [storageSnapshot, setStorageSnapshot] = useState<Record<string, string>>({});
  const [errorHint, setErrorHint] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const refreshAll = async () => {
      try {
        const s = await getCurrentSession();
        if (mounted) setSession(s);
        const u = await supabase.auth.getUser();
        if (mounted) setUserInfo(u?.data?.user ?? null);
        // snapshot of localStorage keys that look related
        const snapshot: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i) as string;
          if (key && (key.startsWith('sb-') || key.includes('edunexus') || key.includes('supabase'))) {
            snapshot[key] = localStorage.getItem(key) as string;
          }
        }
        if (mounted) setStorageSnapshot(snapshot);

        // provide hint when session missing
        if (!s) {
          setErrorHint('No active session. If you just signed up, check that the signup response included session tokens and that the server called setSession successfully. See Network / Console.');
        } else {
          setErrorHint(null);
        }
      } catch (e) {
        if (mounted) setErrorHint('Failed to inspect session: ' + String(e));
      }
    };

    refreshAll();

    const { data: listener } = supabase.auth.onAuthStateChange((event, payload) => {
      setLastEvent(event);
      refreshAll();
    });

    return () => {
      mounted = false;
      if (listener && listener.subscription && typeof listener.subscription.unsubscribe === 'function') {
        listener.subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <div style={{ position: 'fixed', right: 8, bottom: 8, zIndex: 9999, background: 'rgba(0,0,0,0.85)', color: 'white', padding: '10px', borderRadius: 8, maxWidth: 520, fontSize: 12 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>Session Debug</div>
        <div style={{ opacity: 0.8, fontSize: 11 }}>{lastEvent ?? 'no events'}</div>
      </div>

      <div style={{ maxHeight: 220, overflow: 'auto', marginBottom: 8 }}>
        <div style={{ marginBottom: 6, color: '#ffd6a5' }}><strong>Session</strong></div>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#d1fae5', marginBottom: 8 }}>{JSON.stringify(session, null, 2)}</pre>

        <div style={{ marginBottom: 6, color: '#ffd6a5' }}><strong>Supabase User</strong></div>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#c7d2fe', marginBottom: 8 }}>{JSON.stringify(userInfo, null, 2)}</pre>

        <div style={{ marginBottom: 6, color: '#ffd6a5' }}><strong>Local Storage Snapshot</strong></div>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#f0f0f0' }}>{Object.keys(storageSnapshot).length ? JSON.stringify(Object.fromEntries(Object.entries(storageSnapshot).map(([k, v]) => [k, v && v.length > 200 ? v.slice(0, 200) + '…' : v])), null, 2) : 'No supabase/edunexus keys in localStorage'}</pre>

        {errorHint && <div style={{ marginTop: 8, padding: 8, background: '#2b2b2b', borderRadius: 6, color: '#fecaca' }}>{errorHint}</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={async () => { await supabase.auth.signOut(); setSession(null); setUserInfo(null); }}>Sign out (clear)</button>
        <button onClick={async () => { const s = await getCurrentSession(); setSession(s); const u = await supabase.auth.getUser(); setUserInfo(u?.data?.user ?? null); }}>Refresh</button>
        <button onClick={() => { console.log('Session Debug Snapshot', { session, userInfo, storageSnapshot }); alert('Snapshot logged to console'); }}>Log to Console</button>
      </div>
    </div>
  );
};

export default SessionDebug;
