import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { generateQRToken, generateLinkCode } from '@chalk/core';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Authenticate teacher
  const authHeader = req.headers.get('Authorization')!;
  if (!authHeader) return new Response('Missing Auth', { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    const { class_id } = body;

    // Verify teacher belongs to the same school as the class
    const { data: teacher } = await supabase
      .from('teachers')
      .select('school_id')
      .eq('id', user.id)
      .single();
    if (!teacher)
      return new Response('Teacher profile not found', { status: 403 });

    const { data: classData } = await supabase
      .from('classes')
      .select('school_id')
      .eq('id', class_id)
      .single();
    if (!classData || classData.school_id !== teacher.school_id) {
      return new Response('Class not found or unauthorized', { status: 403 });
    }

    const { data: students } = await supabase
      .from('students')
      .select('id, first_name')
      .eq('class_id', class_id);

    // In a real scenario, the school private key would be stored securely (e.g., Supabase Vault or env)
    // Here we assume it's passed or stored in env for signing
    const schoolPrivateKeyHex =
      Deno.env.get('SCHOOL_PRIVATE_KEY_HEX') ??
      '0000000000000000000000000000000000000000000000000000000000000000';

    const cards = students?.map((student) => {
      const issued_at = new Date().toISOString();

      const qrPayload = {
        school_id: teacher.school_id,
        student_id: student.id,
        issued_at,
      };

      const qrToken = generateQRToken(qrPayload, schoolPrivateKeyHex);

      // Link code generation requires a seed, e.g. hashing the token
      // A mock 4-byte seed for demonstration
      const seed = new Uint8Array([1, 2, 3, 4]);
      const linkCode = generateLinkCode(seed);

      return {
        student_id: student.id,
        first_name: student.first_name,
        qr_token: qrToken,
        link_code: linkCode,
      };
    });

    // Store the link code hashes if required by the system (D-06)
    // For now, returning to the caller.

    return new Response(JSON.stringify({ cards }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
});
