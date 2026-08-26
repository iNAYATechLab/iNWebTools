import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as toolsApi from '../../../services/toolsApi';
import { CommandPalette } from '../CommandPalette';

describe('CommandPalette Component', () => {
  const mockTools = [
    {
      id: 'tool-1',
      slug: 'bmi-calculator',
      name: 'BMI Calculator',
      nameBn: 'বিএমআই ক্যালকুলেটর',
      categorySlug: 'health-fitness-calculators',
      subcategorySlug: 'body-mass-index',
      module: 'math-science',
      description: 'Calculate your body mass index and health category.',
      descriptionBn: 'আপনার বডি মাস ইনডেক্স ও স্বাস্থ্য বিভাগ হিসাব করুন।',
      icon: 'heart-pulse',
      tags: ['bmi', 'health', 'weight'],
      isFeatured: true,
    },
    {
      id: 'tool-2',
      slug: 'json-yaml-converter',
      name: 'JSON to YAML Converter',
      nameBn: 'জেসন থেকে ইয়ামেল রূপান্তরকারী',
      categorySlug: 'developer-code-utilities',
      subcategorySlug: 'data-formatters',
      module: 'developer-code',
      description: 'Convert JSON to clean YAML format effortlessly.',
      descriptionBn: 'জেসন ফাইল সহজে ইয়ামেলে রূপান্তর করুন।',
      icon: 'code',
      tags: ['json', 'yaml', 'convert'],
      isFeatured: false,
    },
  ];

  beforeEach(() => {
    vi.spyOn(toolsApi, 'getToolsRegistry').mockResolvedValue({
      modules: [],
      total: 2,
      tools: mockTools as any,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not render dialog when isOpen is false', () => {
    render(
      <MemoryRouter>
        <CommandPalette isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.queryByPlaceholderText(/Search across/i)).toBeNull();
  });

  it('renders search input and tools list when isOpen is true', async () => {
    render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/Search across/i);
    expect(input).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('BMI Calculator')).toBeDefined();
      expect(screen.getByText('JSON to YAML Converter')).toBeDefined();
    });
  });

  it('filters tools based on English search term', async () => {
    render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/Search across/i);

    await waitFor(() => {
      expect(screen.getByText('BMI Calculator')).toBeDefined();
    });

    fireEvent.change(input, { target: { value: 'yaml' } });

    expect(screen.queryByText('BMI Calculator')).toBeNull();
    expect(screen.getByText('JSON to YAML Converter')).toBeDefined();
  });

  it('filters tools based on Bengali search term', async () => {
    render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/Search across/i);

    await waitFor(() => {
      expect(screen.getByText('BMI Calculator')).toBeDefined();
    });

    fireEvent.change(input, { target: { value: 'বিএমআই' } });

    expect(screen.getByText('BMI Calculator')).toBeDefined();
    expect(screen.queryByText('JSON to YAML Converter')).toBeNull();
  });

  it('triggers onClose when close button or Escape is clicked', async () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={handleClose} />
      </MemoryRouter>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });
});
