import { cache } from "react";
import { requireAdmin } from "@/lib/auth/require-session";
import { listOvecColleges, OvecError, type OvecErrorCode } from "@/lib/ovec/client";

export type CollegeSearchParams = Record<string, string | string[] | undefined>;
const PAGE_SIZE = 20;

export const getCollegeReferences = cache(async (params: CollegeSearchParams) => {
  // This read-only reference browser is a Portal admin tool, not an evaluation grant.
  await requireAdmin();
  const search = typeof params.search === "string" ? params.search.trim() : "";
  const status = params.status === "all" || params.status === "inactive" ? params.status : "active";
  const rawPage = typeof params.page === "string" ? params.page : "1";
  const page = /^\d{1,6}$/.test(rawPage) && Number(rawPage) > 0 ? Number(rawPage) : 1;
  const filters = { search, status, page };
  if (search.length > 200) return { filters, error: "คำค้นต้องไม่เกิน 200 ตัวอักษร", result: null };

  try {
    const result = await listOvecColleges({
      search: search || undefined,
      isActive: status === "all" ? undefined : status === "active",
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      orderBy: "code",
      order: "asc",
    });
    return { filters, error: null, result };
  } catch (error) {
    if (!(error instanceof OvecError)) throw error;
    const messages: Record<OvecErrorCode, string> = {
      NOT_CONFIGURED: "ยังไม่ได้ตั้งค่าการเชื่อมต่อข้อมูล สอศ. กรุณาติดต่อผู้ดูแลระบบ",
      UNAUTHORIZED: "บริการ สอศ. ปฏิเสธการเข้าถึง กรุณาให้ผู้ดูแลตรวจสอบการตั้งค่า",
      NOT_FOUND: "ไม่พบแหล่งข้อมูลสถานศึกษาในบริการ สอศ.",
      RATE_LIMITED: "มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่",
      UNAVAILABLE: "บริการข้อมูล สอศ. ไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่ภายหลัง",
      INVALID_RESPONSE: "ข้อมูลจากบริการ สอศ. มีรูปแบบไม่ถูกต้อง กรุณาลองใหม่ภายหลัง",
    };
    return { filters, error: messages[error.code], result: null };
  }
});
