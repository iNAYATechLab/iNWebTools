import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DigestTable } from '../SecurityNetwork/DigestTable';
import { KeyViewer } from '../SecurityNetwork/KeyViewer';

describe('Security & Cryptography Components', () => {
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

  describe('KeyViewer Component', () => {
    it('renders key viewer with label, badge, and value', () => {
      render(
        <KeyViewer
          label="Public Key"
          value="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A\n-----END PUBLIC KEY-----"
          badge="RSA"
        />,
      );

      expect(screen.getByText('Public Key')).toBeDefined();
      expect(screen.getByText('RSA')).toBeDefined();
      expect(screen.getByRole('button', { name: /Download PEM/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Copy/i })).toBeDefined();
    });

    it('toggles secret mask for private keys', () => {
      render(
        <KeyViewer
          label="Private Key"
          value="SUPER_SECRET_PRIVATE_KEY_DATA"
          badge="SECRET"
          isSecret={true}
        />,
      );

      const revealBtn = screen.getByRole('button', { name: /Reveal/i });
      expect(revealBtn).toBeDefined();
      fireEvent.click(revealBtn);

      expect(screen.getByRole('button', { name: /Hide/i })).toBeDefined();
    });
  });

  describe('DigestTable Component', () => {
    it('renders multiple cryptographic digests in matrix', () => {
      const mockDigests = {
        md5: 'a3f12d633a00fc3a10e35bebc750ea9f',
        sha256: '524484ddec7e8b3f2c307860c0d1c54d2936cc7ac974207c60d325500ed6ae72',
      };

      render(<DigestTable digests={mockDigests} primaryAlgorithm="SHA-256" />);

      expect(screen.getByText('MD5')).toBeDefined();
      expect(screen.getByText('SHA256')).toBeDefined();
      expect(screen.getByText('Primary')).toBeDefined();
      expect(screen.getByText('2 Algorithms Computed')).toBeDefined();
    });
  });
});
