import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from '../../../services/adminApi';
import { SystemOverview } from '../Overview/SystemOverview';
import { MasterToolsManager } from '../Tools/MasterToolsManager';

describe('Super Admin Dashboard Portal Components', () => {
  beforeEach(() => {
    vi.spyOn(adminApi, 'getSystemStats').mockResolvedValue({
      users: { total: 10, superAdmins: 2, admins: 3, regularUsers: 5, active: 10 },
      tools: { total: 242, published: 230, featured: 25, premium: 10, totalExecutions: 1540 },
      todayActivity: { executions: 42, successes: 40, failures: 2, characters: 15000 },
      system: {
        nodeVersion: 'v22.0.0',
        platform: 'linux',
        arch: 'x64',
        uptimeSeconds: 12500,
        memory: { rssMb: 120, heapUsedMb: 60, heapTotalMb: 90 },
        environment: 'production',
        asrModel: 'openai/whisper-large-v3-turbo',
        database: { engine: 'PostgreSQL 17', status: 'healthy' },
      },
    });

    vi.spyOn(adminApi, 'getAdminToolsList').mockResolvedValue({
      items: [
        {
          id: '1',
          slug: 'bmi-calculator',
          name: 'BMI Calculator',
          tagline: 'Body Mass Index assessment',
          description: 'Calculates BMI',
          route: '/tools/math-science/bmi-calculator',
          icon: 'activity',
          tags: ['health', 'bmi'],
          status: 'published',
          isFeatured: true,
          isPremium: false,
          usageCount: 120,
          sortOrder: 1,
          module: 'math-science',
          categorySlug: 'health-fitness',
          categoryName: 'Health & Fitness',
        },
      ],
      pagination: { page: 1, limit: 15, total: 1, pages: 1 },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders SystemOverview with KPI metrics and telemetry', async () => {
    render(
      <MemoryRouter>
        <SystemOverview />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Super Admin Control Center/i)).toBeDefined();
    expect(screen.getByText('Registered Tools')).toBeDefined();
    expect(screen.getByText('PostgreSQL 17 (healthy)')).toBeDefined();
  });

  it('renders MasterToolsManager with tools table', async () => {
    render(
      <MemoryRouter>
        <MasterToolsManager />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Master Tools Manager/i)).toBeDefined();
    expect(screen.getByText('BMI Calculator')).toBeDefined();
    expect(screen.getByText('published')).toBeDefined();
  });
});
