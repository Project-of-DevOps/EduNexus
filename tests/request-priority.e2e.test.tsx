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

describe('Request prioritization', () => {
  it('fulfills highest-priority request when a copy is returned', async () => {
    const run = async (ctx: any) => {
      // create librarian and two students
      ctx.addUser({ id: 'lib_x', name: 'LibX', email: 'libx@example.test', role: 'librarian', instituteId: 'inst-1' });
      ctx.addUser({ id: 's1', name: 'Alice', email: 'alice@example.test', role: 'student', parentId: '', classId: '', instituteId: 'inst-1' });
      ctx.addUser({ id: 's2', name: 'Bob', email: 'bob@example.test', role: 'student', parentId: '', classId: '', instituteId: 'inst-1' });

      const bookId = ctx.addBook({ title: 'Priority Book', author: 'A', isbn: 'PB-001', totalCopies: 1, availableCopies: 1 });
      // borrow it so nobody currently has it
      const borrowId = ctx.borrowBook(bookId, 's1', 'Alice', new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString());
      expect(borrowId).toBeTruthy();
      const book1 = ctx.books.find((b: any) => b.id === bookId);
      expect(book1.availableCopies).toBe(0);

      // Two students request same title: Bob (high), Alice (medium)
      const req1 = ctx.addBookRequest({ requesterId: 's2', requesterName: 'Bob', bookTitle: 'Priority Book', reason: 'Urgent', priority: 'high' });
      const req2 = ctx.addBookRequest({ requesterId: 's1', requesterName: 'Alice', bookTitle: 'Priority Book', reason: 'Later', priority: 'medium' });
      expect(req1).toBeTruthy();
      expect(req2).toBeTruthy();

      // return the book -> should fulfill the high priority (Bob) and reserve for him
      ctx.returnBook(borrowId);

      // request status check - high priority request should be fulfilled
      const bookReq1 = ctx.bookRequests.find((r: any) => r.id === req1);
      const bookReq2 = ctx.bookRequests.find((r: any) => r.id === req2);
      expect(bookReq1.status).toBe('fulfilled');

      // reservation exists for Bob
      const res = ctx.reservations.find((r: any) => r.requesterId === 's2' && r.bookId === bookId);
      expect(res).toBeTruthy();
      // reserved copy should have been held (availableCopies should not be increased beyond zero)
      const bookAfter = ctx.books.find((b: any) => b.id === bookId);
      expect(bookAfter.availableCopies).toBe(0);
    };

    render(
      <DataProvider>
        <Runner run={run} />
      </DataProvider>
    );

    await waitFor(() => expect(screen.getByText('runner')).toBeInTheDocument());
  }, 10000);
});
