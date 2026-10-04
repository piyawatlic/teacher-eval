import { Header } from "@/components/dashboard/Header";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { CollegeReferences } from "@/components/admin/CollegeReferences";
import { getCollegeReferences, type CollegeSearchParams } from "@/lib/queries/ovec";

export const metadata = { title: "ข้อมูลสถานศึกษา สอศ." };

export default async function ReferenceDataPage({ searchParams }: { searchParams: Promise<CollegeSearchParams> }) {
  const data = await getCollegeReferences(await searchParams);
  return (
    <div className="flex min-h-screen w-full flex-col bg-surface">
      <Header />
      <div className="flex min-w-0 flex-1">
        <AdminSidebar active="Reference data" />
        <main lang="th" className="min-w-0 flex-1 px-4 py-12 sm:px-10">
          <div className="mx-auto flex max-w-[900px] flex-col gap-8">
            <h1 className="text-2xl font-semibold text-foreground">ข้อมูลสถานศึกษา สอศ.</h1>
            <CollegeReferences data={data} />
          </div>
        </main>
      </div>
    </div>
  );
}
