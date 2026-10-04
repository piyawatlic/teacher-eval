Phase 0 implementation status — 2026-10-04
===========================================

Phase 0 has started; HR acceptance remains pending. This product brief describes the target
system. The application still runs the legacy Portal account-management foundation.

Prepared deliverables:
- [Foundation inventory, setup runbook and acceptance record](docs/PHASE0.md).
- [HR policy decision register POL-01–14](docs/POLICY-DECISIONS.md), including official criteria,
  aggregation, result bands, authorities, visibility, academic dates and Thai reports.
- [Role/data migration and rollback plan](docs/MIGRATION-PLAN.md), requiring explicit approved
  account mapping and preserving identity/history rather than inferring new roles.
- An isolated Vitest environment in `tests/setup.ts`; unit tests no longer load local `.env` secrets.

Verified with `pnpm test`, `pnpm typecheck` and `pnpm lint`: 3 test files / 26 tests passed, TypeScript passed, ESLint
0 errors / 1 existing image warning. Fresh installation, production build, live DB migration,
SMTP, browser acceptance and restore rehearsal have not been verified in this Phase 0 work.
All HR decisions remain pending; example criteria and scores below are not approved policy.
Phase 0 closes only against the exit gate in [ROADMAP.md](ROADMAP.md) and [SRS](SRs.md).

Selected access architecture — ARCH-01 (2026-10-04)
--------------------------------------------------

Separate user identity from role assignments. A provisioned user can hold one or more roles,
including TEACHER and COMMITTEE simultaneously, without combined role names. Authorization
checks explicit capabilities together with ownership, assignments, account/workflow state and
approved conflict rules; holding ADMIN does not automatically grant every evaluation permission.
Introduce this additively, preserve existing identity and role data, map accounts only after HR
review, update every role consumer, and retain the legacy structure through acceptance testing
and the rollback window. See [migration design](docs/MIGRATION-PLAN.md). This is the selected
architecture; HR authority and mapping approvals remain pending.

Implementation increment — 2026-10-04
-------------------------------------

The additive multi-role schema, explicit capability module and session-based evaluation entry
guard are now implemented in source, with unit tests. The migration has not been deployed or
backfilled. Portal surfaces still use legacy roles; evaluation UI, scoped resource checks and
HR-reviewed mappings remain pending. Validation: 37 tests, typecheck and Prisma validation
passed; lint has one existing warning. See [implementation evidence](docs/PHASE0.md).

Original product brief
======================

Create a modern, professional, responsive WEB APPLICATION for a Thai vocational college called:

“ระบบประเมินผลการปฏิบัติงานครู”
“Teacher Performance Evaluation System”

Organization:
วิทยาลัยการอาชีพลอง
Long Industrial and Community Education College

The system is designed for the HR department and evaluation committees to evaluate teachers efficiently, accurately, transparently, and quickly.

IMPORTANT:
This is NOT a simple presentation or static website.
Build it as an interactive web application/system prototype with navigation, forms, dashboards, tables, scoring controls, automatic calculations, search, filtering, evaluation status, and printable reports.

==================================================

1. SYSTEM OBJECTIVES
   ==================================================

The system must help the college:

1. Register teachers who are being evaluated.
2. Register evaluation committees.
3. Create an evaluation round/year.
4. Assign committee members to teachers.
5. Allow each committee member to score assigned teachers.
6. Calculate scores automatically.
7. Prevent calculation mistakes.
8. Track which teachers have been evaluated.
9. Track incomplete evaluations.
10. Summarize individual and overall results.
11. Generate printable A4 evaluation reports.
12. Provide an administrator/HR dashboard.
13. Provide a committee-member dashboard.
14. Provide a teacher/result-view dashboard if required.
15. Store evaluation data in a structured database.
16. Make the interface easy enough for non-technical staff.

==================================================
2. DESIGN STYLE
===============

Use a premium Thai government/educational organization design.

Visual style:

* Modern 2027 web application
* Professional
* Clean
* Elegant
* Minimal
* Trustworthy
* Institutional
* Easy to read
* Suitable for desktop, tablet, and mobile
* Blue, navy, white and subtle gold accent
* Rounded cards
* Soft shadows
* Clear hierarchy
* Professional data tables
* Modern dashboard
* Use Thai fonts that are highly readable
* Prefer “Noto Sans Thai” or a similar modern Thai font
* Use consistent icons
* Avoid excessive decoration
* Avoid cartoon style
* Avoid overly colorful UI

Header:

* College logo
* “วิทยาลัยการอาชีพลอง”
* “ระบบประเมินผลการปฏิบัติงานครู”
* User profile
* Notification icon
* Logout button

==================================================
3. USER ROLES
=============

Create role-based access:

A. ADMIN / HR
Can:

* Manage teachers
* Manage committee members
* Create evaluation rounds
* Configure evaluation criteria
* Assign committees
* Monitor evaluation progress
* View all scores
* Approve/finalize evaluations
* Generate reports
* Export/print results

B. EVALUATION COMMITTEE
Can:

* Login
* See assigned teachers
* Open evaluation form
* Enter scores
* Add comments/evidence
* Save draft
* Submit evaluation
* View completed evaluations
* Cannot modify evaluations after final submission unless authorized by Admin

C. TEACHER
Can:

* Login
* View personal evaluation information
* View finalized results
* View score breakdown
* View comments/feedback
* Download/print report

==================================================
4. LOGIN PAGE
=============

Create a professional login page.

Elements:

* College logo
* System name
* Username
* Password
* Remember me
* Login button
* Forgot password
* Role-based authentication

Example:

“ยินดีต้อนรับ”
“ระบบประเมินผลการปฏิบัติงานครู”
วิทยาลัยการอาชีพลอง

==================================================
5. ADMIN DASHBOARD
==================

Create a powerful HR dashboard.

Top summary cards:

จำนวนครูที่ประเมิน
จำนวนคณะกรรมการ
รอบการประเมินปัจจุบัน
ประเมินเสร็จแล้ว
อยู่ระหว่างประเมิน
ยังไม่ได้เริ่ม
รอการตรวจสอบ

Use large numbers and small explanatory labels.

Example:

ครูทั้งหมด
48

ประเมินแล้ว
32

กำลังประเมิน
10

ยังไม่เริ่ม
6

Below the cards:

A. Evaluation Progress Chart
Show:

* Completed
* In progress
* Not started

B. Department Summary

Table:

แผนกวิชา | จำนวนครู | ประเมินแล้ว | กำลังประเมิน | ยังไม่เริ่ม | คะแนนเฉลี่ย

C. Recent Activity

Examples:

* นายสมชาย ใจดี ส่งแบบประเมินแล้ว
* นางสาวสุภาวดี ... เริ่มประเมิน
* คณะกรรมการชุดที่ 2 ประเมินครูครบแล้ว

==================================================
6. TEACHER MANAGEMENT
=====================

Create “จัดการข้อมูลครู”

Features:

* Add teacher
* Edit teacher
* Delete/deactivate teacher
* Search
* Filter by department
* Filter by position
* Filter by evaluation round

Teacher table:

รหัส | รูปภาพ | ชื่อ-นามสกุล | ตำแหน่ง | แผนกวิชา | วิทยฐานะ | รอบประเมิน | สถานะ

Each teacher should have:

* Teacher ID
* Prefix
* First name
* Last name
* Position
* Academic rank
* Department
* Phone/email
* Profile photo
* Employment type
* Evaluation history

==================================================
7. COMMITTEE MANAGEMENT
=======================

Create “จัดการคณะกรรมการ”

Committee information:

* Committee ID
* Name
* Position
* Department/organization
* Role
* Contact information
* Active/inactive status

Create committee groups.

Example:

คณะกรรมการชุดที่ 1
ประธานกรรมการ
กรรมการ
กรรมการและเลขานุการ

Allow assigning multiple committee members to each teacher.

==================================================
8. EVALUATION ROUND MANAGEMENT
==============================

Create “รอบการประเมิน”

Admin can create:

ปีการศึกษา
รอบการประเมิน
วันที่เริ่มต้น
วันที่สิ้นสุด
ชื่อการประเมิน
คำอธิบาย
สถานะ

Example:

ปีการศึกษา 2569
รอบที่ 1
การประเมินผลการปฏิบัติงานครู
1 ตุลาคม 2569 – 31 มีนาคม 2570

Status:

* Draft
* Open
* In Progress
* Closed
* Finalized

==================================================
9. COMMITTEE ASSIGNMENT
=======================

Create a visual assignment interface.

Admin selects:

Evaluation Round
↓
Teacher
↓
Committee

Example:

ครู:
นายปิยะวัฒน์ วงศ์ทนะ

Committee:
คณะกรรมการชุดที่ 1

Members:

1. นาย...
2. นาย...
3. นาง...

Allow:

* Add committee
* Remove committee
* Change assignment
* View assignment status

==================================================
10. EVALUATION FORM
===================

This is the MOST IMPORTANT part of the application.

Create a professional evaluation form that is easy for committee members to use.

At the top show:

รูปครู
ชื่อ-นามสกุล
ตำแหน่ง
แผนกวิชา
วิทยฐานะ
รอบการประเมิน
ชื่อคณะกรรมการ

Then show evaluation criteria.

Each criterion should contain:

หัวข้อการประเมิน
รายละเอียด/ตัวชี้วัด
คะแนนเต็ม
คะแนนที่ได้รับ
ความคิดเห็น/ข้อเสนอแนะ
หลักฐาน/หมายเหตุ

Use a clean table.

Score input should be easy:

* Numeric input
* Dropdown
* Slider only if appropriate

Do NOT allow a score greater than the maximum.

Automatically calculate:

คะแนนแต่ละด้าน
คะแนนรวม
คะแนนเต็ม
ร้อยละ
ระดับผลการประเมิน

Example:

คะแนนเต็ม 100
คะแนนที่ได้ 86
คิดเป็น 86%

==================================================
11. EVALUATION CRITERIA STRUCTURE
=================================

Make the criteria configurable by Admin.

Do NOT hard-code the criteria permanently.

Admin should be able to:

* Add criterion
* Edit criterion
* Delete criterion
* Set maximum score
* Set weight
* Set category
* Set description
* Set evaluation instructions

Example categories:

ด้านที่ 1
การจัดการเรียนรู้

ด้านที่ 2
การบริหารจัดการชั้นเรียน

ด้านที่ 3
การพัฒนาตนเองและวิชาชีพ

ด้านที่ 4
การปฏิบัติงานและความรับผิดชอบ

ด้านที่ 5
คุณธรรม จริยธรรม และจรรยาบรรณวิชาชีพ

Allow the college to modify these categories later according to its official evaluation form.

==================================================
12. SCORING LOGIC
=================

The application must automatically calculate scores.

For every category:

Category Score =
sum of scores for all criteria in that category

Overall Score =
sum of all category scores

Percentage =
(Overall Score / Total Maximum Score) × 100

Never allow:
Score > Maximum Score
Score < Minimum Score

Show validation messages.

Example:

“กรุณากรอกคะแนนให้ครบทุกข้อก่อนส่งแบบประเมิน”

If the committee tries to submit an incomplete form, show which criteria are missing.

==================================================
13. MULTIPLE COMMITTEE MEMBERS
==============================

The system must support multiple committee members evaluating the same teacher.

Example:

Teacher A

Committee Member 1 → 88
Committee Member 2 → 91
Committee Member 3 → 90

Automatically calculate:

Average Score =
(88 + 91 + 90) / 3

Show:

คะแนนกรรมการแต่ละคน
คะแนนเฉลี่ย
จำนวนกรรมการที่ส่งแบบประเมิน
จำนวนกรรมการที่ยังไม่ส่ง

Admin can configure whether the final score uses:

* Average
* Weighted average
* Other configurable calculation

==================================================
14. EVALUATION STATUS
=====================

Every evaluation should have a status:

ยังไม่เริ่ม
กำลังประเมิน
บันทึกร่าง
ส่งแล้ว
รอตรวจสอบ
อนุมัติแล้ว
แก้ไข
ยกเลิก

Use visual status badges.

Example:

Green = Completed
Blue = In Progress
Gray = Not Started
Orange = Waiting Review
Red = Problem / Missing

==================================================
15. EVALUATION MONITORING
=========================

Create a monitoring dashboard.

Show:

Teacher | Department | Committee | Progress | Score | Status

Progress bar:
0%
25%
50%
75%
100%

Admin should be able to quickly identify:

* Who has not been evaluated
* Which committee has not submitted
* Which teacher has incomplete evaluation
* Which evaluation is waiting for approval

==================================================
16. TEACHER RESULT PAGE
=======================

Create a detailed result page.

Header:

ผลการประเมินผลการปฏิบัติงานครู

Teacher:
นายปิยะวัฒน์ วงศ์ทนะ

Show:

คะแนนรวม
คะแนนเต็ม
เปอร์เซ็นต์
ระดับผลการประเมิน

Then show category breakdown:

หมวด | คะแนนเต็ม | คะแนนที่ได้ | ร้อยละ

Add a simple chart.

Below:

ข้อเสนอแนะจากคณะกรรมการ

Show comments from committee members.

==================================================
17. REPORT GENERATION
=====================

Create professional printable A4 reports.

Reports should include:

College logo
College name
System title
Evaluation round
Teacher information
Committee information
Evaluation criteria
Individual scores
Category totals
Overall score
Percentage
Result
Committee comments
Signatures

Signature area:

ลงชื่อ........................................กรรมการ
(........................................)

ลงชื่อ........................................กรรมการ
(........................................)

ลงชื่อ........................................ประธานกรรมการ
(........................................)

วันที่........................................

Make the report suitable for printing on A4 paper.

Use Thai government-document style:

* White background
* Black text
* Formal typography
* Thin borders
* Proper spacing
* No unnecessary UI elements when printing.

==================================================
18. EXPORT
==========

Provide buttons:

พิมพ์รายงาน
ดาวน์โหลด PDF
ส่งออก Excel
ส่งออก CSV

Admin can export:

* Individual teacher report
* Department report
* Overall evaluation report
* Committee report
* Score summary

==================================================
19. SEARCH AND FILTER
=====================

Global search:

ค้นหาชื่อครู
ค้นหารหัส
ค้นหาแผนก
ค้นหาคณะกรรมการ

Filters:

ปีการศึกษา
รอบการประเมิน
แผนกวิชา
ตำแหน่ง
วิทยฐานะ
สถานะ
คณะกรรมการ

==================================================
20. NOTIFICATION SYSTEM
=======================

Create notifications.

Examples:

🔔
“มีการประเมินใหม่ที่รอดำเนินการ”

“คุณยังมีครู 2 คนที่ยังไม่ได้ประเมิน”

“การประเมินของนาย... ครบถ้วนแล้ว”

“การประเมินถูกส่งให้ HR ตรวจสอบแล้ว”

==================================================
21. DATABASE STRUCTURE
======================

Design the application with a structured database.

Suggested collections/tables:

users
teachers
committee_members
evaluation_rounds
evaluation_assignments
evaluation_categories
evaluation_criteria
evaluations
evaluation_scores
comments
notifications
departments
reports

Relationships:

Teacher
↓
Evaluation Round
↓
Committee Assignment
↓
Evaluation
↓
Criteria
↓
Scores
↓
Comments

Do not duplicate unnecessary data.

==================================================
22. DATA SECURITY
=================

Implement role-based access.

ADMIN:
Can access everything.

COMMITTEE:
Can only access assigned teachers.

TEACHER:
Can only view own information and finalized evaluation results.

Prevent committee members from seeing evaluations belonging to other committees unless authorized.

Prevent editing submitted evaluations unless Admin reopens them.

==================================================
23. DASHBOARD VISUALIZATION
===========================

Use charts such as:

1. Evaluation completion donut chart
2. Department score comparison
3. Monthly evaluation progress
4. Score distribution
5. Evaluation status chart

Charts should be simple and readable.

==================================================
24. MOBILE RESPONSIVE DESIGN
============================

The committee may evaluate teachers using:

* Desktop
* Laptop
* Tablet
* Smartphone

On mobile:

Convert tables into cards where necessary.

Make score input buttons large enough for touch.

Keep navigation simple.

==================================================
25. NAVIGATION
==============

Create a left sidebar on desktop.

Menu:

🏠 Dashboard

👨‍🏫 ข้อมูลครู

👥 คณะกรรมการ

📅 รอบการประเมิน

🔗 มอบหมายกรรมการ

📝 แบบประเมิน

📊 ผลการประเมิน

📈 รายงานและสถิติ

🔔 การแจ้งเตือน

⚙️ ตั้งค่าระบบ

On mobile use a hamburger menu.

==================================================
26. SAMPLE DATA
===============

Create realistic sample data for demonstration.

Teachers:
At least 8 sample teachers.

Departments:

* แผนกวิชาช่างกลโรงงาน
* แผนกวิชาช่างไฟฟ้า
* แผนกวิชาช่างยนต์
* แผนกวิชาอิเล็กทรอนิกส์
* แผนกวิชาการบัญชี
* แผนกวิชาเทคโนโลยีธุรกิจดิจิทัล
* แผนกวิชาสามัญสัมพันธ์

Committee:
At least 5 sample committee members.

Evaluation round:
ปีการศึกษา 2569
รอบที่ 1

==================================================
27. USER EXPERIENCE
===================

The evaluation process should be:

LOGIN
↓
Committee Dashboard
↓
Assigned Teachers
↓
Select Teacher
↓
Start Evaluation
↓
Enter Scores
↓
Add Comments
↓
Save Draft
↓
Review
↓
Submit
↓
Confirmation
↓
Admin Review
↓
Finalize
↓
Report

Make this workflow extremely clear.

==================================================
28. IMPORTANT VALIDATION
========================

Before submission:

Check:
✓ All required scores entered
✓ Scores within allowed range
✓ Required comments completed if necessary
✓ Correct evaluation round
✓ Correct teacher
✓ Correct committee member

Show a confirmation dialog:

“ยืนยันการส่งแบบประเมินหรือไม่?”

“เมื่อส่งแล้วจะไม่สามารถแก้ไขข้อมูลได้จนกว่า HR จะเปิดให้แก้ไขอีกครั้ง”

Buttons:
“ยกเลิก”
“ยืนยันการส่ง”

==================================================
29. ADMIN SETTINGS
==================

Admin settings should include:

ชื่อวิทยาลัย
โลโก้
ปีการศึกษา
รอบการประเมิน
เกณฑ์คะแนน
ระดับผลการประเมิน
รูปแบบรายงาน
สิทธิ์ผู้ใช้งาน
การแจ้งเตือน

Allow the administrator to configure the system without changing code.

==================================================
30. SAMPLE RESULT LEVEL
=======================

Make result levels configurable.

Example only:

90–100 = ดีเยี่ยม
80–89 = ดีมาก
70–79 = ดี
60–69 = พอใช้
ต่ำกว่า 60 = ต้องปรับปรุง

The Admin must be able to change these ranges.

==================================================
31. IMPORTANT TECHNICAL REQUIREMENT
===================================

Build the prototype so that it can later be connected to a real backend/database.

Use reusable components.

Keep:

* UI
* data
* scoring logic
* authentication
* reports

separated logically.

Do not create a fake static interface where buttons do nothing.

Interactive elements should work within the prototype.

Use sample/local data initially if a real backend is not available.

Design the system so it can later connect to Firebase or another database.

==================================================
32. FINAL UI REQUIREMENT
========================

The final application should look like a professional SaaS administration platform rather than a school project.

Prioritize:

1. Easy evaluation
2. Accurate score calculation
3. Clear status tracking
4. Fast HR administration
5. Professional reports
6. Mobile usability
7. Data security
8. Clean visual design

The most important screen is the COMMITTEE EVALUATION FORM.

Make scoring extremely fast:
Committee should be able to open a teacher → enter scores → review → submit without unnecessary steps.

Create a polished, realistic, fully navigable web application prototype with all major screens connected through the navigation.



## Deployment and reference API update — 2026-10-04

Applied `20261004000000_add_evaluation_role_assignments` to the configured Supabase database
(schema `portal`) using Prisma migrate deploy. Prisma migrate status confirms all 10 migrations
are applied. This supersedes earlier "not applied" status notes; no role backfill was performed.

The project now includes the OVEC master-data API as an authorized external reference source.
Read-only authenticated catalogue and college-search calls returned HTTP 200; the college code
is `1354036401`. See [OVEC integration notes](docs/OVEC-API.md) for the contract and boundaries.
Application API client/UI integration remains pending; official scoring policy still requires HR.
