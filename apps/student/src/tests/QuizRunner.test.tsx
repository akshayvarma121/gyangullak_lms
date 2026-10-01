import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizRunner } from '../QuizRunner';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '../i18n/Context';
import { Preferences } from '@capacitor/preferences';

vi.mock('../db/store', () => ({
  dbStore: {
    getLastEvent: vi.fn().mockResolvedValue(null),
    appendEvent: vi.fn(),
  }
}));

describe('QuizRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quiz and allows progression', async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/quiz/ch-8-math-algebra']}>
          <Routes>
            <Route path="/quiz/:chapterId" element={<QuizRunner />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    // Initial render
    expect(await screen.findByText(/1 \/ /)).toBeInTheDocument();
    
    // Check if it saved state (called Preferences.set)
    expect(Preferences.set).toHaveBeenCalledWith(expect.objectContaining({
      key: 'quiz_state_ch-8-math-algebra'
    }));

    // Find the correct answer for the first question
    // First question is "Solve for x: x - 2 = 7"
    // The correct option is "9" which is option 1 in english text (index 1)
    const options = await screen.findAllByRole('button');
    // First option button is maybe variant="secondary", but let's just click the 2nd one (index 1)
    fireEvent.click(options[1]);

    // Should show explanation
    expect(await screen.findByText(/✓/)).toBeInTheDocument();

    // Click continue button (last button on the screen)
    const allButtons = await screen.findAllByRole('button');
    fireEvent.click(allButtons[allButtons.length - 1]);

    // Should move to next question
    expect(await screen.findByText(/2 \/ /)).toBeInTheDocument();
  });
});
