import fs from 'fs';
import path from 'path';

export interface UsageRecord {
  id: string;
  timestamp: string;
  prompt: string;
  sessionId?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface UsageStats {
  totalQueries: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalEstimatedCostUsd: number;
}

const DB_PATH = path.join(__dirname, '../../data/usage.json');

export class UsageService {
  /**
   * Retrieves all usage records from the local store.
   */
  async getAllRecords(): Promise<UsageRecord[]> {
    try {
      if (!fs.existsSync(DB_PATH)) {
        return [];
      }
      const data = await fs.promises.readFile(DB_PATH, 'utf-8');
      return JSON.parse(data) as UsageRecord[];
    } catch (error) {
      console.error('Failed to read usage database:', error);
      return [];
    }
  }

  /**
   * Saves a new usage record to the local store.
   */
  async logUsage(record: Omit<UsageRecord, 'id' | 'timestamp'>): Promise<void> {
    const newRecord: UsageRecord = {
      ...record,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const records = await this.getAllRecords();
    records.push(newRecord);

    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      await fs.promises.writeFile(DB_PATH, JSON.stringify(records, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save usage record:', error);
    }
  }

  /**
   * Calculates aggregate usage statistics.
   */
  async getUsageStats(): Promise<UsageStats> {
    const records = await this.getAllRecords();
    
    return records.reduce((stats, record) => {
      stats.totalQueries += 1;
      stats.totalInputTokens += record.inputTokens || 0;
      stats.totalOutputTokens += record.outputTokens || 0;
      stats.totalTokens += record.totalTokens || 0;
      stats.totalEstimatedCostUsd += record.estimatedCostUsd || 0;
      return stats;
    }, {
      totalQueries: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalEstimatedCostUsd: 0,
    });
  }
}

export const usageService = new UsageService();
