/**
 * Tests for Health, Mathematics & Science Components (BMI Gauge, Scientific Keypad, Matrix, Kinematics, Explorer).
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { BmiVisualGauge } from '../ScienceMath/BmiVisualGauge';
import { KinematicsFormulaCard } from '../ScienceMath/KinematicsFormulaCard';
import { MatrixWorkbench } from '../ScienceMath/MatrixWorkbench';
import { ScienceMathExplorer } from '../ScienceMath/ScienceMathExplorer';
import { ScientificKeypad } from '../ScienceMath/ScientificKeypad';

describe('Science & Math Client Suite', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders BmiVisualGauge with BMI score and category label', () => {
    render(
      <BmiVisualGauge
        bmi={22.86}
        category="Normal Weight"
        healthyWeightRange="56.7 kg – 76.3 kg"
        bmiPrime={0.91}
      />,
    );
    expect(screen.getByText('22.86')).toBeDefined();
    expect(screen.getByText('Normal Weight')).toBeDefined();
    expect(screen.getByText('56.7 kg – 76.3 kg')).toBeDefined();
  });

  it('renders ScientificKeypad and handles input', () => {
    render(<ScientificKeypad />);
    expect(screen.getByText('RAD')).toBeDefined();
    expect(screen.getByText('= Calculate')).toBeDefined();

    const radBtn = screen.getByText('RAD');
    fireEvent.click(radBtn);
    expect(screen.getByText('DEG')).toBeDefined();
  });

  it('renders MatrixWorkbench and toggles dimension', () => {
    render(<MatrixWorkbench />);
    expect(screen.getByText('2 × 2')).toBeDefined();
    expect(screen.getByText('3 × 3')).toBeDefined();

    const btn3x3 = screen.getByText('3 × 3');
    fireEvent.click(btn3x3);
    expect(screen.getByText('3 × 3')).toBeDefined();
  });

  it('renders KinematicsFormulaCard for mechanics and ohms', () => {
    render(<KinematicsFormulaCard topic="kinematics" />);
    expect(screen.getByText('Classical Kinematics Equations')).toBeDefined();
    expect(screen.getByText('v = u + a · t')).toBeDefined();
  });

  it('renders ScienceMathExplorer with 24 tools catalog', () => {
    render(
      <BrowserRouter>
        <ScienceMathExplorer />
      </BrowserRouter>,
    );
    expect(screen.getByText(/Health, Mathematics & Scientific Utilities/i)).toBeDefined();
    expect(screen.getByText(/24 Health, Math & Physics Engines/i)).toBeDefined();
  });
});
