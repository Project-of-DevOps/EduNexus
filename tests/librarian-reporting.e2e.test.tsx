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

describe('Librarian reporting & bulk actions (e2e)', () => {
  it('produces a top-borrowed report, exports/imports CSV and supports bulk actions', async () => {
    const run = async (ctx: any) => {
      // create librarian
      const lib = { id: `lib_${Date.now()}`, name: 'Reporter', email: 'reporter@example.test', role: 'librarian', instituteId: 'inst-1' };
      ctx.addUser(lib);

      // add books and borrow them with different counts
      const b1 = ctx.addBook({ title: 'Alpha', author: 'A', totalCopies: 3, availableCopies: 3 });
      const b2 = ctx.addBook({ title: 'Beta', author: 'B', totalCopies: 3, availableCopies: 3 });
      const b3 = ctx.addBook({ title: 'Gamma', author: 'C', totalCopies: 3, availableCopies: 3 });

      // borrow Alpha 3 times, Beta 2 times, Gamma 1 time
      ctx.borrowBook(b1, 'stud_a', 'S A');
      ctx.borrowBook(b1, 'stud_b', 'S B');
      ctx.borrowBook(b1, 'stud_c', 'S C');
      ctx.borrowBook(b2, 'stud_x', 'S X');
      ctx.borrowBook(b2, 'stud_y', 'S Y');
      ctx.borrowBook(b3, 'stud_z', 'S Z');

      const report = ctx.getTopBorrowedReport(3);
      expect(Array.isArray(report)).toBe(true);
      expect(report.length).toBe(3);
      expect(report[0].book.title).toBe('Alpha');
      expect(report[0].count).toBeGreaterThanOrEqual(3);

      // export CSV -> ensure header and titles present
      const csv = ctx.exportBooksCSV();
      expect(typeof csv).toBe('string');
      expect(csv.includes('title')).toBe(true);
      expect(csv.includes('Alpha')).toBe(true);

      // import CSV - add two new books
      const incoming = `title,author,publisher,isbn,category,totalCopies,availableCopies,tags,createdAt\nNew One,New Author,Pub1,ISBNX,Other,2,2,[],2025-01-01T00:00:00Z\nSecond Book,Author Two,Pub2,ISBNY,Other,1,1,[],2025-01-02T00:00:00Z`;
      const createdIds = ctx.importBooksFromCSV(incoming);
      expect(Array.isArray(createdIds)).toBe(true);
      expect(createdIds.length).toBe(2);

      // bulk reserve the two new books
      const reserved = ctx.bulkReserve(createdIds, 'stud_bulk', 'Bulk Student');
      expect(Array.isArray(reserved)).toBe(true);
      expect(reserved.length).toBe(2);

      // create requests and then fulfill them in bulk
      const reqA = ctx.addBookRequest({ requesterId: 'req1', requesterName: 'Req 1', bookTitle: 'Alpha', reason: 'need' });
      const reqB = ctx.addBookRequest({ requesterId: 'req2', requesterName: 'Req 2', bookTitle: 'Alpha', reason: 'need too' });
      const fulfilled = ctx.bulkFulfillRequests([reqA, reqB]);
      expect(Array.isArray(fulfilled)).toBe(true);
      expect(fulfilled.length).toBeGreaterThanOrEqual(2);

      // bulk mark lost/damaged
      const lostReports = ctx.bulkMarkLost([b2], undefined, 'TestLib', 'reported lost');
      expect(lostReports.length).toBe(1);
      const dmgReports = ctx.bulkMarkDamaged([b3], undefined, 'TestLib', 'reported damaged');
      expect(dmgReports.length).toBe(1);

      // bulk delete newly added books
      ctx.bulkDeleteBooks(createdIds);
      createdIds.forEach((id: string) => expect(ctx.books.find((b: any) => b.id === id)).toBeUndefined());
    };

    render(
      <DataProvider>
        <Runner run={run} />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('runner')).toBeInTheDocument();
    });
  }, 15000);
});
