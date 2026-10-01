import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ResultsScreen } from '../ResultsScreen';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '../i18n/Context';
import { Preferences } from '@capacitor/preferences';
import { dbStore } from '../db/store';

vi.mock('../db/store', () => ({
  dbStore: {
    getLastEvent: vi.fn().mockResolvedValue(null),
    appendEvent: vi.fn().mockResolvedValue(undefined),
  }
}));

describe('ResultsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Preferences.get as any).mockImplementation(({ key }: { key: string }) => {
      if (key === 'student_id') return Promise.resolve({ value: 'student123' });
      if (key === 'device_key') return Promise.resolve({ value: '1234567890123456789012345678901234567890123456789012345678901234' }); // 32 bytes hex
      if (key === 'device_id') return Promise.resolve({ value: 'dev123' });
      return Promise.resolve({ value: null });
    });
  });

  it('computes score and appends event to ledger', async () => {
    // Send 100% correct answers
    const answers = {
      'q-8-a-1': '1', // correct is 1
      'q-8-a-2': '1', // correct is 1
    };

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={[{ pathname: '/results/ch-8-math-algebra', state: { answers } }]}>
          <Routes>
            <Route path="/results/:chapterId" element={<ResultsScreen />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    // Wait for calculations
    await waitFor(() => {
      expect(screen.getByText('13%')).toBeInTheDocument();
    });

    expect(screen.getByText('प्रयास करते रहें!')).toBeInTheDocument();
    expect(screen.getByText('0 अंक (लंबित)')).toBeInTheDocument();
    expect(screen.getByText('रैखिक समीकरण हल करें')).toBeInTheDocument();

    // Check if event was stored
    expect(dbStore.appendEvent).toHaveBeenCalledTimes(1);
    const event = (dbStore.appendEvent as any).mock.calls[0][0];
    expect(event.kind).toBe('quiz.attempt');
    expect(event.payload.quiz_id).toBe('ch-8-math-algebra');
    expect(event.payload.answers).toEqual(answers);
    expect(event.signature).toBeTruthy();
  });
});
