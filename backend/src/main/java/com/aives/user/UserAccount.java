package com.aives.user;

public record UserAccount(
        String id,
        String email,
        String name,
        String passwordHash,
        Role role,
        String googleSub
) {
    public PublicUser toPublic() {
        return new PublicUser(id, email, name, role);
    }
}
