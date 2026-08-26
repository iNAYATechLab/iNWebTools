import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ToolControls } from '../DocumentImage/ToolControls';
import { ToolDropzone } from '../DocumentImage/ToolDropzone';
import { ToolPreview } from '../DocumentImage/ToolPreview';
import { AudioWaveform } from '../Media/AudioWaveform';
import { MediaDropzone } from '../Media/MediaDropzone';
import { VideoPlayerPreview } from '../Media/VideoPlayerPreview';
import type { ToolDefinition } from '../../../types/tools';

const mockTool: ToolDefinition = {
  slug: 'audio-converter',
  name: 'Universal Audio Converter',
  tagline: 'Convert between MP3, WAV, AAC, FLAC',
  module: 'audio-video',
  categorySlug: 'audio-video-tools',
  subcategorySlug: 'audio-converters-editing',
  icon: 'play',
  inputFormats: ['.mp3', '.wav', '.aac'],
  outputFormats: ['.mp3', '.wav'],
  defaultOutput: 'mp3',
  options: [
    {
      id: 'targetFormat',
      label: 'Target Format',
      type: 'select',
      options: ['mp3', 'wav', 'aac'],
      default: 'mp3',
    },
    {
      id: 'bitrate',
      label: 'Bitrate',
      type: 'slider',
      min: 64,
      max: 320,
      default: 320,
      unit: 'kbps',
    },
  ],
};

describe('Tools & Media Components', () => {
  describe('ToolDropzone & MediaDropzone', () => {
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

    it('renders MediaDropzone with live voice recording button', () => {
      render(<MediaDropzone supportsVoiceRecord={true} files={[]} onFilesChange={vi.fn()} />);

      const recordTab = screen.getByRole('button', { name: /Record Mic/i });
      expect(recordTab).toBeDefined();
      fireEvent.click(recordTab);

      expect(screen.getByText(/Click the microphone button to start recording/i)).toBeDefined();
    });
  });

  describe('AudioWaveform & VideoPlayerPreview', () => {
    it('renders AudioWaveform player and speed metrics', () => {
      render(<AudioWaveform trimStart="00:10" trimEnd="01:20" playbackSpeed={1.5} />);

      expect(screen.getByText(/Speed: 1.5x/i)).toBeDefined();
      expect(screen.getByText(/Trim: \[00:10 - 01:20\]/i)).toBeDefined();
    });

    it('renders VideoPlayerPreview canvas placeholder', () => {
      render(<VideoPlayerPreview watermarkText="© iNWebTools" watermarkPosition="bottom-right" />);

      expect(screen.getByText(/Video Canvas Ready/i)).toBeDefined();
    });
  });

  describe('ToolControls', () => {
    it('renders sliders and select options', () => {
      const onChange = vi.fn();
      render(
        <ToolControls
          options={mockTool.options!}
          values={{ targetFormat: 'mp3', bitrate: 320 }}
          onChange={onChange}
        />,
      );

      expect(screen.getByText('Target Format')).toBeDefined();
      expect(screen.getByText('Bitrate')).toBeDefined();
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
    });
  });
});
