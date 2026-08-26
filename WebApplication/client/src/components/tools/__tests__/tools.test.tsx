import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ToolControls } from '../DocumentImage/ToolControls';
import { ToolDropzone } from '../DocumentImage/ToolDropzone';
import { ToolPreview } from '../DocumentImage/ToolPreview';
import type { ToolDefinition } from '../../../types/tools';

const mockTool: ToolDefinition = {
  slug: 'csv-to-json',
  name: 'CSV to JSON Converter',
  tagline: 'Convert CSV to JSON format',
  module: 'document-pdf',
  categorySlug: 'developer-code-utilities',
  subcategorySlug: 'data-converters-parsers',
  icon: 'code',
  inputFormats: ['.csv', '.tsv'],
  outputFormats: ['.json'],
  defaultOutput: 'json',
  options: [
    {
      id: 'indent',
      label: 'Indentation',
      type: 'select',
      options: ['2 spaces', '4 spaces'],
      default: '2 spaces',
    },
    {
      id: 'quality',
      label: 'Quality Factor',
      type: 'slider',
      min: 10,
      max: 100,
      default: 80,
      unit: '%',
    },
    { id: 'includeHeaders', label: 'Include Headers', type: 'toggle', default: true },
  ],
};

describe('Document & Image Tool Components', () => {
  describe('ToolDropzone', () => {
    it('renders file upload dropzone and accepted formats', () => {
      const onFilesChange = vi.fn();
      render(
        <ToolDropzone
          acceptedFormats={['.pdf', '.docx']}
          files={[]}
          onFilesChange={onFilesChange}
        />,
      );

      expect(screen.getByText(/Click to upload/i)).toBeDefined();
      expect(screen.getByText(/Supports \.pdf, \.docx/i)).toBeDefined();
    });

    it('renders direct text input tab when supported', () => {
      const onRawTextChange = vi.fn();
      render(
        <ToolDropzone
          supportsTextInput={true}
          files={[]}
          onFilesChange={vi.fn()}
          rawText=""
          onRawTextChange={onRawTextChange}
        />,
      );

      const textTab = screen.getByRole('button', { name: /Direct Code \/ Text/i });
      expect(textTab).toBeDefined();
      fireEvent.click(textTab);

      const textarea = screen.getByPlaceholderText(/Paste your raw text/i);
      expect(textarea).toBeDefined();
    });
  });

  describe('ToolControls', () => {
    it('renders sliders, select options, and toggles', () => {
      const onChange = vi.fn();
      render(
        <ToolControls
          options={mockTool.options!}
          values={{ indent: '2 spaces', quality: 80, includeHeaders: true }}
          onChange={onChange}
        />,
      );

      expect(screen.getByText('Indentation')).toBeDefined();
      expect(screen.getByText('Quality Factor')).toBeDefined();
      expect(screen.getByText('Include Headers')).toBeDefined();
    });
  });

  describe('ToolPreview', () => {
    it('renders converted text output with copy button', () => {
      render(
        <ToolPreview
          tool={mockTool}
          files={[]}
          result={{
            resultType: 'json',
            content: '{\n  "name": "iNWebTools"\n}',
            stats: { rows: 1 },
          }}
          options={{}}
          loading={false}
        />,
      );

      expect(screen.getByText(/Converted Output \(JSON\)/i)).toBeDefined();
      expect(screen.getByText('Copy to Clipboard')).toBeDefined();
      expect(screen.getByText(/rows:/i)).toBeDefined();
    });

    it('renders extracted color palette swatches', () => {
      render(
        <ToolPreview
          tool={{ ...mockTool, slug: 'image-color-picker' }}
          files={[]}
          result={{
            resultType: 'palette',
            palette: [
              {
                hex: '#0ea5e9',
                rgb: 'rgb(14, 165, 233)',
                hsl: 'hsl(199, 89%, 48%)',
                name: 'Sky Blue',
                dominance: 40,
              },
            ],
          }}
          options={{}}
          loading={false}
        />,
      );

      expect(screen.getByText(/Extracted Color Harmony Palette/i)).toBeDefined();
      expect(screen.getByText('#0ea5e9')).toBeDefined();
      expect(screen.getByText('Sky Blue')).toBeDefined();
    });
  });
});
