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

describe('Librarian export formats', () => {
  it('can export books to XLSX, PDF and DOCX', async () => {
    const run = async (ctx: any) => {
      ctx.addUser({ id: 'lib_x', name: 'X', email: 'x@example.test', role: 'librarian', instituteId: 'inst-x' });
      const b1 = ctx.addBook({ title: 'Exp1', author: 'A', totalCopies: 2, availableCopies: 2 });
      const b2 = ctx.addBook({ title: 'Exp2', author: 'B', totalCopies: 1, availableCopies: 1 });

      const xlsx = ctx.exportBooksXLSX();
      expect(typeof xlsx).toBe('string');
      expect(xlsx.length).toBeGreaterThan(0);

      const pdf = ctx.exportBooksPDF();
      expect(pdf).toBeTruthy();
      expect((pdf as ArrayBuffer).byteLength).toBeGreaterThan(0);

      const docx = await ctx.exportBooksDOCX();
      expect(docx).toBeTruthy();
      expect((docx as ArrayBuffer).byteLength).toBeGreaterThan(0);

      // selected only
      const xlsxSel = ctx.exportBooksXLSX([b1]);
      expect(typeof xlsxSel).toBe('string');
      expect(xlsxSel.length).toBeGreaterThan(0);
    };

    render(
      <DataProvider>
        <Runner run={run} />
      </DataProvider>
    );

    await waitFor(() => expect(screen.getByText('runner')).toBeInTheDocument());
  }, 20000);
});
