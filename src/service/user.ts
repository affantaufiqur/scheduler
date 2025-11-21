import db from "@/configs/db";
import redis from "@/configs/db/redis";
import { userTable } from "@/configs/db/schema/users";
import { eq } from "drizzle-orm";
import * as argon2 from "argon2";
import createSessionToken from "@/helpers/session-token";

import { registerSchema } from "@/functions/auth/register";
import { loginSchema } from "@/functions/auth/login";

import z from "zod";

const SESSION_EXPIRY = 60 * 60 * 24 * 7; // 7 days
const SESSION_PREFIX = "session";

export async function userExists(email: string) {
  return await db
    .select({
      id: userTable.id,
      email: userTable.email,
      password: userTable.password,
      username: userTable.username,
    })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);
}

export async function createUser(user: z.infer<typeof registerSchema>) {
  const hashedPassword = await argon2.hash(user.password);
  const tx = await db.transaction((tx) => {
    return tx
      .insert(userTable)
      .values({
        username: user.username,
        email: user.email,
        password: hashedPassword,
      })
      .returning({
        id: userTable.id,
      });
  });

  if (!tx || tx.length === 0) {
    return { error: "Failed to create user" };
  }

  const userId = tx[0].id;

  const token = createSessionToken();
  const redisKey = `${SESSION_PREFIX}:${token}`;
  await redis.set(redisKey, userId, {
    EX: SESSION_EXPIRY,
  });

  return { token };
}

export async function getUserById(userId: string) {
  return await db
    .select({ id: userTable.id, username: userTable.username, email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
}

export async function getMe(token: string) {
  const redisKey = `${SESSION_PREFIX}:${token}`;
  const userId = await redis.get(redisKey);
  if (!userId) {
    return null;
  }

  return await getUserById(userId);
}

export async function getUserByEmail(email: string) {
  return await db
    .select({ email: userTable.email, password: userTable.password })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);
}

export async function loginUser(userData: z.infer<typeof loginSchema>) {
  const { email, password } = userData;

  const isUserExists = await userExists(email);
  if (!isUserExists || isUserExists.length === 0) {
    return { error: "Invalid email or password" };
  }

  const user = isUserExists[0];

  const hashedPassword = user.password;
  const isPasswordValid = await argon2.verify(hashedPassword, password);

  if (!isPasswordValid) {
    return { error: "Invalid email or password" };
  }

  const token = createSessionToken();

  const redisKey = `${SESSION_PREFIX}:${token}`;
  await redis.set(redisKey, user.id, {
    EX: SESSION_EXPIRY,
  });

  return {
    error: null,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  };
}
