package com.aives.knowledge;

import java.util.List;

public interface KnowledgeRepository {

    StoredKnowledge insert(String title, String content, float[] embedding);

    List<StoredKnowledge> list();

    List<KnowledgeMatch> search(float[] embedding, int limit);
}
