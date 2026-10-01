import React, { useState } from 'react';
import { generateKeypair } from '@chalk/core';
import { supabase } from './supabase';
import { setCredential } from './credentials';
import { setSetting } from './db/store';
import { Button, Card } from '@chalk/ui';
import { useNavigate } from 'react-router-dom';

export function SetupWizard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!data.session) throw new Error('No session returned');

      // Save token to OS credential store
      await setCredential('gyangullak_hub', 'jwt', JSON.stringify(data.session));

      // Fetch teacher profile to get school_id
      const { data: profile, error: profileError } = await supabase
        .from('teachers')
        .select('school_id')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw profileError;
      
      const schoolId = profile.school_id;
      await setSetting('school_id', schoolId);
      
      // Fetch school public key
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('public_key')
        .eq('id', schoolId)
        .single();
        
      if (schoolError) throw schoolError;
      await setSetting('public_key', school.public_key);

      // Generate device keypair for signing Hub events
      const { privateKey, publicKey } = generateKeypair();
      const deviceId = crypto.randomUUID();

      await supabase.from('devices').insert({
        id: deviceId,
        kind: 'hub',
        teacher_id: data.user.id,
        public_key: publicKey,
        status: 'active'
      });

      await setCredential('gyangullak_hub', 'device_id', deviceId);
      await setCredential('gyangullak_hub', 'device_private_key', privateKey);

      await setSetting('setup_complete', 'true');
      
      navigate('/hub');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ui-p-8" style={{ maxWidth: '400px', margin: '0 auto' }}>
      <Card>
        <h2>Teacher Setup</h2>
        <p>Sign in to configure the hub for your school. You need internet for this step.</p>
        
        <form onSubmit={handleLogin} className="ui-flex-col ui-gap-4">
          <div>
            <label>Email</label>
            <input 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '4px' }}
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label>Password</label>
            <input 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '4px' }}
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          {error && <div style={{ color: 'red' }}>{error}</div>}
          
          <Button type="submit" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
