package com.aives.config;

import com.aives.knowledge.KnowledgeService;
import com.aives.user.Role;
import com.aives.user.UserAccount;
import com.aives.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.springframework.jdbc.core.JdbcTemplate;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class DemoDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);

    private static final List<DemoUser> DEMO_USERS = List.of(
            new DemoUser("ivan.p@example.net", "Alex Rivera", Role.STUDENT),
            new DemoUser("priya.s@example.net", "Priya Shah", Role.EXAMINER),
            new DemoUser("jordan.h@example.net", "Jordan Hale", Role.ADMIN)
    );

    private static final List<DemoChunk> DEMO_KNOWLEDGE = List.of(
            new DemoChunk(
                    "Viva assessment purpose",
                    "A viva checks whether the candidate can explain their reasoning, not only recall a memorized answer."
            ),
            new DemoChunk(
                    "Strong oral answer",
                    "A strong viva answer states the claim, gives a concrete example, and names the limitation of that example."
            ),
            new DemoChunk(
                    "Weak oral answer",
                    "A weak viva answer is vague, repeats the question, and does not connect the idea to evidence."
            )
    );

    private static final List<DemoExam> DEMO_EXAMS = List.of(
            new DemoExam("Algorithms quiz", "MULTIPLE_CHOICE", "IN_PROGRESS"),
            new DemoExam("Midterm viva, group A", "ORAL", "IN_PROGRESS"),
            new DemoExam("Midterm viva, group B", "ORAL", "IN_PROGRESS"),
            new DemoExam("Coursework quiz", "MULTIPLE_CHOICE", "SCHEDULED"),
            new DemoExam("Lab viva", "ORAL", "SCHEDULED"),
            new DemoExam("Orientation quiz", "MULTIPLE_CHOICE", "COMPLETED")
    );

    private final UserRepository users;
    private final KnowledgeService knowledge;
    private final PasswordEncoder passwords;
    private final AppProperties properties;
    private final JdbcTemplate jdbc;

    public DemoDataInitializer(
            UserRepository users,
            KnowledgeService knowledge,
            PasswordEncoder passwords,
            AppProperties properties,
            JdbcTemplate jdbc
    ) {
        this.users = users;
        this.knowledge = knowledge;
        this.passwords = passwords;
        this.properties = properties;
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        String passwordHash = passwords.encode(properties.demoPassword());
        for (DemoUser demo : DEMO_USERS) {
            if (users.findByEmail(demo.email()).isPresent()) {
                continue;
            }
            users.insert(new UserAccount(UUID.randomUUID().toString(), demo.email(), demo.name(), passwordHash, demo.role(), null));
            log.info("Seeded {} {}", demo.role().name().toLowerCase(), demo.email());
        }

        if (knowledge.list().isEmpty()) {
            for (DemoChunk chunk : DEMO_KNOWLEDGE) {
                knowledge.create(chunk.title(), chunk.content());
            }
            log.info("Stored {} demo knowledge embeddings", DEMO_KNOWLEDGE.size());
        }

        Long exams = jdbc.queryForObject("SELECT count(*) FROM exam", Long.class);
        if (exams != null && exams == 0) {
            for (DemoExam exam : DEMO_EXAMS) {
                jdbc.update(
                        """
                        INSERT INTO exam (id, title, format, status)
                        VALUES (?::uuid, ?, ?::exam_format, ?::exam_status)
                        """,
                        UUID.randomUUID().toString(),
                        exam.title(),
                        exam.format(),
                        exam.status()
                );
            }
            log.info("Seeded {} demo exams", DEMO_EXAMS.size());
        }
    }

    private record DemoUser(String email, String name, Role role) {
    }

    private record DemoChunk(String title, String content) {
    }

    private record DemoExam(String title, String format, String status) {
    }
}
