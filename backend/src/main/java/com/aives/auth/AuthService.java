package com.aives.auth;

import com.aives.user.PublicUser;
import com.aives.user.UserAccount;
import com.aives.user.UsersService;
import com.aives.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UsersService users;
    private final PasswordEncoder passwords;
    private final JwtService jwt;

    public AuthService(UsersService users, PasswordEncoder passwords, JwtService jwt) {
        this.users = users;
        this.passwords = passwords;
        this.jwt = jwt;
    }

    public LoginResponse login(String email, String password) {
        UserAccount user = users.requireByEmail(email);
        if (!passwords.matches(password, user.passwordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return new LoginResponse(jwt.sign(user), user.toPublic());
    }

    public MeResponse me(PublicUser user) {
        return new MeResponse(user);
    }

    public record LoginResponse(String accessToken, PublicUser user) {
    }

    public record MeResponse(PublicUser user) {
    }
}
