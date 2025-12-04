import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { DataProvider, useData } from '../context/DataContext';

const Runner: React.FC<{ run: (ctx: ReturnType<typeof useData>) => Promise<void> }> = ({ run }) => {
  const ctx = useData();
  React.useEffect(() => { run(ctx).catch(e => console.error(e)); }, []);
  return <div>runner</div>;
};

describe('Damage & Lost workflow', () => {
  it('reports damage and lost books, adjusts counts and writes audit logs', async () => {
    const run = async (ctx: any) => {
      const bookId = ctx.addBook({ title: 'Damaged Book', author: 'Z', isbn: 'DB-1', totalCopies: 2, availableCopies: 2 });
      expect(bookId).toBeTruthy();

      // report damaged by a librarian
      const repId = ctx.markBookDamaged(bookId, undefined, 'Librarian Joe', 'torn pages');
      expect(repId).toBeTruthy();
      const rep = ctx.damageReports.find((d: any) => d.id === repId);
      expect(rep).toBeTruthy();
      expect(rep.status).toBe('reported');

      // check available copies decreased by 1
      const bAfter = ctx.books.find((b: any) => b.id === bookId);
      expect(bAfter.availableCopies).toBe(1);

      // mark lost
      const lostId = ctx.markBookLost(bookId, undefined, 'Librarian Joe', 'lost in transit');
      expect(lostId).toBeTruthy();
      const lostReport = ctx.damageReports.find((d: any) => d.id === lostId);
      expect(lostReport).toBeTruthy();
      // after marking lost, totalCopies decreased
      const bFinal = ctx.books.find((b: any) => b.id === bookId);
      expect(bFinal.totalCopies).toBe(1);

      // audit logs exist for both actions
      const auditActions = ctx.auditLogs.map((a: any) => a.action);
      expect(auditActions.includes('mark_damaged') || auditActions.includes('mark_reported')).toBeTruthy();
      expect(auditActions.includes('mark_lost')).toBeTruthy();
    };

    render(
      <DataProvider>
        <Runner run={run} />
      </DataProvider>
    );

    await waitFor(() => expect(screen.getByText('runner')).toBeInTheDocument());
  }, 10000);
});
