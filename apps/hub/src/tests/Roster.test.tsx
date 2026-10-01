import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { Roster } from '../Roster';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as store from '../db/store';

describe('Roster', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockResolvedValue([]),
      execute: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(store, 'initDb').mockResolvedValue(mockDb as any);
  });

  it('rejects bad CSV rows and accepts good ones', async () => {
    const user = userEvent.setup();
    render(<Roster />);

    const fileInput = screen.getByLabelText('Import CSV');
    
    const csvContent = `first_name, class_name, roll_number
Rahul, 8A, 101
, 8A, 102
Priya, , 103
Amit, 8A, 
Rohan, 8A, 101
Sunil, 8B, 201`;
    
    const file = new File([csvContent], 'roster.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);

    // Wait for the errors to appear
    await waitFor(() => {
      // @ts-expect-error type
      expect(screen.getByText('Import Errors')).toBeInTheDocument();
    });

    // Check errors
    // @ts-expect-error type
    expect(screen.getByText('Row 3: Missing name')).toBeInTheDocument();
    // @ts-expect-error type
    expect(screen.getByText('Row 4: Missing class')).toBeInTheDocument();
    // @ts-expect-error type
    expect(screen.getByText('Row 5: Missing roll number')).toBeInTheDocument();
    // @ts-expect-error type
    expect(screen.getByText('Row 6: Duplicate roll number 101')).toBeInTheDocument();

    // Check DB inserts (Rahul and Sunil are good)
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.any(String),
      [expect.any(String), 'Rahul', '8A', '101']
    );
    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.any(String),
      [expect.any(String), 'Sunil', '8B', '201']
    );
  });
});
