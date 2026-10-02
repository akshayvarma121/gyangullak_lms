import { useState, useEffect } from 'react';
import { Button, Card } from '@chalk/ui';
import { supabase } from './supabase';

interface Device {
  id: string;
  kind: string;
  status: string;
  public_key: string;
  registered_at: string;
  teachers?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  students?: {
    first_name: string;
    class_name: string;
  };
}

export function Approvals() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      // Wait, device RLS policy says teachers can view devices for their students or themselves.
      // So they might only see their own hub, or they might see all student devices in their school.
      // Let's just fetch devices with status = 'pending'
      
      const { data, error } = await supabase
        .from('devices')
        .select(`
          id, kind, status, public_key, registered_at,
          teachers(first_name, last_name, email),
          students(first_name, class_name)
        `)
        .in('status', ['pending', 'active'])
        .order('registered_at', { ascending: false });

      if (error) throw error;
      setDevices(data as unknown as Device[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('devices')
        .update({ status: 'active' })
        .eq('id', deviceId);
        
      if (error) throw error;
      
      alert('Device approved!');
      loadDevices();
    } catch (err: any) {
      alert('Failed to approve: ' + err.message);
    }
  };

  const handleReject = async (deviceId: string) => {
    if (!window.confirm('Are you sure you want to reject this device?')) return;
    try {
      const { error } = await supabase
        .from('devices')
        .update({ status: 'revoked' })
        .eq('id', deviceId);
        
      if (error) throw error;
      
      alert('Device rejected!');
      loadDevices();
    } catch (err: any) {
      alert('Failed to reject: ' + err.message);
    }
  };

  return (
    <div className="ui-p-4 ui-flex-col ui-gap-4">
      <div className="ui-flex ui-justify-between ui-items-center">
        <h2 className="ui-text-2xl ui-font-bold">Device Approvals</h2>
        <Button onClick={loadDevices}>Refresh</Button>
      </div>
      
      {error && <div className="ui-text-red-600 ui-bg-red-50 ui-p-4 ui-rounded">{error}</div>}
      
      {loading ? (
        <p>Loading devices...</p>
      ) : (
        <div className="ui-flex-col ui-gap-4">
          {devices.length === 0 ? (
            <p className="ui-text-gray-500">No devices to manage.</p>
          ) : (
            devices.map(device => (
              <Card key={device.id} className="ui-flex ui-justify-between ui-items-center">
                <div>
                  <h3 className="ui-text-lg ui-font-bold">
                    {device.kind === 'hub' ? 'Teacher Hub' : 'Student App'}
                  </h3>
                  <div className="ui-text-gray-700">
                    {device.kind === 'hub' && device.teachers ? (
                      `Requested by: ${device.teachers.first_name} ${device.teachers.last_name} (${device.teachers.email})`
                    ) : device.kind === 'student' && device.students ? (
                      `Student: ${device.students.first_name} (${device.students.class_name})`
                    ) : (
                      'Unknown user'
                    )}
                  </div>
                  <div className="ui-text-xs ui-text-gray-500 ui-font-mono ui-mt-1">
                    Key: {device.public_key.substring(0, 16)}...
                  </div>
                  <div className="ui-text-xs ui-text-gray-500">
                    Requested on: {new Date(device.registered_at).toLocaleString()}
                  </div>
                </div>
                  <div className="ui-flex ui-gap-2">
                    {device.status === 'pending' ? (
                      <>
                        <Button onClick={() => handleApprove(device.id)} className="ui-bg-green-600">Approve</Button>
                        <Button onClick={() => handleReject(device.id)} className="ui-bg-red-600">Reject</Button>
                      </>
                    ) : (
                      <Button onClick={() => handleReject(device.id)} className="ui-bg-red-600">Revoke Access</Button>
                    )}
                  </div>
                </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
