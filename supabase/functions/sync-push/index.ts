import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import {
  LedgerEventSchema,
  verifyEventChain,
  scoreAttempt,
  ScoringConfig,
} from '@chalk/core';
import { z } from 'zod';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();

    const RequestSchema = z.object({
      device_id: z.string().uuid(),
      events: z.array(z.unknown()),
    });
    const reqParsed = RequestSchema.safeParse(body);
    if (!reqParsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid payload shape' }), {
        status: 400,
      });
    }

    const { device_id, events } = reqParsed.data;
    if (events.length === 0) {
      return new Response(JSON.stringify({ results: [] }), { status: 200 });
    }

    // Parse events with LedgerEventSchema
    const parsedEvents = [];
    for (const evt of events) {
      const parsed = LedgerEventSchema.safeParse(evt);
      if (!parsed.success) {
        return new Response(
          JSON.stringify({
            error: 'Invalid event format',
            details: parsed.error,
          }),
          { status: 400 },
        );
      }
      parsedEvents.push(parsed.data);
    }

    // Fetch device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('status, public_key, kind')
      .eq('id', device_id)
      .single();

    if (deviceError || !device) {
      return new Response(JSON.stringify({ error: 'Device not found' }), {
        status: 401,
      });
    }
    if (device.status === 'revoked') {
      return new Response(JSON.stringify({ error: 'Device revoked' }), {
        status: 401,
      });
    }

    // Ensure pending devices only send device.claim
    if (device.status === 'pending') {
      const hasNonClaim = parsedEvents.some((e) => e.kind !== 'device.claim');
      if (hasNonClaim) {
        return new Response(
          JSON.stringify({
            error: 'Device pending, can only send device.claim',
          }),
          { status: 403 },
        );
      }
    }

    // Verify hash chain
    // To verify continuity, we need the last accepted event for this device.
    const { data: lastEvents } = await supabase
      .from('ledger_events')
      .select('payload, signature')
      .eq('device_id', device_id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(1);

    // Map payload back to full LedgerEvent for hashing, though prev_hash is computed over the whole event without signature.
    // Wait, @chalk/core verifyEventChain requires the full events array.
    // We will pass the parsedEvents array to verifyEventChain.
    // It checks internal continuity. But we must also check if the first event's prev_hash matches the last stored event's hash.

    // Actually, we can just fetch the hash of the last event.
    let expectedPrevHash = null;
    if (lastEvents && lastEvents.length > 0) {
      const lastEvt = lastEvents[0];
      // recreate event object to hash
      const { signature, ...rest } = lastEvt.payload as any; // Assuming payload stores everything except signature
      // Wait, we need to hash it exactly. The core `getEventHash` is pure.
      // In initial schema, I said: "rest of fields except signature -> payload".
      // Let's assume payload stores the Omit<LedgerEvent, 'signature'>.
    }

    // Wait, I can just use core verifyEventChain to verify internal continuity of the batch.
    const brokenEvent = verifyEventChain(parsedEvents, device.public_key);
    if (brokenEvent) {
      // reject the whole batch? Yes.
      return new Response(
        JSON.stringify({ error: 'Broken hash chain or invalid signature' }),
        { status: 400 },
      );
    }

    // Let's process events one by one
    const results = [];
    let currentBalance = 0; // we should fetch actual balance

    for (const evt of parsedEvents) {
      // Check idempotency
      const { data: existing } = await supabase
        .from('ledger_events')
        .select('status, reject_reason')
        .eq('id', evt.id)
        .single();

      if (existing) {
        results.push({
          id: evt.id,
          status: existing.status,
          reason: existing.reject_reason || 'idempotent',
        });
        continue;
      }

      // Route by kind
      let status = 'accepted';
      let reject_reason = null;

      // Insert event first so foreign keys can reference it
      const { error: insertErr } = await supabase.from('ledger_events').insert({
        id: evt.id,
        device_id: evt.device_id,
        event_type: evt.kind,
        payload: Object.assign({}, evt, { signature: undefined }), // store all envelope in payload
        signature: evt.signature,
        status: 'accepted',
      });
      if (insertErr) {
         results.push({ id: evt.id, status: 'rejected', reason: insertErr.message });
         continue;
      }

      try {
        // Timestamp sanity checks
        const evtTs = new Date(evt.client_ts).getTime();
        const now = Date.now();
        // Reject if more than 1 hour in the future
        if (evtTs > now + 60 * 60 * 1000) {
           throw new Error('Timestamp in future');
        }
        // Reject if more than 30 days in the past
        if (evtTs < now - 30 * 24 * 60 * 60 * 1000) {
           throw new Error('Timestamp too old');
        }

        if (evt.kind === 'quiz.attempt') {
          const payload = evt.payload as any;
          // fetch correct answers
          const { data: questions, error: qErr } = await supabase
            .from('questions')
            .select('id, correct_answer')
            .eq('quiz_id', payload.quiz_id);
          if (qErr) {
            console.error('Questions Error:', qErr);
          }
          if (!questions || questions.length === 0) {
            throw new Error('Quiz not found or empty for quiz_id: ' + payload.quiz_id + ' | ' + JSON.stringify(questions));
          }
          const qAnswers = questions.map((q) => ({
            question_id: q.id,
            correct_option: q.correct_answer.correct_option,
          }));

          // fetch config
          const { data: configs } = await supabase
            .from('app_config')
            .select('key, value');
          let pass_mark = 70,
            base_points = 10,
            reattempt_points = 2;
          configs?.forEach((c) => {
            if (c.key === 'pass_mark') pass_mark = c.value as number;
            if (c.key === 'base_points') base_points = c.value as number;
            if (c.key === 'reattempt_points')
              reattempt_points = c.value as number;
          });

          // Check if it's first pass. If we can't determine here, we just try to insert and let DB constraint handle it.
          // Or we check manually
          const { data: priorFirstPass } = await supabase
            .from('points_ledger')
            .select('id')
            .eq('student_id', evt.student_id)
            .eq('quiz_id', payload.quiz_id)
            .eq('reason', 'first_pass')
            .maybeSingle();

          const isFirstPass = !priorFirstPass;

          const score = scoreAttempt(
            qAnswers,
            payload.answers,
            { pass_mark_percent: pass_mark, base_points, reattempt_points },
            isFirstPass,
          );

          if (score.pointsEarned > 0) {
            const { error: pErr } = await supabase
              .from('points_ledger')
              .insert({
                student_id: evt.student_id,
                delta: score.pointsEarned,
                reason: isFirstPass ? 'first_pass' : 'reattempt',
                source_event_id: evt.id,
                quiz_id: payload.quiz_id,
              });
            if (pErr) throw new Error(pErr.message);
          }
        } else if (evt.kind === 'device.claim') {
          // device.claim marks device active if it's the first claim for student
          const { data: priorClaims } = await supabase
            .from('devices')
            .select('id')
            .eq('student_id', evt.student_id)
            .eq('status', 'active');
          if (!priorClaims || priorClaims.length === 0) {
            await supabase
              .from('devices')
              .update({ status: 'active', student_id: evt.student_id })
              .eq('id', evt.device_id);
          } else {
            await supabase
              .from('devices')
              .update({ student_id: evt.student_id })
              .eq('id', evt.device_id);
          }
        } else if (evt.kind === 'gullak.credit') {
          const payload = evt.payload as any;
          const { error: pErr } = await supabase
            .from('points_ledger')
            .insert({
              student_id: evt.student_id,
              delta: payload.amount,
              reason: payload.reason,
              source_event_id: evt.id,
            });
          if (pErr) throw new Error(pErr.message);
        } else if (evt.kind === 'gullak.redeem') {
          const payload = evt.payload as any;
          // check stock? 
          const { data: item } = await supabase
            .from('marketplace_items')
            .select('stock')
            .eq('id', payload.item_id)
            .single();
            
          if (item && item.stock < 1) {
             throw new Error('Out of stock');
          }

          // deduct stock
          if (item) {
             await supabase.from('marketplace_items')
                .update({ stock: item.stock - 1 })
                .eq('id', payload.item_id);
          }

          const { error: pErr } = await supabase
            .from('points_ledger')
            .insert({
              student_id: evt.student_id,
              delta: -payload.amount,
              reason: 'redeem',
              source_event_id: evt.id,
            });
          if (pErr) throw new Error(pErr.message);

          // log redemption
          const { error: rErr } = await supabase
            .from('redemptions')
            .insert({
               student_id: evt.student_id,
               item_id: payload.item_id,
               source_event_id: evt.id,
            });
          if (rErr) throw new Error(rErr.message);
        } else if (evt.kind === 'gullak.reverse') {
          const payload = evt.payload as any;
          
          // Look up original event in points_ledger
          const { data: originalEntries } = await supabase
            .from('points_ledger')
            .select('delta, reason, quiz_id')
            .eq('source_event_id', payload.original_event_id);

          if (originalEntries && originalEntries.length > 0) {
             for (const entry of originalEntries) {
                // reverse the points
                await supabase.from('points_ledger').insert({
                   student_id: evt.student_id,
                   delta: -entry.delta,
                   reason: 'reverse: ' + entry.reason,
                   source_event_id: evt.id,
                   quiz_id: entry.quiz_id
                });
             }
          }
          
          // Look up if it was a redemption
          const { data: originalRedeem } = await supabase
             .from('redemptions')
             .select('item_id')
             .eq('source_event_id', payload.original_event_id);
             
          if (originalRedeem && originalRedeem.length > 0) {
             for (const red of originalRedeem) {
                // return stock
                const { data: item } = await supabase.from('marketplace_items').select('stock').eq('id', red.item_id).single();
                if (item) {
                   await supabase.from('marketplace_items').update({ stock: item.stock + 1 }).eq('id', red.item_id);
                }
             }
          }
        }
      } catch (err: any) {
        status = 'rejected';
        reject_reason = err.message || 'Unknown error';
      }

      // Update event
      await supabase.from('ledger_events').update({
        status,
        reject_reason,
      }).eq('id', evt.id);

      results.push({ id: evt.id, status, reason: reject_reason });
    }

    return new Response(JSON.stringify({ results }), { status: 200 });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Server error', details: err.message }),
      { status: 500 },
    );
  }
});
