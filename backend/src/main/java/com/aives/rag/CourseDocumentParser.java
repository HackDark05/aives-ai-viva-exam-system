package com.aives.rag;

import com.aives.rag.PageSplit.Page;
import java.io.InputStream;
import java.util.List;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.ToXMLContentHandler;
import org.springframework.stereotype.Component;

@Component
public class CourseDocumentParser {

    public List<Page> parse(InputStream input) throws Exception {
        AutoDetectParser parser = new AutoDetectParser();
        ToXMLContentHandler handler = new ToXMLContentHandler();
        Metadata metadata = new Metadata();
        parser.parse(input, handler, metadata, new ParseContext());
        return PageSplit.fromTikaXml(handler.toString());
    }
}
