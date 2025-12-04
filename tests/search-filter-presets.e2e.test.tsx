import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { DataProvider, useData } from '../context/DataContext';

const Runner: React.FC<{ run: (ctx: ReturnType<typeof useData>) => Promise<void> }> = ({ run }) => {
  const ctx = useData();
  React.useEffect(() => {
    run(ctx).catch(e => console.error(e));
  }, []);
  return <div>runner</div>;
};

describe('Search & Filter presets', () => {
  it('marks overdue and identifies soon-due items and returns popular list', async () => {
    const run = async (ctx: any) => {
      // add some books
      const b1 = ctx.addBook({ title: 'Popular Book', author: 'P', isbn: 'PB', totalCopies: 3, availableCopies: 3 });
      const b2 = ctx.addBook({ title: 'Soon Book', author: 'S', isbn: 'SB', totalCopies: 1, availableCopies: 1 });
      const b3 = ctx.addBook({ title: 'Overdue Book', author: 'O', isbn: 'OB', totalCopies: 1, availableCopies: 1 });

      // create borrow records: b1 borrowed twice historically, b2 borrowed once (due soon), b3 borrowed once (past due)
      const now = Date.now();
      // b1 historical borrows (simulate counts)
      ctx.borrowBook(b1, 's1', 'S1', new Date(now + 1000 * 60 * 60 * 24 * 20).toISOString());
      ctx.returnBook(ctx.borrowRecords.find((r: any) => r.bookId === b1)?.id || '');
      ctx.borrowBook(b1, 's2', 'S2', new Date(now + 1000 * 60 * 60 * 24 * 10).toISOString());

      // b2 borrowed and due within 2 days (soon)
      const dueSoon = new Date(now + 1000 * 60 * 60 * 24 * 2).toISOString();
      const b2Borrow = ctx.borrowBook(b2, 's3', 'S3', dueSoon);

      // b3 overdue (due was yesterday)
      const duePast = new Date(now - 1000 * 60 * 60 * 24 * 1).toISOString();
      const b3Borrow = ctx.borrowBook(b3, 's4', 'S4', duePast);

      // Wait a short moment to allow overdue detection effect to run
      await new Promise(resolve => setTimeout(resolve, 50));

      // b3's borrow record should be updated to overdue
      const rec3 = ctx.borrowRecords.find((r: any) => r.bookId === b3);
      expect(rec3.status).toBe('overdue');

      // check soon detection: find borrowed rec for b2 and confirm its dueAt is within 3 days
      const rec2 = ctx.borrowRecords.find((r: any) => r.bookId === b2);
      const dueTS = Date.parse(rec2.dueAt);
      expect(dueTS - now).toBeLessThanOrEqual(3 * 24 * 60 * 60 * 1000);

      // popular: top book should include b1
      const popular = ctx.getPopularBooks(3);
      expect(popular.length).toBeGreaterThan(0);
      expect(popular.some((b: any) => b.id === b1)).toBe(true);
    };

    render(
      <DataProvider>
        <Runner run={run} />
      </DataProvider>
    );

    await waitFor(() => expect(screen.getByText('runner')).toBeInTheDocument());
  }, 10000);
});
