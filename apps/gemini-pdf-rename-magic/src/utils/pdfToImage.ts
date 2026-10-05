import * as pdfjsLib from 'pdfjs-dist';
import { logger } from './logger';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PDFToImageOptions {
  scale?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

export class PDFToImageConverter {
  private static readonly DEFAULT_OPTIONS: Required<PDFToImageOptions> = {
    scale: 2.0,
    quality: 0.8,
    format: 'jpeg'
  };

  /**
   * Converts the first page of a PDF file to an image
   * @param file PDF file to convert
   * @param options Conversion options
   * @returns Base64 encoded image data
   */
  static async convertFirstPageToImage(
    file: File, 
    options: PDFToImageOptions = {}
  ): Promise<string> {
    const startTime = Date.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      logger.debug('Starting PDF to image conversion', {
        fileName: file.name,
        fileSize: file.size,
        options: opts
      });

      // Convert file to array buffer
      const arrayBuffer = await this.fileToArrayBuffer(file);
      
      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      if (pdf.numPages === 0) {
        throw new Error('PDF has no pages');
      }

      // Get first page
      const page = await pdf.getPage(1);
      
      // Get page viewport
      const viewport = page.getViewport({ scale: opts.scale });
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas 2D context');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render page to canvas
      const renderContext = {
        canvas,
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      // Convert canvas to base64
      const mimeType = opts.format === 'png' ? 'image/png' : 'image/jpeg';
      const imageData = canvas.toDataURL(mimeType, opts.quality);
      
      // Extract base64 data (remove data:image/jpeg;base64, prefix)
      const base64Data = imageData.split(',')[1];

      const duration = Date.now() - startTime;
      logger.debug('PDF to image conversion completed', {
        fileName: file.name,
        duration,
        imageSize: base64Data.length,
        canvasSize: `${canvas.width}x${canvas.height}`
      });

      return base64Data;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('PDF to image conversion failed', {
        fileName: file.name,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to convert PDF to image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Checks if a file is a PDF
   * @param file File to check
   * @returns True if file is a PDF
   */
  static isPDF(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  /**
   * Checks if a PDF is likely to be scanned (image-based)
   * This is a heuristic check - we'll analyze if the PDF has text content
   * @param file PDF file to check
   * @returns True if PDF appears to be scanned
   */
  static async isScannedPDF(file: File): Promise<boolean> {
    try {
      const arrayBuffer = await this.fileToArrayBuffer(file);
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      if (pdf.numPages === 0) {
        return false;
      }

      // Check first page for text content
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      
      // If there's very little text content, it's likely a scanned PDF
      const textLength = textContent.items
        .map((item: any) => item.str || '')
        .join('')
        .trim()
        .length;

      // Heuristic: if less than 50 characters of text, consider it scanned
      const isScanned = textLength < 50;
      
      logger.debug('PDF scan detection', {
        fileName: file.name,
        textLength,
        isScanned,
        numPages: pdf.numPages
      });

      return isScanned;

    } catch (error) {
      logger.error('Error checking if PDF is scanned', {
        fileName: file.name,
        error: error instanceof Error ? error.message : String(error)
      });
      // If we can't determine, assume it might be scanned
      return true;
    }
  }

  /**
   * Converts File to ArrayBuffer
   * @param file File to convert
   * @returns ArrayBuffer
   */
  private static async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsArrayBuffer(file);
    });
  }
}