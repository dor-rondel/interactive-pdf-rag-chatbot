export type EmbeddingResponse = {
  embedding: {
    values: number[];
  };
};

export type BatchEmbeddingResponse = {
  embeddings: Array<{
    values: number[];
  }>;
};
