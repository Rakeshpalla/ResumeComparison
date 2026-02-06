import { prisma } from "../lib/db";
import { hashPassword, verifyPassword } from "../lib/auth";

export async function registerUser(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email is already registered.");
  }
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: {
      email,
      passwordHash
    }
  });
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("Invalid credentials.");
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid credentials.");
  }
  return user;
}
