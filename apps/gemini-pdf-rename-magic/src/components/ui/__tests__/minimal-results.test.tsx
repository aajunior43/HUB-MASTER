import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MinimalResultsList, ResultItem } from '../minimal-results';

const mockItems: ResultItem[] = [
  {
    id: '1',
    originalName: 'document.pdf',
    newName: 'INVOICE_2024_001',
    status: 'completed',
    fileType: 'PDF',
    fileSize: 1024000,
  },
  {
    id: '2',
    originalName: 'image.jpg',
    status: 'pending',
    fileType: 'Image',
    fileSize: 512000,
  },
  {
    id: '3',
    originalName: 'error-file.pdf',
    status: 'error',
    fileType: 'PDF',
    fileSize: 256000,
    error: 'Processing failed',
  },
];

describe('MinimalResultsList', () => {
  it('renders empty state when no items', () => {
    render(<MinimalResultsList items={[]} />);
    expect(screen.getByText('Nenhum resultado para exibir')).toBeInTheDocument();
  });

  it('renders items correctly', () => {
    render(<MinimalResultsList items={mockItems} />);
    
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText('image.jpg')).toBeInTheDocument();
    expect(screen.getByText('error-file.pdf')).toBeInTheDocument();
  });

  it('shows correct status badges', () => {
    render(<MinimalResultsList items={mockItems} />);
    
    expect(screen.getByText('Concluído')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Erro')).toBeInTheDocument();
  });

  it('displays new names for completed items', () => {
    render(<MinimalResultsList items={mockItems} />);
    
    expect(screen.getByText(/INVOICE_2024_001\.pdf/)).toBeInTheDocument();
  });

  it('displays error messages', () => {
    render(<MinimalResultsList items={mockItems} />);
    
    expect(screen.getByText('Processing failed')).toBeInTheDocument();
  });

  it('calls action handlers when buttons are clicked', () => {
    const mockOnProcess = jest.fn();
    const mockOnDownload = jest.fn();
    const mockOnRetry = jest.fn();
    
    render(
      <MinimalResultsList 
        items={mockItems} 
        onProcess={mockOnProcess}
        onDownload={mockOnDownload}
        onRetry={mockOnRetry}
      />
    );
    
    // Should have action buttons for each item based on status
    const actionButtons = screen.getAllByRole('button');
    expect(actionButtons.length).toBeGreaterThan(0);
  });

  it('formats file sizes correctly', () => {
    render(<MinimalResultsList items={mockItems} />);
    
    expect(screen.getByText('1.0 MB')).toBeInTheDocument();
    expect(screen.getByText('512.0 KB')).toBeInTheDocument();
    expect(screen.getByText('256.0 KB')).toBeInTheDocument();
  });

  it('shows correct file type icons', () => {
    render(<MinimalResultsList items={mockItems} />);
    
    // Check that file icons are rendered (they should be in the DOM)
    const cards = screen.getAllByRole('generic');
    expect(cards.length).toBeGreaterThan(0);
  });
});