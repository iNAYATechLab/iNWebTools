import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ColorPickerWorkbench } from '../Design/ColorPickerWorkbench';
import { CssVisualPreview } from '../Design/CssVisualPreview';

describe('Design & CSS Interactive Components', () => {
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

  describe('CssVisualPreview Component', () => {
    it('renders live visual canvas and background modes', () => {
      render(
        <CssVisualPreview
          title="Gradient Visual Preview"
          cssStyle={{ background: 'linear-gradient(90deg, #3b82f6, #ec4899)' }}
          rawCss="background: linear-gradient(90deg, #3b82f6, #ec4899);"
        />,
      );

      expect(screen.getByText('Gradient Visual Preview')).toBeDefined();
      expect(screen.getByText('iNWebTools Design Box')).toBeDefined();
      expect(
        screen.getByText('background: linear-gradient(90deg, #3b82f6, #ec4899);'),
      ).toBeDefined();

      const lightBtn = screen.getByRole('button', { name: /☀️ Light/i });
      fireEvent.click(lightBtn);
      expect(screen.getByRole('button', { name: /☀️ Light/i })).toBeDefined();

      const copyBtn = screen.getByRole('button', { name: /📋 Copy CSS/i });
      fireEvent.click(copyBtn);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  describe('ColorPickerWorkbench Component', () => {
    it('renders color picker input, quick swatches, and contrast previews', () => {
      const onColorChange = vi.fn();
      render(
        <ColorPickerWorkbench
          initialHex="#3b82f6"
          onColorChange={onColorChange}
          showContrastScore={true}
        />,
      );

      expect(screen.getByText('Interactive Color Workbench')).toBeDefined();
      expect(screen.getByPlaceholderText('#3B82F6')).toBeDefined();
      expect(screen.getByText('On White Background:')).toBeDefined();
      expect(screen.getByText('On Dark Background:')).toBeDefined();

      const hexInput = screen.getByPlaceholderText('#3B82F6');
      fireEvent.change(hexInput, { target: { value: '#ff0055' } });
      expect(onColorChange).toHaveBeenCalledWith('#ff0055');
    });
  });
});
