import Link from "next/link";
import { SettingsCard, SectionHeading } from "@/components/account/SettingsPrimitives";
import type { getCollegeReferences } from "@/lib/queries/ovec";

type Data = Awaited<ReturnType<typeof getCollegeReferences>>;
const control = "min-h-11 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2";

export function CollegeReferences({ data }: { data: Data }) {
  const { filters, result, error } = data;
  function pageHref(page: number) {
    return `/admin/reference-data?${new URLSearchParams({ search: filters.search, status: filters.status, page: String(page) })}`;
  }
  return (
    <section className="flex flex-col gap-6" lang="th">
      <SectionHeading title="ค้นหาสถานศึกษา" description="ข้อมูลอ้างอิงจาก สอศ. สำหรับตรวจสอบชื่อและรหัสสถานศึกษา" />
      <form action="/admin/reference-data" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="college-search" className="text-sm text-foreground">ชื่อหรือรหัสสถานศึกษา</label>
          <input id="college-search" name="search" defaultValue={filters.search} maxLength={200} className={control} placeholder="เช่น วิทยาลัยการอาชีพลอง" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="college-status" className="text-sm text-foreground">สถานะ</label>
          <select id="college-status" name="status" defaultValue={filters.status} className={control}>
            <option value="active">ใช้งาน</option><option value="inactive">ไม่ใช้งาน</option><option value="all">ทั้งหมด</option>
          </select>
        </div>
        <button type="submit" className={`${control} font-semibold hover:bg-hover`}>ค้นหา</button>
      </form>
      {error ? (
        <SettingsCard><div role="alert" className="flex flex-col gap-3 p-5 text-sm text-foreground">
          <p>{error}</p>
          <Link href={pageHref(filters.page)} className="underline">ลองอีกครั้ง</Link>
        </div></SettingsCard>
      ) : result && (
        <>
          <p role="status" className="text-sm text-foreground-secondary">พบ {result.meta.totalCount.toLocaleString("th-TH")} รายการ · หน้า {filters.page.toLocaleString("th-TH")}</p>
          <SettingsCard>
            {result.data.length === 0 ? <p className="p-6 text-sm text-foreground-secondary">ไม่พบสถานศึกษาในหน้านี้ ลองเปลี่ยนคำค้นหรือกลับไปหน้าแรก</p> : (
              <ul className="w-full divide-y divide-border">
                {result.data.map((college) => <li key={college.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="break-words font-medium text-foreground">{college.nameTh}</h2>
                    {college.nameEn && <p lang="en" className="break-words text-sm text-foreground-secondary">{college.nameEn}</p>}
                    <p className="mt-2 text-sm text-foreground-secondary">รหัสสถานศึกษา: <span className="font-mono">{college.code}</span></p>
                  </div>
                  <span className="shrink-0 text-sm text-foreground-secondary">{college.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}</span>
                </li>)}
              </ul>
            )}
          </SettingsCard>
          <nav aria-label="หน้าผลการค้นหา" className="flex flex-wrap gap-3 text-sm text-foreground">
            {filters.page > 1 && <><Link href={pageHref(1)} className={control}>หน้าแรก</Link><Link href={pageHref(filters.page - 1)} className={control}>ก่อนหน้า</Link></>}
            {result.meta.hasNextPage && <Link href={pageHref(filters.page + 1)} className={control}>ถัดไป</Link>}
          </nav>
        </>
      )}
      <p className="text-sm text-foreground-muted">หน้านี้ใช้ดูข้อมูลอ้างอิง การค้นหาไม่เปลี่ยนสถานศึกษาที่ตั้งค่าไว้ในระบบ</p>
    </section>
  );
}
