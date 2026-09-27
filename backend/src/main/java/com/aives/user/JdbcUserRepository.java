package com.aives.user;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcUserRepository implements UserRepository {

    private static final RowMapper<UserAccount> USER = (rs, rowNum) -> map(rs);

    private final JdbcTemplate jdbc;

    public JdbcUserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<UserAccount> findByEmail(String email) {
        return jdbc.query(
                """
                SELECT id, email, name, password, role::text AS role
                FROM "User"
                WHERE email = ?
                """,
                USER,
                email
        ).stream().findFirst();
    }

    @Override
    public Optional<UserAccount> findById(String id) {
        return jdbc.query(
                """
                SELECT id, email, name, password, role::text AS role
                FROM "User"
                WHERE id = ?
                """,
                USER,
                id
        ).stream().findFirst();
    }

    @Override
    public List<UserAccount> findAllOrdered() {
        return jdbc.query(
                """
                SELECT id, email, name, password, role::text AS role
                FROM "User"
                ORDER BY CASE role::text
                    WHEN 'STUDENT' THEN 0
                    WHEN 'EXAMINER' THEN 1
                    WHEN 'ADMIN' THEN 2
                    ELSE 3
                END, name ASC
                """,
                USER
        );
    }

    @Override
    public long countByRole(Role role) {
        Long count = jdbc.queryForObject(
                """
                SELECT count(*) FROM "User" WHERE role::text = ?
                """,
                Long.class,
                role.name()
        );
        return count == null ? 0 : count;
    }

    @Override
    public UserAccount updateRole(String id, Role role) {
        jdbc.update(
                """
                UPDATE "User"
                SET role = ?::"Role", "updatedAt" = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                role.name(),
                id
        );
        return findById(id).orElseThrow();
    }

    @Override
    public void insert(UserAccount user) {
        jdbc.update(
                """
                INSERT INTO "User" (id, email, password, name, role, "createdAt", "updatedAt")
                VALUES (?, ?, ?, ?, ?::"Role", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                user.id(),
                user.email(),
                user.passwordHash(),
                user.name(),
                user.role().name()
        );
    }

    private static UserAccount map(ResultSet rs) throws SQLException {
        return new UserAccount(
                rs.getString("id"),
                rs.getString("email"),
                rs.getString("name"),
                rs.getString("password"),
                Role.valueOf(rs.getString("role"))
        );
    }
}
