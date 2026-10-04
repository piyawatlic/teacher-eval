import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/SignInForm";
import { GoogleButton } from "@/components/auth/GoogleButton";
import {
  AuthCard,
  AuthHeading,
  OrDivider,
} from "@/components/auth/AuthPrimitives";
import { AuthErrorToast } from "@/components/auth/AuthErrorToast";
import { googleEnabled } from "@/lib/env";
import { DEFAULT_SIGNED_IN_PATH } from "@/auth.config";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

/** Auth.js reports provider/callback failures by redirecting here with ?error. */
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  OAuthAccountNotLinked:
    "อีเมลนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านก่อน แล้วเชื่อมต่อ Google ในการตั้งค่าบัญชี",
  OAuthSignin: "ไม่สามารถเริ่มเข้าสู่ระบบด้วย Google กรุณาลองอีกครั้ง",
  OAuthCallback: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองอีกครั้ง",
  AccessDenied: "คุณไม่มีสิทธิ์เข้าถึงระบบนี้",
  Configuration: "การตั้งค่าการเข้าสู่ระบบมีปัญหา กรุณาติดต่อผู้ดูแลระบบ",
};

function safePath(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.startsWith("/") && !raw.startsWith("//")
    ? raw
    : DEFAULT_SIGNED_IN_PATH;
}

export default async function SignInPage({
  searchParams,
}: PageProps<"/signin">) {
  // Next 16: searchParams is a Promise.
  const params = await searchParams;
  const callbackUrl = safePath(params.callbackUrl);
  const errorKey = Array.isArray(params.error) ? params.error[0] : params.error;
  const errorMessage = errorKey
    ? (ERROR_MESSAGES[errorKey] ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง")
    : null;

  return (
    <AuthCard>
      <AuthHeading
        title="เข้าสู่ระบบ"
        description="กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบ"
      />

      {errorMessage && <AuthErrorToast message={errorMessage} />}

      <SignInForm callbackUrl={callbackUrl} />

      {googleEnabled && (
        <>
          <OrDivider />
          <GoogleButton callbackUrl={callbackUrl} />
        </>
      )}
    </AuthCard>
  );
}
