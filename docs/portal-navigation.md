# Portal navigation

Teacher, school-head, student and admin pages share a branded header, desktop sidebar and mobile navigation disclosure. No database migration is needed; deploy the application changes.

## Available navigation

- Teachers/advisers: Workspace and My classes. Subject-specific assessments, attendance, lesson plans and grades remain inside the existing class tabs.
- School heads: workspace/classes plus School accounts, Grading setup and Grade completion. A head without a teaching/advisory role sees School-head workspace and School classes labels.
- Platform admins: All schools, Set up school, and the selected school's Overview, Structure, People, Subjects, Assignments, Accounts, Attendance settings, Grading, Completion and Audit sections. School onboarding uses the same navigation shell.
- Students: My school. Other workspaces appear only when the account also holds their required role.

Mixed-role users can switch workspaces explicitly. There is no highest-role redirect and navigation does not grant permissions. Session checks, server actions and database policies retain their existing authority.

The selected school carries across head-management links when the user manages it. If the current class belongs to a school where the user only teaches, head-management links use their one authorized head school or return to school selection. Admin links remain available on nested class pages. Active items follow both the pathname and query parameters, including admin tabs and grade-completion screens.

## Accessibility and implementation

`components/navigation/portal-chrome.tsx` provides the shared header/sidebar, signed-in display name, pending navigation links, active-page markers, skip link and sign-out. The mobile button announces expanded state; Escape closes navigation and returns focus to the button. Choosing a link or changing the route closes it. This is an inline disclosure, not a modal, so keyboard focus is not trapped.

`components/app-shell.tsx` loads session-derived navigation access on every school page. `components/admin/shell.tsx` requires platform-admin access. `lib/portal-navigation.ts` builds link groups using a minimal access DTO; no full membership records or user ids are passed to the client for navigation. Account metadata supplies display names only.

Unit coverage verifies role-specific links, cumulative roles, school context, nested class links, admin sections and active states. Production browser checks cover protected-route boundaries and existing public flows. Authenticated portal/mobile interaction still requires live verification; no hosted permissions or user records were changed.

Navigation items now include decorative Lucide icons with consistent sizing and inherited active colors. Route loading screens use matching portal header/sidebar geometry and workspace, roster, administration or form placeholders. Skeleton motion respects reduced-motion preferences; placeholders are hidden from assistive technology while a loading status remains available.
