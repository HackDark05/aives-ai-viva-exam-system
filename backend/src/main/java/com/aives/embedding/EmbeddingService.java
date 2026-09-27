package com.aives.embedding;

import dev.langchain4j.model.embedding.onnx.allminilml6v2q.AllMiniLmL6V2QuantizedEmbeddingModel;
import org.springframework.stereotype.Service;

@Service
public class EmbeddingService {

    public static final int DIMENSIONS = 384;

    private final AllMiniLmL6V2QuantizedEmbeddingModel model = new AllMiniLmL6V2QuantizedEmbeddingModel();

    public float[] embed(String text) {
        float[] vector = model.embed(text).content().vector();
        if (vector.length != DIMENSIONS) {
            throw new IllegalStateException(
                    "Embedding model returned " + vector.length + " dimensions, expected " + DIMENSIONS);
        }
        return vector;
    }
}
