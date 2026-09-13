const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'of', 'to', 'with', 
  'for', 'as', 'by', 'that', 'this', 'it', 'are', 'was', 'be', 'or', 'from'
]);

export interface RerankMatch {
  score: number;
  metadata: {
    text: string;
    filename: string;
    documentId: string;
    chunkIndex: number;
    [key: string]: any;
  };
}

/**
 * Re-ranks an array of Pinecone matches using a Lexical (keyword-based) algorithm.
 * 
 * @param query The original user query string
 * @param chunks The array of semantically retrieved chunks from Pinecone
 * @param topK The number of final chunks to return
 * @returns Re-ranked and sliced array of chunks
 */
export function rerankChunks(query: string, chunks: RerankMatch[], topK: number = 3): RerankMatch[] {
  if (!chunks || chunks.length === 0) return [];

  // Extract meaningful keywords from the query
  const keywords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word)); // Remove stop words & tiny words

  if (keywords.length === 0) {
    // Fallback: If no meaningful keywords, just sort by semantic score and slice
    return chunks.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  const scoredChunks = chunks.map(chunk => {
    const textLower = chunk.metadata.text.toLowerCase();
    
    // Count keyword occurrences in the chunk
    let keywordHits = 0;
    keywords.forEach(keyword => {
      // Regex to find whole-word matches
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = textLower.match(regex);
      if (matches) {
        keywordHits += matches.length;
      }
    });

    // Normalize lexical score (max out around 5-10 hits for sanity)
    const normalizedLexicalScore = Math.min(keywordHits / 5, 1.0);
    
    // Hybrid Score: 70% Semantic (Vector), 30% Lexical (Keyword)
    const hybridScore = (chunk.score * 0.7) + (normalizedLexicalScore * 0.3);

    return {
      ...chunk,
      hybridScore
    };
  });

  // Sort by hybrid score in descending order
  scoredChunks.sort((a, b) => b.hybridScore - a.hybridScore);

  // Return the top K items without the temporary hybridScore property
  return scoredChunks.slice(0, topK).map(({ hybridScore, ...rest }) => rest);
}
