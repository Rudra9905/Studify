# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

All commands are run from the repository root and use npm (a `package-lock.json` is present).

- Install dependencies:
  - `npm install`
- Start the development server (Vite + React):
  - `npm run dev`
  - The app serves on `http://localhost:5173` (see `vite.config.ts`).
- Build for production:
  - `npm run build`
  - Output is written to `dist/`.
- Preview the production build locally:
  - `npm run preview`
  - Run `npm run build` first.
- Type-check the codebase (only TypeScript, no ESLint):
  - `npm run lint` (runs `tsc --noEmit`).

### Tests

There is currently **no** test script configured in `package.json` and no dedicated test runner set up. Add an appropriate test setup (e.g. Vitest/RTL/Jest) before expecting test commands or single-test runs to work.

## Architecture overview

### Tooling and stack

- Build tool: Vite (`vite.config.ts`) with `@vitejs/plugin-react-swc`.
- Language and UI: React 18+/19 with TypeScript.
- Routing: `react-router-dom` using `BrowserRouter`, `Routes`, and nested layouts.
- Styling: Tailwind CSS 4, configured via `tailwind.config.cjs` and imported in `src/index.css` using the new `@import "tailwindcss"` syntax. Custom theme extensions include `primary` and `accent` color palettes, a `soft` box shadow, and rounded `xl`/`2xl` radii.
- Notifications: `react-hot-toast` (`<Toaster />` is wired at the root).
- HTTP client: Axios, via a shared instance in `src/services/apiClient.ts`.

### Entry point and global providers

- `src/main.tsx` is the browser entry point.
  - Creates the React root and wraps the app with:
    - `BrowserRouter` for client-side routing.
    - `AuthProvider` (from `src/context/AuthContext.tsx`) to provide authentication state.
    - Global `<Toaster position="top-right" />` for toast notifications.
  - Imports `src/index.css`, which applies Tailwind layers and base styles (e.g. `body` background and the `.app-shell` utility class).

### Routing, layouts, and protected areas

- `src/App.tsx` contains the top-level route configuration.
  - Defines a `ProtectedRoute` component that reads `user` from the auth context and redirects unauthenticated users to `/login` using `<Navigate />`.
  - Route groups:
    - **Auth routes** (public, under `AuthLayout`):
      - `/login` → `LoginPage` (`src/pages/auth/LoginPage.tsx`).
      - `/register` → `RegisterPage` (`src/pages/auth/RegisterPage.tsx`).
    - **App routes** (protected, under `AppLayout` and `ProtectedRoute`):
      - `/dashboard` → `DashboardPage`.
      - `/calendar` → `CalendarPage`.
      - `/classes` → `ClassesPage`.
      - `/classes/:id` and `/class/:id` → `ClassDetailPage` (both forms are supported).
      - `/assignments` → `AssignmentsPage`.
      - `/assignments/:id` → `AssignmentDetailPage`.
      - `/profile` → `ProfilePage`.
      - `/meet/:meetingCode` → `MeetingPage`.
      - `/` → redirects to `/dashboard`.
    - Fallback:
      - `*` → redirects to `/dashboard`.

- Layout components:
  - `src/layouts/AuthLayout.tsx` renders the centered auth card, shared branding, and a "Back to app" link. All auth pages render inside an `<Outlet />` here.
  - `src/layouts/AppLayout.tsx` defines the main application shell:
    - Fixed top `Navbar`.
    - Persistent left `Sidebar` similar to Google Classroom.
    - Main content area that hosts page content via `<Outlet />` and uses the `.app-shell` Tailwind helper.
  - `src/components/layout/Navbar.tsx` shows app branding and signed-in user info, with a `Logout` button wired to `useAuth().logout()`.
  - `src/components/layout/Sidebar.tsx`:
    - Primary navigation (`/dashboard`, `/calendar`, `/assignments`, `/profile`).
    - "Enrolled" section listing the user’s classrooms, loaded from `classroomApi.getClassrooms(...)` based on role.
    - Uses `NavLink` to keep active state in sync with the router.

### Authentication and user state

- `src/context/AuthContext.tsx` manages auth state:
  - Types:
    - `UserRole` is `'TEACHER' | 'STUDENT'`.
    - `User` captures `id`, `name`, `email`, `role`.
  - `AuthProvider` state:
    - Stores `{ user, token }` in React state and persists it to `localStorage` under the key `smart-classroom-auth`.
    - On initialization, `loadStoredAuth()` rehydrates auth state from `localStorage`.
    - Exposes `login(user, token)` and `logout()` functions.
  - `useAuthContext`/`useAuth` (in `src/hooks/useAuth.ts`) are the main way the app accesses auth; most pages and components call `useAuth()`.

- `src/types/domain.ts` re-exports `User` and `UserRole` from the auth context and defines shared domain types:
  - `Classroom`, `Announcement`, `Assignment`, `StudentAssignment`, `AssignmentStatistics`, `NonSubmittedStudent`, `Member`, `Submission`, `ChatMessage`, `DashboardSummary`.
  - IDs are generally normalized to `string` even if backend DTOs use numeric IDs; the API layer handles conversion.

### Backend integration and API layer

All HTTP calls go through a shared Axios instance:

- `src/services/apiClient.ts`:
  - `API_BASE_URL = 'http://localhost:8080/api'`.
  - Creates `apiClient` with `baseURL` and JSON headers.
  - Registers a request interceptor that reads the `smart-classroom-auth` item from `localStorage` and, if a `token` exists, attaches `Authorization: Bearer <token>` to outgoing requests.
  - Exports `useApiClient()` hook that currently returns the shared instance while accessing the auth context to ensure React hook ordering remains valid when used in components.

Feature-specific service modules encapsulate REST endpoints and DTO → domain mappings:

- `src/services/authApi.ts`:
  - `login(payload)` → POST `/auth/login` → `{ token: string | null; user: User }`.
  - `register(payload)` → POST `/auth/register` → same response shape.

- `src/services/classroomApi.ts`:
  - Works with DTOs from `/classrooms` endpoints and maps them to domain `Classroom`, `Member`, and `Announcement` types.
  - Key methods:
    - `getClassrooms({ teacherId?, studentId? })` → lists classes by teacher or student.
    - `createClassroom(teacherId, payload)` → creates a class.
    - `joinClassroom(userId, code)` and `leaveClassroom(classroomId, userId)`.
    - `getClassroom(id)` and `deleteClassroom(id)`.
    - Announcement endpoints: `getAnnouncements`, `createAnnouncement`, `deleteAnnouncement`, `clearAnnouncementAttachment`.
    - Assignment listing for a class: `getAssignments(classroomId)`.
    - `getMembers(classroomId)` to list class members and their roles.

- `src/services/assignmentApi.ts`:
  - Assignment-centric operations:
    - `getAssignment(id)` → single assignment detail.
    - `getStudentAssignments(userId, role?)` → list of `StudentAssignment` across classes (used by dashboard and assignments views).
    - Submission flows: `getSubmissions`, `getMySubmission`, `submitAssignment`, `gradeSubmission`.
    - Management: `updateAssignment`, `deleteAssignment`, `getAssignmentStatistics`, `getNonSubmittedStudents`.

- `src/services/chatApi.ts`:
  - Class-level chat under `/classrooms/:classroomId/chat/...`:
    - `getMessages(classroomId, userId)` → returns `ChatMessage[]` after mapping backend DTOs.
    - `sendMessage(classroomId, senderId, { content })`.
    - `clearMessages(classroomId, requesterId)` for teachers to wipe chat history.

- `src/services/fileApi.ts`:
  - `upload(file: File)` → POST `/files/upload` as multipart form data.
  - Returns the uploaded file URL; used for both announcements/assignments (materials) and chat attachments.

- `src/services/meetingClient.ts` and `src/pages/meeting/MeetingPage.tsx`:
  - `createMeetingClient(options)` encapsulates WebRTC peer connection logic and WebSocket signaling.
    - Connects to `ws://localhost:8080/ws/meet`.
    - Handles `offer`/`answer`/`ice-candidate` messages, participant join/leave events, and a `raise-hand` signal.
    - Maintains a `Map<string, RTCPeerConnection>` keyed by remote user ID and manages track updates when the local media stream changes (e.g. screen sharing).
  - The `MeetingPage`:
    - Reads `meetingCode` from the route (`/meet/:meetingCode`) and treats it as a `classroomId` for signaling.
    - Manages camera/mic/screenshare streams and passes them into the meeting client via `setLocalStream`.
    - Tracks participants and raised hands in local state.
    - Provides a Google Meet–like UI with a video grid, control bar, optional side panels, and meeting duration tracking.

### Feature pages and cross-page behavior

The app’s feature pages sit on top of the auth and API layers described above. Key ones:

- `src/pages/dashboard/DashboardPage.tsx`:
  - Uses `useAuth()` to get the current user.
  - Loads:
    - The user’s classrooms via `classroomApi.getClassrooms(...)`.
    - The user’s assignments via `assignmentApi.getStudentAssignments(...)`.
  - Computes summary metrics: class count, pending assignments, and upcoming deadlines.
  - Renders:
    - Overview cards (classes, to-do, upcoming) using `Card` + `Spinner` UI primitives.
    - A grid of classroom tiles linking into `/class/:id`.
    - A compact "To-do" list pointing to specific assignments.
  - Subscribes to the `window` `focus` event and reloads data whenever the window regains focus. Other pages dispatch `new Event('focus')` on `window` after mutating important data (e.g. creating a class or submitting an assignment), which is the main cross-page refresh mechanism.

- `src/pages/classes/ClassesPage.tsx`:
  - Teacher/student-aware view of the user’s classes.
  - Uses `classroomApi.getClassrooms(...)` plus `createClassroom` and `joinClassroom` operations.
  - After class creation, it dispatches `window.dispatchEvent(new Event('focus'))` when on `/dashboard` so the dashboard summary stays in sync.

- `src/pages/classes/ClassDetailPage.tsx`:
  - Central hub for a single class, with a tabbed interface (`Tabs` component) for:
    - **Stream**: announcements and optional attachments (files uploaded through `fileApi`, persisted via `classroomApi.createAnnouncement`). Teachers can remove attachments or entire announcements.
    - **Assignments**: class-specific assignment list and a teacher-only "Create assignment" flow that uses `classroomApi.createAssignment` and optional file uploads.
    - **Members**: renders class members (`classroomApi.getMembers`) with role badges.
    - **Chat**: class chat view built on `chatApi` + `fileApi`, including:
      - Polling for new messages when the tab is active (every 2 seconds) and only auto-scrolling when the user is near the bottom.
      - A message composer with emoji picker and file attachment support (attachments encoded as `filename` + URL in the message content and rendered specially).
      - Teacher-only "Clear chat" action via `chatApi.clearMessages(...)`.
    - **Live**: simple entry point into the meeting flow where teachers can generate a 6-digit meeting code (`/meet/:code`) and students can join with an existing code.
  - Also exposes a student-only "Leave class" action (`classroomApi.leaveClassroom`) that redirects back to `/classes`.

- `src/pages/assignments/AssignmentsPage.tsx` and `AssignmentDetailPage.tsx`:
  - `AssignmentsPage`:
    - Shows all assignments across classes for the current user using `assignmentApi.getStudentAssignments`.
    - Provides filters (all/pending/submitted/graded) implemented via tabs.
  - `AssignmentDetailPage`:
    - Loads a single assignment and, depending on role:
      - For students: shows the user’s submission status and a form to submit a URL or upload a file (upload handled via `fileApi` and `assignmentApi.submitAssignment`). Prevents submission after the deadline.
      - For teachers: loads all submissions, statistics, and non-submitted students, and exposes grading and deadline-editing flows (`assignmentApi.updateAssignment`, `gradeSubmission`, and related stats endpoints).
    - After student submissions, dispatches `window` `focus` events on `/assignments` and `/dashboard` so those views refresh their data.

- Other pages (`CalendarPage`, `ProfilePage`, etc.) follow the same patterns: they consume `useAuth()` and the typed service modules rather than hitting `apiClient` directly.

### UI component library and styling conventions

- `src/components/ui` contains reusable primitives tailored to the Tailwind theme:
  - `Button`, `Card`, `Input`, `Modal`, `Spinner`, `Tabs`, `Badge`, `Avatar`, etc.
  - These components encapsulate Tailwind class combinations and common sizes/variants (e.g. `Button` `variant` and `size` props), keeping page components mostly declarative.
- Layout and high-level structure use Tailwind utility classes consistently, driven by the custom theme in `tailwind.config.cjs` and the global `index.css` layers.

### Data flow and state management patterns

- Global state is intentionally minimal:
  - Auth state lives in `AuthProvider`.
  - Most other data (classes, assignments, chat messages, etc.) is fetched per-page via the service modules and stored in component-local `useState`.
- There is no React Query or similar caching layer; cross-page consistency is handled by explicit reloads and the shared `window` `focus` pattern described above.
- IDs from the backend are often numeric but are converted to strings at the API layer; UI code should treat entity IDs as strings and rely on the domain types from `src/types/domain.ts` rather than raw Axios DTOs.
