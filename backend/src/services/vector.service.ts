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
   * Initializes the database by checking if the required index exists.
   * If it does not exist, it will automatically provision it.
   */
  async initializeDatabase(): Promise<void> {
    if (!this.pinecone || !this.isInitialized) {
      console.warn('Pinecone is not initialized. Skipping database provisioning.');
      return;
    }

    try {
      const indexList = await this.pinecone.listIndexes();
      const indexExists = indexList.indexes?.some(idx => idx.name === env.pineconeIndex);

      if (!indexExists) {
        console.log(`Vector database index '${env.pineconeIndex}' not found. Provisioning now...`);
        await this.pinecone.createIndex({
          name: env.pineconeIndex,
          dimension: 768,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        console.log(`Vector database index '${env.pineconeIndex}' successfully provisioned.`);
      } else {
        console.log(`Vector database index '${env.pineconeIndex}' is ready.`);
      }
    } catch (error: any) {
      console.error('Failed to provision Vector DB:', error.message);
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
   * @param filter Optional metadata filter to restrict search
   * @returns Array of matching metadata
   */
  async queryVectors(vector: number[], topK: number = 3, filter?: Record<string, any>): Promise<any[]> {
    if (!this.pinecone || !this.isInitialized) {
      console.warn('Pinecone is not initialized. Returning empty query results.');
      return [];
    }

    try {
      const index = this.pinecone.Index(env.pineconeIndex);
      
      const queryResponse = await index.query({
        vector,
        topK,
        filter,
        includeMetadata: true,
      });

      return queryResponse.matches.map(match => ({
        score: match.score,
        metadata: match.metadata
      }));
    } catch (error: any) {
      console.error('Pinecone Query Error:', error.message);
      throw new Error(`Vector DB Query Error: ${error.message}`);
    }
  }

  /**
   * Calculates the exact mathematical cosine similarity between two text strings.
   * 
   * @param textA First string
   * @param textB Second string
   * @returns Cosine similarity score
   */
  async calculateTextSimilarity(textA: string, textB: string): Promise<number> {
    const { llmService } = await import('./llm.service');
    const { cosineSimilarity } = await import('../utils/math');
    
    try {
      // 1. Generate embeddings for both strings
      const embeddings = await llmService.generateEmbeddings([textA, textB]);
      
      if (embeddings.length !== 2) {
        throw new Error('Failed to generate embeddings for both texts.');
      }
      
      const vecA = embeddings[0];
      const vecB = embeddings[1];
      
      // 2. Calculate the cosine similarity
      return cosineSimilarity(vecA, vecB);
    } catch (error: any) {
      console.error('Similarity Calculation Error:', error.message);
      throw new Error(`Similarity Error: ${error.message}`);
    }
  }
}

export const vectorService = new VectorService();
