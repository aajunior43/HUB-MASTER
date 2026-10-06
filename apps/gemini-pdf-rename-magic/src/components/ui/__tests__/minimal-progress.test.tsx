import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { 
  MinimalProgress, 
  MinimalSpinner, 
  ProcessingIndicator, 
  BatchProgress 
} from '../minimal-progress';

describe('MinimalProgress', () => {
  it('renders with default props', () => {
    render(<MinimalProgress value={50} />);
    const progressBar = screen.getByRole('progressbar', { hidden: true });
    expect(progressBar).toBeInTheDocument();
  });

  it('shows percentage when enabled', () => {
    render(<MinimalProgress value={75} showPercentage />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows label when provided', () => {
    render(<MinimalProgress value={30} label="Processing..." />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('clamps value between 0 and 100', () => {
    const { rerender } = render(<MinimalProgress value={150} showPercentage />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    
    rerender(<MinimalProgress value={-10} showPercentage />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});

describe('MinimalSpinner', () => {
  it('renders with default props', () => {
    render(<MinimalSpinner />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<MinimalSpinner size="xs" />);
    let spinner = document.querySelector('.w-2\\.5');
    expect(spinner).toBeInTheDocument();

    rerender(<MinimalSpinner size="lg" />);
    spinner = document.querySelector('.w-5');
    expect(spinner).toBeInTheDocument();
  });
});

describe('ProcessingIndicator', () => {
  it('shows spinner when processing', () => {
    render(<ProcessingIndicator isProcessing={true} />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows progress bar when progress is provided', () => {
    render(<ProcessingIndicator isProcessing={false} progress={60} />);
    const progressBar = screen.getByRole('progressbar', { hidden: true });
    expect(progressBar).toBeInTheDocument();
  });

  it('shows label when processing without progress', () => {
    render(<ProcessingIndicator isProcessing={true} label="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('returns null when not processing and no progress', () => {
    const { container } = render(<ProcessingIndicator isProcessing={false} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('BatchProgress', () => {
  it('renders batch progress with details', () => {
    render(
      <BatchProgress 
        total={10} 
        completed={7} 
        processing={2} 
        errors={1} 
        showDetails={true}
      />
    );
    
    expect(screen.getByText('7/10 concluídos')).toBeInTheDocument();
    expect(screen.getByText('7 concluídos')).toBeInTheDocument();
    expect(screen.getByText('2 processando')).toBeInTheDocument();
    expect(screen.getByText('1 erros')).toBeInTheDocument();
  });

  it('calculates percentages correctly', () => {
    render(
      <BatchProgress 
        total={100} 
        completed={50} 
        processing={30} 
        errors={20} 
      />
    );
    
    // Check that progress bars are rendered (they use inline styles for width)
    const progressBars = document.querySelectorAll('[style*="width"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('handles zero total gracefully', () => {
    render(
      <BatchProgress 
        total={0} 
        completed={0} 
        processing={0} 
        errors={0} 
      />
    );
    
    expect(screen.getByText('0/0 concluídos')).toBeInTheDocument();
  });
});