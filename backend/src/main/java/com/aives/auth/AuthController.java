package com.aives.auth;

import com.aives.auth.AuthService.LoginResponse;
import com.aives.auth.AuthService.MeResponse;
import com.aives.user.PublicUser;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request.email(), request.password());
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal PublicUser user) {
        return auth.me(user);
    }

    @PostMapping("/logout")
    public Map<String, Boolean> logout() {
        return Map.of("success", true);
    }
}
