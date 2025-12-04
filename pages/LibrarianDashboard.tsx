import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const LibrarianDashboard: React.FC = () => {
  const { user } = useAuth();
  const { books, addBook, updateBook, deleteBook, borrowRecords, borrowBook, returnBook, reservations, addReservation, cancelReservation, markBookDamaged, markBookLost, bookRequests, addBookRequest, updateBookRequestStatus, updateBookRequestPriority, fulfillRequestAndReserve, getNotificationsForEmail, addNotification, broadcastNotification, auditLogs, damageReports, getTopBorrowedReport, exportBooksCSV, importBooksFromCSV, bulkReserve, bulkFulfillRequests, bulkMarkLost, bulkMarkDamaged, bulkDeleteBooks } = useData();
  const email = user?.email || '';

  // Table & rows
  const initialRows = 10;
  const displayRows = Math.max(initialRows, books.length);

  // Search & filter
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all'|'title'|'student'|'date'|'overdue'|'soon'|'popular'>('all');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter(b => {
      if (filter === 'all') return (b.title || '').toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q) || (b.isbn || '').toLowerCase().includes(q);
      if (filter === 'title') return (b.title || '').toLowerCase().includes(q);
      if (filter === 'student') {
        // match borrower name for this book
        return borrowRecords.some(r => r.bookId === b.id && (r.borrowerName || '').toLowerCase().includes(q));
      }
      if (filter === 'date') {
        // match borrowedAt or dueAt values
        return borrowRecords.some(r => r.bookId === b.id && ((r.borrowedAt || '').toLowerCase().includes(q) || (r.dueAt || '').toLowerCase().includes(q)));
      }
      if (filter === 'overdue') {
        // include books that have at least one overdue borrow record
        const overdueBookIds = new Set(borrowRecords.filter(r => r.status === 'overdue').map(r => r.bookId));
        return overdueBookIds.has(b.id);
      }

      if (filter === 'soon') {
        const now = Date.now();
        const soonMs = 3 * 24 * 60 * 60 * 1000; // 3 days
        const soonBookIds = new Set(borrowRecords.filter(r => r.status === 'borrowed' && r.dueAt && (Date.parse(r.dueAt) - now) <= soonMs && (Date.parse(r.dueAt) - now) >= 0).map(r => r.bookId));
        return soonBookIds.has(b.id);
      }

      if (filter === 'popular') {
        const popular = getPopularBooks(20).map(b => b.id);
        return popular.includes(b.id);
      }
      return (b.title || '').toLowerCase().includes(q);
    });
  }, [books, query, filter]);

  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [exportedCSV, setExportedCSV] = useState('');
  const [csvImportText, setCsvImportText] = useState('');

  const handleAddBook = () => {
    if (!newBookTitle.trim()) return;
    addBook({ title: newBookTitle.trim(), author: newBookAuthor.trim(), totalCopies: 1, availableCopies: 1 });
    setNewBookTitle('');
    setNewBookAuthor('');
  };

  const [noteText, setNoteText] = useState('');
  const [announceTarget, setAnnounceTarget] = useState<'all'|'student'|'management'|'teacher'|'parent'>('all');

  const notifications = getNotificationsForEmail(email);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h3 className="text-lg font-bold mb-2">Librarian — {user?.name || ''}</h3>
          <p className="text-sm text-gray-600">Manage books, track borrow/return, and handle requests from students.</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <Input id="search" label="Search books" value={query} onChange={e => setQuery(e.target.value)} />
            <select className="p-2 rounded border" value={filter} onChange={e => setFilter(e.target.value as any)}>
              <option value="all">All</option>
              <option value="title">Title</option>
              <option value="student">Student</option>
              <option value="date">Date</option>
              <option value="overdue">Overdue</option>
              <option value="soon">Soon due</option>
              <option value="popular">Popular</option>
            </select>
          </div>
        </Card>
      </div>

      <Card>
        <h4 className="text-lg font-bold mb-2">Book Inventory (10 columns)</h4>
        <p className="text-sm text-gray-500 mb-3">Columns: Title, Author, ISBN, Publisher, Category, Total Copies, Available Copies, Borrower, Borrowed / Due</p>

        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-[rgb(var(--subtle-background-color))] text-left">
                <th className="p-2 border">Title</th>
                <th className="p-2 border">Author</th>
                <th className="p-2 border">ISBN</th>
                <th className="p-2 border">Publisher</th>
                <th className="p-2 border">Category</th>
                <th className="p-2 border">Total</th>
                <th className="p-2 border">Available</th>
                <th className="p-2 border">Borrower</th>
                <th className="p-2 border">Borrowed / Due</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 && Array.from({ length: displayRows }).map((_, i) => (
                <tr key={`empty-${i}`} className="odd:bg-white even:bg-[rgb(var(--subtle-background-color))]"><td className="p-2 border" colSpan={10}>&nbsp;</td></tr>
              ))}

              {results.map(book => {
                // find latest borrow for this book
                const rec = borrowRecords.find(r => r.bookId === book.id && r.status === 'borrowed');
                return (
                  <tr key={book.id} className="odd:bg-white even:bg-[rgb(var(--subtle-background-color))]">
                    <td className="p-2 border flex items-center gap-2"> 
                      <input type="checkbox" checked={selectedBookIds.includes(book.id)} onChange={e => setSelectedBookIds(prev => e.target.checked ? [...prev, book.id] : prev.filter(id => id !== book.id))} />
                      <div>{book.title}</div>
                    </td>
                    <td className="p-2 border">{book.author}</td>
                    <td className="p-2 border">{book.isbn}</td>
                    <td className="p-2 border">{book.publisher}</td>
                    <td className="p-2 border">{book.category}</td>
                    <td className="p-2 border">{book.totalCopies ?? 1}</td>
                    <td className="p-2 border">{book.availableCopies ?? 0}</td>
                    <td className="p-2 border">{rec ? rec.borrowerName : '-'}</td>
                    <td className="p-2 border">{rec ? `${new Date(rec.borrowedAt || '').toLocaleString()} / ${rec.dueAt ? new Date(rec.dueAt).toLocaleString() : '-'}` : '-'}</td>
                    <td className="p-2 border flex gap-2">
                      <Button onClick={() => { const id = borrowBook(book.id, 'student_local', 'Student Name'); if (!id) alert('No copies available'); }} variant="outline">Borrow</Button>
                      <Button onClick={() => { const r = borrowRecords.find(x => x.bookId === book.id && x.status === 'borrowed'); if (r) returnBook(r.id); }} variant="ghost">Return</Button>
                      <Button onClick={() => deleteBook(book.id)} variant="danger">Delete</Button>
                      <Button onClick={() => {
                        const reporterName = window.prompt('Your name (reporter)');
                        const note = window.prompt('Describe the damage');
                        if (!reporterName) return;
                        // mark damaged (will decrement availableCopies)
                        try { markBookDamaged(book.id, undefined, reporterName, note); } catch (e) { /* */ }
                      }} variant="danger">Report Damaged</Button>
                      <Button onClick={() => {
                        const reporterName = window.prompt('Your name (reporter)');
                        const note = window.prompt('Notes (optional)');
                        if (!reporterName) return;
                        try { markBookLost(book.id, undefined, reporterName, note); } catch (e) { /* */ }
                      }} variant="danger">Mark Lost</Button>
                      <Button onClick={() => {
                        // quick reserve prompt for student
                        const studentName = window.prompt('Student name (for reservation)');
                        const studentId = window.prompt('Student id (optional)');
                        if (!studentName) return;
                        addReservation({ bookId: book.id, bookTitle: book.title, requesterId: studentId || undefined, requesterName: studentName });
                      }} variant="outline">Reserve</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Input id="new-title" label="Title" value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)} />
          <Input id="new-author" label="Author" value={newBookAuthor} onChange={e => setNewBookAuthor(e.target.value)} />
          <div className="flex items-end">
            <Button className="w-full" onClick={handleAddBook}>Add Book</Button>
          </div>
        </div>
        <div className="mt-4 border-t pt-3 space-y-3">
          <div className="flex items-center gap-2">
            <Button onClick={() => { const csv = exportBooksCSV(); setExportedCSV(csv); }}>Export books CSV</Button>
            <Button onClick={() => {
              try {
                const base64 = exportBooksXLSX(selectedBookIds.length ? selectedBookIds : undefined);
                const href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
                const a = document.createElement('a');
                a.href = href;
                a.download = 'books.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
              } catch (e) { alert('Failed to export XLSX'); }
            }}>Export XLSX</Button>
            <Button onClick={() => {
              try {
                const ab = exportBooksPDF(selectedBookIds.length ? selectedBookIds : undefined);
                if (!ab) return alert('PDF generation failed');
                const blob = new Blob([ab], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'books.pdf';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              } catch (e) { alert('Failed to export PDF'); }
            }}>Export PDF</Button>
            <Button onClick={async () => {
              try {
                const buf = await exportBooksDOCX(selectedBookIds.length ? selectedBookIds : undefined);
                if (!buf) return alert('DOCX generation failed');
                const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'books.docx';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              } catch (e) { alert('Failed to export DOCX'); }
            }}>Export DOCX</Button>
            <Button onClick={() => { if (selectedBookIds.length === 0) return alert('Select some books first'); const ids = bulkReserve(selectedBookIds, undefined, 'Bulk Reserve'); alert(`Created ${ids.length} reservations`); }}>Bulk Reserve</Button>
            <Button onClick={() => { if (selectedBookIds.length === 0) return alert('Select some books first'); const reps = bulkMarkDamaged(selectedBookIds, undefined, user?.name || 'Librarian', 'Bulk damaged'); alert(`Marked ${reps.length} as damaged`); }}>Bulk Mark Damaged</Button>
            <Button onClick={() => { if (selectedBookIds.length === 0) return alert('Select some books first'); const reps = bulkMarkLost(selectedBookIds, undefined, user?.name || 'Librarian', 'Bulk lost'); alert(`Marked ${reps.length} as lost`); }}>Bulk Mark Lost</Button>
            <Button variant="danger" onClick={() => { if (selectedBookIds.length === 0) return alert('Select some books to delete'); if (!confirm('Delete selected books? This is destructive')) return; bulkDeleteBooks(selectedBookIds); setSelectedBookIds([]); }}>Bulk Delete</Button>
            <div className="flex-1" />
            <Button onClick={() => setSelectedBookIds([])}>Clear Selection</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">Export CSV (preview)</label>
              <textarea className="w-full p-2 border rounded h-24" value={exportedCSV} readOnly />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Import CSV</label>
              <textarea className="w-full p-2 border rounded h-24" value={csvImportText} onChange={e => setCsvImportText(e.target.value)} />
              <div className="mt-2 flex gap-2">
                <Button onClick={() => { const created = importBooksFromCSV(csvImportText); alert(`Created ${created.length} books`); setCsvImportText(''); }}>Import</Button>
                <Button variant="outline" onClick={() => { setCsvImportText('title,author,publisher,isbn,category,totalCopies,availableCopies,tags,createdAt\nExample Book,Author,Pub,12345,General,1,1,[],'); }}>Load Example</Button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Top borrowed</label>
              <div className="p-2 border rounded h-24 overflow-auto bg-white">
                {getTopBorrowedReport(10).length === 0 ? <div className="text-sm text-gray-500">No borrow history yet.</div> : (
                  <ol className="text-sm space-y-1">
                    {getTopBorrowedReport(10).map((r, idx) => (
                      <li key={r.book.id}>{idx + 1}. {r.book.title} — {r.count} borrows</li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h4 className="text-lg font-bold mb-2">Requests</h4>
          {bookRequests.length === 0 ? <p className="text-sm text-gray-500">No pending requests.</p> : (
            <div className="space-y-2">
              {bookRequests.map(r => (
                <div className="p-3 border rounded" key={r.id}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold">{r.bookTitle} {r.priority && <span className="text-xs ml-2 px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">{r.priority}</span>}</div>
                      <div className="text-xs text-gray-500">by {r.requesterName || 'Unknown'} • {new Date(r.createdAt || '').toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      {r.status === 'pending' && <select className="p-1 rounded border" value={(r.priority || 'medium')} onChange={e => updateBookRequestPriority(r.id, e.target.value as any)}>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>}
                      {r.status === 'pending' && <Button onClick={() => fulfillRequestAndReserve(r.id)}>Reserve & Fulfill</Button>}
                      {r.status === 'pending' && <Button variant="danger" onClick={() => updateBookRequestStatus(r.id, 'cancelled')}>Cancel</Button>}
                    </div>
                  </div>
                  {r.reason && <div className="mt-2 text-sm text-gray-700">{r.reason}</div>}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <h5 className="font-bold">New request (simulate student)</h5>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input id="req-name" label="Student name" value={''} onChange={() => {}} />
              <Input id="req-book" label="Book title" value={''} onChange={() => {}} />
              <div className="flex items-end">
                <Button onClick={() => addBookRequest({ requesterName: 'Student (sim)', bookTitle: 'Requested Book', reason: 'Requesting new book' })}>Create Request</Button>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <h5 className="font-bold">Reservations</h5>
            {reservations.length === 0 && <p className="text-sm text-gray-500">No reservations.</p>}
            <div className="space-y-2 mt-2">
              {reservations.map(r => (
                <div key={r.id} className="p-2 border rounded bg-white flex justify-between items-center">
                  <div>
                    <div className="text-sm font-bold">{r.bookTitle}</div>
                    <div className="text-xs text-gray-500">By {r.requesterName || 'Unknown'} • {new Date(r.reservedAt || '').toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    {r.status === 'active' && <Button onClick={() => { cancelReservation(r.id); }}>Cancel</Button>}
                    {r.status === 'notified' && <Button onClick={() => { /* nothing for now, librarian can mark fulfilled later */ }}>Mark Notified</Button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <h4 className="text-lg font-bold mb-2">Notifications</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <select className="w-full p-2 rounded border" value={announceTarget} onChange={e => setAnnounceTarget(e.target.value as any)}>
                <option value="all">All</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
                <option value="management">Management</option>
                <option value="parent">Parents</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea className="w-full p-2 border rounded" rows={3} value={noteText} onChange={e => setNoteText(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { if (!noteText.trim()) return; broadcastNotification(announceTarget === 'all' ? 'all' : (announceTarget as any), noteText.trim(), 'announcement', user?.id || 'librarian', { from: 'librarian' }); setNoteText(''); }}>Send Announcement</Button>
              <Button onClick={() => { if (!noteText.trim()) return; addNotification(email, noteText.trim()); setNoteText(''); }}>Save Message</Button>
            </div>

            <div className="mt-3">
              <h5 className="font-bold">Inbox</h5>
              {notifications.length === 0 && <p className="text-sm text-gray-500">No messages</p>}
              <div className="space-y-2 mt-2">
                {notifications.map(n => (
                  <div key={n.id} className="p-2 border rounded text-sm bg-white">
                    <div className="flex justify-between items-center">
                      <div>{n.message}</div>
                      <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <h5 className="font-bold">Audit Log</h5>
                {auditLogs.length === 0 && <p className="text-sm text-gray-500">No audit entries yet.</p>}
                <div className="space-y-2 mt-2">
                  {auditLogs.slice(0,10).map(a => (
                    <div key={a.id} className="p-2 border rounded text-sm bg-white">
                      <div className="flex justify-between items-center">
                        <div>{a.action} — {a.note || ''}</div>
                        <div className="text-xs text-gray-400">{new Date(a.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LibrarianDashboard;
