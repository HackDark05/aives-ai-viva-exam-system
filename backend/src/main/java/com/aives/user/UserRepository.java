package com.aives.user;

import java.util.List;
import java.util.Optional;

public interface UserRepository {

    Optional<UserAccount> findByEmail(String email);

    Optional<UserAccount> findById(String id);

    List<UserAccount> findAllOrdered();

    long countByRole(Role role);

    UserAccount updateRole(String id, Role role);

    void insert(UserAccount user);

    void linkGoogleSubject(String id, String googleSub);
}
