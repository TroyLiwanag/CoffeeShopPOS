package com.cafecorazon.pos.security

import at.favre.lib.crypto.bcrypt.BCrypt

object PasswordHasher {

    fun hashPassword(password: String): String {
        return BCrypt.withDefaults().hashToString(10, password.toCharArray())
    }

    fun verifyPassword(password: String, hash: String): Boolean {
        if (hash.isEmpty() || password.isEmpty()) return false
        val result = BCrypt.verifyer().verify(password.toCharArray(), hash.toCharArray())
        return result.verified
    }
}
