import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { PrintCards } from '../PrintCards';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as store from '../db/store';
import { supabase } from '../supabase';
import { verifyQRToken, generateQRToken } from '@chalk/core/src/crypto/qr';
import { generateKeypair } from '@chalk/core/src/crypto/ed25519';

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: '123' } } })
    },
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('PrintCards', () => {
  let mockDb: any;
  let testKeys: any;

  beforeEach(async () => {
    mockDb = {
      select: vi.fn((query: string) => {
        if (query.includes('DISTINCT class_name')) return Promise.resolve([{ class_name: '8A' }]);
        return Promise.resolve([{ id: 'stu1', first_name: 'Rahul', class_name: '8A', roll_number: '101' }]);
      }),
    };
    vi.spyOn(store, 'initDb').mockResolvedValue(mockDb as any);
    testKeys = generateKeypair();
  });

  it('renders cards and qr code verifies correctly', async () => {
    const user = userEvent.setup();
    
    // Simulate server creating a valid signed token
    const validToken = generateQRToken({
      school_id: 'sch1',
      student_id: 'stu1',
      issued_at: '2024-01-01T00:00:00Z'
    }, testKeys.privateKey);

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        cards: [
          { student_id: 'stu1', qr_token: validToken, link_code: 'A3BC5' }
        ]
      },
      error: null
    });

    render(<PrintCards />);

    // Click issue
    const issueBtn = await screen.findByText(/Issue & View Cards/);
    await user.click(issueBtn);

    // Verify it renders
    await waitFor(() => {
      // @ts-expect-error type
      expect(screen.getByText('Rahul')).toBeInTheDocument();
      // @ts-expect-error type
      expect(screen.getByText('A3BC5')).toBeInTheDocument();
    });

    // Verify the QR token using core verifyQRToken
    // (In reality this is what the hub or student app does when scanning)
    const verified = await verifyQRToken(validToken, testKeys.publicKey);
    expect(verified).not.toBeNull();
    expect(verified!.student_id).toBe('stu1');
  });
});
