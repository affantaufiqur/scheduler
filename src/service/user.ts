import db from "@/configs/db";
import redis from "@/configs/db/redis";
import { userTable } from "@/configs/db/schema/users";
import { organizerSettingsTable } from "@/configs/db/schema/organizer-settings";
import { workingHoursTable } from "@/configs/db/schema/working-hours";
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

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Create user
      const userResult = await tx
        .insert(userTable)
        .values({
          username: user.username,
          email: user.email,
          password: hashedPassword,
        })
        .returning({
          id: userTable.id,
        });

      if (!userResult || userResult.length === 0) {
        tx.rollback();
        throw new Error("Failed to create user");
      }

      const userId = userResult[0].id;

      // 2. Create organizer settings in same transaction
      const settingsResult = await tx
        .insert(organizerSettingsTable)
        .values({
          userId,
          defaultMeetingDuration: 30, // in minutes
          preBookingBuffer: 0, // in minutes
          postBookingBuffer: 0, // in minutes
          minBookingNotice: 2, // in hours
          maxBookingAdvance: 14, // in days
          workingTimezone: "UTC",
        })
        .returning({
          id: organizerSettingsTable.id,
        });

      if (!settingsResult || settingsResult.length === 0) {
        tx.rollback();
        throw new Error("Failed to create organizer settings");
      }

      // 3. Create default working hours
      const defaultWorkingHours = [
        { dayOfWeek: "1", startTime: "09:00", endTime: "17:00", isActive: true }, // Monday
        { dayOfWeek: "2", startTime: "09:00", endTime: "17:00", isActive: true }, // Tuesday
        { dayOfWeek: "3", startTime: "09:00", endTime: "17:00", isActive: true }, // Wednesday
        { dayOfWeek: "4", startTime: "09:00", endTime: "17:00", isActive: true }, // Thursday
        { dayOfWeek: "5", startTime: "09:00", endTime: "17:00", isActive: true }, // Friday
      ];

      const workingHoursResults = await Promise.all(
        defaultWorkingHours.map((hours) =>
          tx
            .insert(workingHoursTable)
            .values({
              userId,
              dayOfWeek: hours.dayOfWeek,
              startTime: hours.startTime,
              endTime: hours.endTime,
              isActive: hours.isActive,
            })
            .returning({ id: workingHoursTable.id }),
        ),
      );

      // Verify all working hours were created
      if (workingHoursResults.some((result) => !result || result.length === 0)) {
        tx.rollback();
        throw new Error("Failed to create default working hours");
      }

      return { userId, settingsId: settingsResult[0].id, workingHoursCreated: true };
    });

    // 3. Create Redis session (outside DB transaction)
    const token = createSessionToken();
    const redisKey = `${SESSION_PREFIX}:${token}`;
    await redis.set(redisKey, result.userId, {
      EX: SESSION_EXPIRY,
    });

    return { token };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create user" };
  }
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

export async function getUserByUsername(username: string) {
  return await db
    .select({ id: userTable.id, username: userTable.username, email: userTable.email })
    .from(userTable)
    .where(eq(userTable.username, username))
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
