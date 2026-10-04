"use server";

import { AuthError } from "next-auth";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { signIn, signOut, TwoFactorRequired, TooManySignInAttempts } from "@/auth";
import { DEFAULT_SIGNED_IN_PATH } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/auth/password";
import { bootstrapUser } from "@/lib/bootstrap";
import { sendVerificationEmail } from "@/lib/auth/email-verification";
import { logAudit } from "@/lib/audit";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  needsCode?: boolean;
};

const signInSchema = z.object({
  email: z.email("กรุณากรอกอีเมลให้ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "กรุณากรอกรหัสยืนยัน 6 หลัก")
    .optional(),
});

const signUpSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(100),
    lastName: z.string().trim().max(100).optional(),
    email: z.email("Enter a valid email address"),
    password: passwordSchema,
  })
  .strip();

/** Safe relative redirect target — never allow an absolute URL from the query. */
function safeCallbackUrl(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : DEFAULT_SIGNED_IN_PATH;
}

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawCode = formData.get("code");
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    code: rawCode ? rawCode : undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      // signIn() serializes options through URLSearchParams, which coerces
      // an undefined value to the literal string "undefined" — omit the key
      // entirely rather than pass code: undefined when none was submitted.
      ...(parsed.data.code ? { code: parsed.data.code } : {}),
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    // A *successful* signIn throws a redirect. Let it through untouched;
    // swallowing it would make every good login look like a failure.
    unstable_rethrow(error);
    if (error instanceof TooManySignInAttempts) {
      return { error: "พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่" };
    }
    if (error instanceof TwoFactorRequired) {
      return {
        needsCode: true,
        error: parsed.data.code
          ? "รหัสยืนยันไม่ถูกต้อง กรุณาลองอีกครั้ง"
          : "กรุณากรอกรหัส 6 หลักจากแอปยืนยันตัวตน",
      };
    }
    if (error instanceof AuthError) {
      return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    }
    throw error;
  }

  return {};
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { firstName, lastName, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return { fieldErrors: { email: "An account with this email already exists." } };
  }

  const { user, isFirstUser } = await bootstrapUser({
    email,
    firstName,
    lastName,
    password,
  });

  await logAudit({
    actorId: user.id,
    targetUserId: user.id,
    action: isFirstUser
      ? "Created the first account (admin)"
      : "Created an account",
    actionCode: "account.created",
    method: "POST",
    statusCode: 201,
  });

  // Best-effort: sign-up must remain usable on a fresh install with no SMTP
  // configured yet, so a missing config or a send failure never blocks it.
  await sendVerificationEmail(email, [firstName, lastName].filter(Boolean).join(" "));

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Try signing in." };
    }
    throw error;
  }

  return {};
}

export async function signOutAction() {
  await signOut({ redirectTo: "/signin" });
}
