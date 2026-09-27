package com.aives.user;

import com.aives.web.ApiException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class UsersService {

    private final UserRepository users;

    public UsersService(UserRepository users) {
        this.users = users;
    }

    public UserAccount requireByEmail(String email) {
        return users.findByEmail(email).orElseThrow(() ->
                new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
    }

    public List<PublicUser> listPublic() {
        return users.findAllOrdered().stream().map(UserAccount::toPublic).toList();
    }

    public PublicUser assignRole(String id, Role role) {
        UserAccount user = users.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.role() == Role.ADMIN && role != Role.ADMIN && users.countByRole(Role.ADMIN) <= 1) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cannot demote the last administrator");
        }

        return users.updateRole(id, role).toPublic();
    }
}
