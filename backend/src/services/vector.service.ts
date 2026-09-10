import { Pinecone } from '@pinecone-database/pinecone';
import { env } from '../config/env';

export interface VectorDocument {
  id: string;
  values: number[];
  metadata: Record<string, any>;
}

export class VectorService {
  private pinecone: Pinecone | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (env.pineconeApiKey && !this.isInitialized) {
      try {
        this.pinecone = new Pinecone({
          apiKey: env.pineconeApiKey,
        });
        this.isInitialized = true;
      } catch (error) {
        console.warn('Failed to initialize Pinecone. Vector database features will be disabled.', error);
      }
    }
  }

  /**
   * Upserts vectors into the Pinecone index.
   * 
   * @param vectors Array of vectors to upsert
   */
  async upsertVectors(vectors: VectorDocument[]): Promise<void> {
    if (!this.pinecone || !this.isInitialized) {
      console.warn('Pinecone is not initialized. Skipping upsert.');
      return;
    }

    try {
      const index = this.pinecone.Index(env.pineconeIndex);
      
      // Upsert in batches to avoid payload size limits (Pinecone recommends <= 100 per batch)
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await index.upsert(batch as any);
      }
      
      console.log(`Successfully upserted ${vectors.length} vectors to Pinecone.`);
    } catch (error: any) {
      console.error('Pinecone Upsert Error:', error.message);
      throw new Error(`Vector DB Error: ${error.message}`);
    }
  }

  /**
   * Queries the Pinecone index for similar vectors.
   * 
   * @param vector The query vector
   * @param topK Number of results to return
   * @returns Array of matching metadata
   */
  async queryVectors(vector: number[], topK: number = 3): Promise<any[]> {
    if (!this.pinecone || !this.isInitialized) {
      console.warn('Pinecone is not initialized. Returning empty query results.');
      return [];
    }

    try {
      const index = this.pinecone.Index(env.pineconeIndex);
      
      const queryResponse = await index.query({
        vector,
        topK,
        includeMetadata: true,
      });

      return queryResponse.matches.map(match => match.metadata);
    } catch (error: any) {
      console.error('Pinecone Query Error:', error.message);
      throw new Error(`Vector DB Query Error: ${error.message}`);
    }
  }
}

export const vectorService = new VectorService();
