import fs from 'fs';
const pdfParse = require('pdf-parse');

export class DocumentService {
  /**
   * Processes a document and extracts its text based on mime type.
   * 
   * @param filePath The absolute path to the uploaded file
   * @param mimetype The MIME type of the file
   * @returns An array of text chunks
   */
  async processDocument(filePath: string, mimetype: string): Promise<string[]> {
    let text = '';

    try {
      if (mimetype === 'application/pdf') {
        const dataBuffer = await fs.promises.readFile(filePath);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
      } else if (mimetype === 'text/plain') {
        text = await fs.promises.readFile(filePath, 'utf-8');
      } else {
        throw new Error('Unsupported file type for processing.');
      }

      // Simple cleaning
      text = text.replace(/\s+/g, ' ').trim();

      return this.chunkText(text);
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  /**
   * Splits a large text string into smaller chunks with overlap.
   * 
   * @param text The full extracted text
   * @param chunkSize Maximum characters per chunk
   * @param overlap Characters to overlap between chunks
   * @returns Array of text chunks
   */
  private chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    if (!text) return [];

    const chunks: string[] = [];
    let i = 0;

    while (i < text.length) {
      const chunk = text.slice(i, i + chunkSize);
      chunks.push(chunk);
      i += chunkSize - overlap;
    }

    return chunks;
  }
}

export const documentService = new DocumentService();
