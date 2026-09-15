import fs from 'fs';
import path from 'path';
const pdfParse = require('pdf-parse');
import { v4 as uuidv4 } from 'uuid';
import { llmService } from './llm.service';
import { vectorService } from './vector.service';

const DB_PATH = path.join(__dirname, '../../data/documents.json');

export interface ProcessedChunk {
  text: string;
  embedding: number[];
}

export interface DocumentMetadata {
  id: string;
  filename: string;
  size: number;
  chunksGenerated: number;
  uploadDate: string;
}

export class DocumentService {
  /**
   * Processes a document and extracts its text based on mime type.
   * 
   * @param filePath The absolute path to the uploaded file
   * @param mimetype The MIME type of the file
   * @returns An array of processed chunks with embeddings
   */
  async processDocument(filePath: string, mimetype: string): Promise<{ chunks: ProcessedChunk[], documentId: string }> {
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

      const chunks = this.chunkText(text);

      if (chunks.length === 0) {
        throw new Error(`Failed to extract text. Mimetype was: ${mimetype}. Text length was: ${text.length}`);
      }

      // Generate Embeddings
      const embeddings = await llmService.generateEmbeddings(chunks);

      // Map chunks with their corresponding vectors
      const processedChunks: ProcessedChunk[] = chunks.map((chunk, i) => ({
        text: chunk,
        embedding: embeddings[i],
      }));

      const documentId = uuidv4();
      
      // Store in Pinecone
      const vectorDocuments = processedChunks.map((chunk, i) => ({
        id: `${documentId}-chunk-${i}`,
        values: chunk.embedding,
        metadata: {
          text: chunk.text,
          documentId,
          filename: path.basename(filePath),
          chunkIndex: i,
        },
      }));

      await vectorService.upsertVectors(vectorDocuments);

      // Save document metadata locally
      const docMeta: DocumentMetadata = {
        id: documentId,
        filename: path.basename(filePath),
        size: (await fs.promises.stat(filePath)).size,
        chunksGenerated: processedChunks.length,
        uploadDate: new Date().toISOString(),
      };
      
      await this.saveDocumentMetadata(docMeta);

      return { chunks: processedChunks, documentId };
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

  /**
   * Retrieves all document metadata from the local store.
   */
  async getAllDocuments(): Promise<DocumentMetadata[]> {
    try {
      if (!fs.existsSync(DB_PATH)) {
        return [];
      }
      const data = await fs.promises.readFile(DB_PATH, 'utf-8');
      return JSON.parse(data) as DocumentMetadata[];
    } catch (error) {
      console.error('Failed to read document database:', error);
      return [];
    }
  }

  /**
   * Saves a new document metadata record to the local store.
   */
  private async saveDocumentMetadata(meta: DocumentMetadata): Promise<void> {
    const docs = await this.getAllDocuments();
    docs.push(meta);

    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      await fs.promises.writeFile(DB_PATH, JSON.stringify(docs, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save document metadata:', error);
    }
  }
}

export const documentService = new DocumentService();
