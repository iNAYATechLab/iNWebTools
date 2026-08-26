/**
 * Tests for Productivity & AI Components (Kanban, Timer, Markdown Notepad, QR & Explorer).
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { InteractiveTimer } from '../Productivity/InteractiveTimer';
import { KanbanBoard } from '../Productivity/KanbanBoard';
import { MarkdownNotepad } from '../Productivity/MarkdownNotepad';
import { ProductivityExplorer } from '../Productivity/ProductivityExplorer';
import { QrBarcodeRenderer } from '../Productivity/QrBarcodeRenderer';

describe('Productivity & AI Tools Client Suite', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders InteractiveTimer in pomodoro mode and switches tabs', () => {
    render(<InteractiveTimer initialMode="pomodoro" />);
    expect(screen.getByText('25:00')).toBeDefined();
    expect(screen.getByText('▶ Start Focus')).toBeDefined();

    const shortBreakTab = screen.getByText('☕ Short Break (5m)');
    fireEvent.click(shortBreakTab);
    expect(screen.getByText('05:00')).toBeDefined();
  });

  it('renders InteractiveTimer in stopwatch mode', () => {
    render(<InteractiveTimer initialMode="stopwatch" />);
    expect(screen.getByText('00:00')).toBeDefined();
    expect(screen.getByText('▶ Start Focus')).toBeDefined();
  });

  it('renders KanbanBoard and adds a new task', () => {
    render(<KanbanBoard />);
    expect(screen.getAllByText('📌 To Do').length).toBeGreaterThan(0);
    expect(screen.getAllByText('⚡ In Progress').length).toBeGreaterThan(0);
    expect(screen.getAllByText('✅ Completed').length).toBeGreaterThan(0);

    const addBtn = screen.getByRole('button', { name: /\+ Add Task/i });
    expect(addBtn).toBeDefined();
    fireEvent.click(addBtn);
  });

  it('renders MarkdownNotepad with side-by-side editor and live preview', () => {
    render(<MarkdownNotepad />);
    expect(screen.getByText('Markdown Source Editor')).toBeDefined();
    expect(screen.getByText('Formatted Live Preview')).toBeDefined();
    expect(screen.getByText('📋 Copy Markdown')).toBeDefined();
  });

  it('renders QrBarcodeRenderer for QR and Barcode generation', () => {
    render(<QrBarcodeRenderer type="qr" initialPayload="https://inwebtools.com" />);
    expect(screen.getByText('Vector QR Code Engine')).toBeDefined();
    expect(screen.getByText('📋 Copy SVG Markup')).toBeDefined();
  });

  it('renders ProductivityExplorer with 25 tools catalog', () => {
    render(
      <BrowserRouter>
        <ProductivityExplorer />
      </BrowserRouter>,
    );
    expect(screen.getByText(/AI Utilities, QR Engine & Productivity Tools/i)).toBeDefined();
    expect(screen.getByText(/25 Smart AI, QR & Time Engines/i)).toBeDefined();
  });
});
