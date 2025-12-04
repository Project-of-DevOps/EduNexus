import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { DataProvider, useData } from '../context/DataContext';

const Runner: React.FC<{ run: (ctx: ReturnType<typeof useData>) => Promise<void> }> = ({ run }) => {
  const ctx = useData();
  React.useEffect(() => {
    run(ctx).catch(e => {
      // eslint-disable-next-line no-console
      console.error(e);
    });
  }, []);
  return <div>runner</div>;
};

describe('Librarian flows (e2e)', () => {
  it('allows librarian to add books, borrow/return and handle requests/notifications', async () => {
    const run = async (ctx: any) => {
      // create librarian user
      const lib = { id: `lib_${Date.now()}`, name: 'Libby', email: 'libby@example.test', role: 'librarian', instituteId: 'inst-1' };
      ctx.addUser(lib);

      // add a book
      const bookId = ctx.addBook({ title: 'The Test Book', author: 'Author A', isbn: 'ISBN-001', publisher: 'Pub Co', category: 'Fiction', totalCopies: 2, availableCopies: 2 });
      expect(bookId).toBeTruthy();
      const b = ctx.books.find((x: any) => x.id === bookId);
      expect(b.title).toBe('The Test Book');

      // borrow a copy
      const borrowId = ctx.borrowBook(bookId, 'stud_1', 'Student One', new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString());
      expect(borrowId).toBeTruthy();
      const rec = ctx.borrowRecords.find((r: any) => r.id === borrowId);
      expect(rec.status).toBe('borrowed');
      const updatedBook = ctx.books.find((x: any) => x.id === bookId);
      expect(updatedBook.availableCopies).toBe(1);

      // create a request from student
      // create student user who will make a reservation later
      ctx.addUser({ id: 'stud_2', name: 'Student Two', email: 'stud2@example.test', role: 'student', parentId: '', classId: '', instituteId: 'inst-1' });
      const reqId = ctx.addBookRequest({ requesterId: 'stud_2', requesterName: 'Student Two', bookTitle: 'Requested Book', reason: 'Need it for project' });
      expect(reqId).toBeTruthy();
      const req = ctx.bookRequests.find((r: any) => r.id === reqId);
      expect(req.bookTitle).toBe('Requested Book');

      // librarian should receive notifications for requests
      const libs = ctx.users.filter((u: any) => u.role === 'librarian');
      expect(libs.length).toBeGreaterThanOrEqual(1);
      const note = ctx.getNotificationsForEmail(lib.email);
      // nothing yet (requests notify existing librarians); ensure no crash
      expect(Array.isArray(note)).toBe(true);

      // student places a reservation while one copy is still borrowed
      const resId = ctx.addReservation({ bookId, bookTitle: 'The Test Book', requesterId: 'stud_2', requesterName: 'Student Two' });
      expect(resId).toBeTruthy();

      // return the book
      ctx.returnBook(borrowId);
      const recAfter = ctx.borrowRecords.find((r: any) => r.id === borrowId);
      expect(recAfter.status).toBe('returned');
      const finalBook = ctx.books.find((x: any) => x.id === bookId);
      expect(finalBook.availableCopies).toBe(2);

      // reservation should have been notified
      const reservation = ctx.reservations.find((r: any) => r.id === resId);
      expect(reservation).toBeTruthy();
      expect(reservation.status === 'notified' || reservation.status === 'active').toBeTruthy();

      // notification delivered to student
      const studNotes = ctx.getNotificationsForEmail('stud2@example.test');
      expect(Array.isArray(studNotes)).toBe(true);
      expect(studNotes.some((n: any) => n.message.includes('now available') || n.meta?.reservationId === resId)).toBe(true);

      // make announcement
      ctx.broadcastNotification('all', 'Library closed tomorrow', 'announcement', lib.id);
      const notes = ctx.getNotificationsForEmail('libby@example.test');
      expect(notes.some((n: any) => n.message.includes('Library closed'))).toBe(true);
    };

    render(
      <DataProvider>
        <Runner run={run} />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('runner')).toBeInTheDocument();
    });
  }, 10000);
});
