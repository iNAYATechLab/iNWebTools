import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import * as toolsApi from '../../services/toolsApi';
import { Home } from '../Home';

describe('Home Page (Mega-SaaS UI)', () => {
  beforeEach(() => {
    vi.spyOn(toolsApi, 'getToolsRegistry').mockResolvedValue({
      modules: [],
      total: 242,
      tools: [],
    } as any);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders hero headline, dynamic live counter badge, and global search trigger', () => {
    render(
      <MemoryRouter>
        <LocaleProvider>
          <Home />
        </LocaleProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/1,070\+ Free Online Web Tools/i)).toBeDefined();
    expect(screen.getByText(/242\+ Live Interactive Tools/i)).toBeDefined();
    expect(screen.getByText(/Ctrl/i)).toBeDefined();
  });

  it('renders top 12 trending tools ribbon', () => {
    render(
      <MemoryRouter>
        <LocaleProvider>
          <Home />
        </LocaleProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Audio to Text (Whisper ASR)')).toBeDefined();
    expect(screen.getByText('PDF to Word Converter')).toBeDefined();
    expect(screen.getByText('Background Remover')).toBeDefined();
    expect(screen.getByText('JSON to TypeScript & Schema')).toBeDefined();
  });

  it('renders FAQ section and platform highlights', () => {
    render(
      <MemoryRouter>
        <LocaleProvider>
          <Home />
        </LocaleProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Frequently Asked Questions/i)).toBeDefined();
    expect(screen.getByText(/Zero Data Retention & Privacy First/i)).toBeDefined();
  });
});
