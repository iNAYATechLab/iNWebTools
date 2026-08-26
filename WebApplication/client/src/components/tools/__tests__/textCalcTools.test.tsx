import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DiffViewer } from '../TextCalc/DiffViewer';
import { UnitConversionTable } from '../TextCalc/UnitConversionTable';

describe('Text & Calculator Components', () => {
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

  describe('DiffViewer Component', () => {
    it('renders side-by-side diff comparison boxes and line numbers', () => {
      const onCompare = vi.fn();
      render(
        <DiffViewer
          originalText="Line One\nLine Two"
          modifiedText="Line One\nLine Two Modified\nLine Three"
          onCompare={onCompare}
        />,
      );

      expect(screen.getByText('Original Text')).toBeDefined();
      expect(screen.getByText('Modified Text')).toBeDefined();
      expect(screen.getByText('Line-by-Line Comparison View')).toBeDefined();

      const runBtn = screen.getByRole('button', { name: /Re-evaluate Diff/i });
      fireEvent.click(runBtn);
      expect(onCompare).toHaveBeenCalled();
    });
  });

  describe('UnitConversionTable Component', () => {
    it('renders conversion scales with copy action', () => {
      const units = {
        meters: '100 m',
        kilometers: '0.1 km',
        feet: '328.084 ft',
      };

      render(<UnitConversionTable units={units} title="Length Scales" />);

      expect(screen.getByText('Length Scales')).toBeDefined();
      expect(screen.getByText('100 m')).toBeDefined();
      expect(screen.getByText('328.084 ft')).toBeDefined();
      expect(screen.getByText('3 Scales Calculated')).toBeDefined();
    });
  });
});
