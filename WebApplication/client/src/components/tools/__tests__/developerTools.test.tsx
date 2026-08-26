import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CodeEditor } from '../Developer/CodeEditor';

describe('Developer Tools Components', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('CodeEditor Component', () => {
    it('renders code editor with label, line count, and character count', () => {
      const code = 'const greeting = "Hello World";\nconsole.log(greeting);';
      render(
        <CodeEditor
          label="JavaScript Code"
          value={code}
          onChange={vi.fn()}
          language="javascript"
        />,
      );

      expect(screen.getByText('JavaScript Code')).toBeDefined();
      expect(screen.getByText('javascript')).toBeDefined();
      expect(screen.getByText(/2 lines/i)).toBeDefined();
      expect(screen.getByText(new RegExp(`${code.length} chars`, 'i'))).toBeDefined();
    });

    it('handles copy action and displays copied feedback', async () => {
      const code = 'curl -X POST https://api.inwebtools.com';
      render(<CodeEditor label="cURL Command" value={code} readOnly />);

      const copyBtn = screen.getByRole('button', { name: /Copy/i });
      expect(copyBtn).toBeDefined();
      fireEvent.click(copyBtn);

      expect(screen.getByText(/✓ Copied/i)).toBeDefined();
    });

    it('triggers clear and sample load callbacks', () => {
      const onChange = vi.fn();
      const onSampleLoad = vi.fn();
      render(
        <CodeEditor
          label="Input Code"
          value="const x = 10;"
          onChange={onChange}
          onSampleLoad={onSampleLoad}
        />,
      );

      const sampleBtn = screen.getByRole('button', { name: /Load Sample/i });
      fireEvent.click(sampleBtn);
      expect(onSampleLoad).toHaveBeenCalledTimes(1);

      const clearBtn = screen.getByRole('button', { name: /Clear/i });
      fireEvent.click(clearBtn);
      expect(onChange).toHaveBeenCalledWith('');
    });
  });
});
