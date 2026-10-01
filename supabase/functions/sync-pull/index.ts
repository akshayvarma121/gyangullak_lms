import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { device_id, cursor } = body;

    // In a real implementation, we would use the cursor to fetch only new records.
    // For now, we return standard data needed by the device.

    const { data: device } = await supabase
      .from('devices')
      .select('kind, student_id, teacher_id')
      .eq('id', device_id)
      .single();
    if (!device) return new Response('Unauthorized', { status: 401 });

    const isHub = device.kind === 'hub';

    // Get content version manifest
    const { data: contentVersions } = await supabase
      .from('content_versions')
      .select('*');

    let confirmed_balance = 0;
    let roster = [];
    let catalog = [];

    if (isHub) {
      // Teacher hub
      const { data: teacher } = await supabase
        .from('teachers')
        .select('school_id')
        .eq('id', device.teacher_id)
        .single();
      if (teacher) {
        const { data: students } = await supabase
          .from('students')
          .select('*')
          .eq('school_id', teacher.school_id);
          
        const balanceMap: Record<string, number> = {};
        if (students && students.length > 0) {
          const studentIds = students.map(s => s.id);
          const { data: allPoints } = await supabase.from('points_ledger').select('student_id, delta').in('student_id', studentIds);
          const { data: allRedeems } = await supabase.from('redemptions').select('student_id, marketplace_items(cost_points)').in('student_id', studentIds);
          
          for(const s of students) balanceMap[s.id] = 0;
          if(allPoints) allPoints.forEach(p => balanceMap[p.student_id] += p.delta);
          if(allRedeems) allRedeems.forEach(r => balanceMap[r.student_id] -= (r.marketplace_items as any).cost_points);
        }

        roster = students?.map(s => ({ ...s, confirmed_balance: balanceMap[s.id] || 0 })) || [];

        const { data: items } = await supabase
          .from('marketplace_items')
          .select('*')
          .eq('school_id', teacher.school_id);
        catalog = items || [];
        
        const { data: mastery } = await supabase
          .from('skill_mastery')
          .select('*');
        
        // Filter mastery to only students in this school
        const rosterIds = new Set(roster.map((s: any) => s.id));
        const skill_mastery = (mastery || []).filter((m: any) => rosterIds.has(m.student_id));
        
        const { data: skills } = await supabase.from('skills').select('id, name');
        
        // Fetch recent points history for drill-down (last 50 events for the school)
        const { data: recentPoints } = await supabase
          .from('points_ledger')
          .select('id, student_id, delta, reason, created_at')
          .in('student_id', Array.from(rosterIds))
          .order('created_at', { ascending: false })
          .limit(100);

        const { data: guardians } = await supabase
          .from('guardians')
          .select('id, student_id, phone_number, has_consent, consent_timestamp')
          .in('student_id', Array.from(rosterIds));

        return new Response(
          JSON.stringify({
            contentVersions: contentVersions || [],
            roster,
            catalog,
            skill_mastery,
            skills: skills || [],
            points_history: recentPoints || [],
            guardians: guardians || [],
            confirmed_balance,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
    } else {
      // Student app
      const { data: points } = await supabase
        .from('points_ledger')
        .select('delta')
        .eq('student_id', device.student_id);
      const { data: redemptions } = await supabase
        .from('redemptions')
        .select('marketplace_items(cost_points)')
        .eq('student_id', device.student_id);

      let earned = points ? points.reduce((acc, p) => acc + p.delta, 0) : 0;
      let spent = redemptions
        ? redemptions.reduce(
            (acc, r) => acc + (r.marketplace_items as any).cost_points,
            0,
          )
        : 0;

      confirmed_balance = earned - spent;
    }

    return new Response(
      JSON.stringify({
        contentVersions: contentVersions || [],
        roster,
        catalog,
        confirmed_balance,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
});
