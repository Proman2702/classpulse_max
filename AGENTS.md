# AGENTS.md

Write all project codebase features and architecture organization and your history in HISTORY.md when working on tasks. If you forgot something about project or just want to be sure how to code in this project, first read this file.

## Project Overview

**Class Pulse** is a MAX Mini App for communication and feedback between students and teachers.

Main goals:

- collect student feedback during or after lessons;
- track mood, engagement, attention, and understanding;
- give teachers simple aggregated feedback;
- provide quick communication between students and teachers;
- support anonymous feedback where appropriate;
- work inside MAX as a Mini App.

This is a student / hackathon-scale project.

The codebase must remain simple enough for a junior developer to understand and modify.

---

# Tech Stack

Frontend:

- TypeScript
- React
- Vite
- MAX Mini App / WebApp API
- Supabase JavaScript SDK

Backend / data:

- Supabase
- PostgreSQL
- Supabase Edge Functions when server-side logic is required

Do not introduce additional backend frameworks unless they are actually needed.

Do not add Redux, MobX, GraphQL, NestJS, microservices, Clean Architecture, DDD, CQRS, repositories, use-case layers, or similar abstractions without a concrete reason.

---

# Main Development Principle

Prefer the simplest implementation that is:

1. readable;
2. type-safe;
3. reasonably secure;
4. easy to modify;
5. sufficient for the current task.

Do not build abstractions for hypothetical future requirements.

Do not create an interface, service, factory, repository, provider, manager, controller, adapter, or wrapper just because such a pattern exists.

Before adding abstraction, ask:

> Does this reduce complexity in the current project?

If not, do not add it.

---

# Code Style

Code must be understandable by a junior TypeScript / React developer.

Prefer:

```ts
const loadLessons = async () => {
  const { data, error } = await supabase
    .from("lessons")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  setLessons(data);
};
```

over unnecessarily abstract code such as:

```ts
const lessonRepository =
  RepositoryFactory.create<LessonRepository>(
    new SupabaseLessonDataSource(...)
  );
```

Keep functions small and give them clear names.

Prefer explicit code over clever code.

Avoid deeply nested expressions.

Avoid advanced TypeScript tricks unless they genuinely improve the code.

Do not use complex generic types where normal interfaces would work.

Prefer:

```ts
interface Student {
  id: string;
  name: string;
}
```

over complicated mapped or conditional types.

---

# React Rules

Use functional React components.

Use hooks:

- `useState`
- `useEffect`
- `useMemo`
- `useCallback`

only when necessary.

Do not use `useMemo` or `useCallback` automatically.

Do not optimize components without evidence that optimization is needed.

Keep local state local.

Example:

```tsx
const [mood, setMood] = useState<number | null>(null);
```

Do not move simple component state into a global store.

Create shared/global state only for data that is genuinely shared across multiple unrelated parts of the application.

Typical global data may include:

- current user;
- MAX user information;
- authentication state.

---

# Components

A component should normally represent a visible UI element.

Examples:

```text
MoodSelector
LessonCard
StudentFeedbackForm
TeacherDashboard
ClassCard
AnonymousMessageForm
```

Do not split every `<div>` into a separate component.

Create a component when:

- it is reused;
- it contains meaningful UI logic;
- separating it makes the parent component easier to understand.

---

# Suggested Project Structure

Keep the structure simple.

```text
src/
├── components/
│   ├── LessonCard.tsx
│   ├── MoodSelector.tsx
│   └── LoadingSpinner.tsx
│
├── pages/
│   ├── StudentHomePage.tsx
│   ├── TeacherHomePage.tsx
│   ├── LessonPage.tsx
│   └── FeedbackPage.tsx
│
├── lib/
│   ├── supabase.ts
│   └── max.ts
│
├── api/
│   ├── lessons.ts
│   ├── feedback.ts
│   └── classes.ts
│
├── types/
│   └── index.ts
│
├── App.tsx
└── main.tsx
```

Do not introduce additional layers unless the project actually grows enough to require them.

For example, do not create:

```text
domain/
application/
infrastructure/
repositories/
entities/
usecases/
datasources/
controllers/
```

for ordinary Supabase CRUD.

---

# Supabase

Use Supabase as the main database.

Use PostgreSQL relations naturally.

Prefer normalized relational data over large duplicated JSON objects.

Possible main tables:

```text
users
classes
class_members
lessons
feedback
messages
polls
poll_answers
```

Example relationships:

```text
users
  id
  max_user_id
  name
  role

classes
  id
  teacher_id
  name

class_members
  class_id
  student_id

lessons
  id
  class_id
  teacher_id
  title
  started_at

feedback
  id
  lesson_id
  student_id
  mood
  attention
  understanding
  comment
  created_at
```

Use UUIDs for internal database identifiers.

Keep `max_user_id` separately as the identifier received from MAX.

---

# Supabase Queries

Keep simple queries close to the relevant feature.

A small API module is preferred.

Example:

```ts
export const getLessons = async () => {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .order("started_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};
```

Usage:

```ts
const lessons = await getLessons();
```

Do not introduce repository patterns just to wrap Supabase.

---

# MAX Mini App Authentication

Never trust user identity received directly from client-side values.

In particular, do not treat data equivalent to `initDataUnsafe` as verified authentication.

MAX initialization data must be validated on the server side.

Recommended flow:

```text
MAX
 ↓
Mini App
 ↓
MAX initData
 ↓
Supabase Edge Function
 ↓
validate MAX signature
 ↓
extract verified MAX user ID
 ↓
find/create user in Supabase
```

Never allow the client to freely send:

```json
{
  "userId": "some-other-user-id"
}
```

and treat it as authenticated identity.

User identity must come from validated MAX data.

Secrets such as:

- bot token;
- service role key;
- server secrets;

must never be included in frontend code.

---

# Environment Variables

Frontend environment variables should only contain values safe to expose to the browser.

Example:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not expose:

```env
SUPABASE_SERVICE_ROLE_KEY
MAX_BOT_TOKEN
```

inside frontend code.

Server secrets belong in Supabase Edge Function secrets or another server-side environment.

---

# Database Security

Use Supabase Row Level Security where practical.

Users should only access data they are allowed to access.

Examples:

A student should not be able to:

- edit another student's profile;
- modify another student's feedback;
- access private teacher-only information.

A teacher should only manage classes they own or teach.

Do not rely only on hiding buttons in the frontend.

Frontend checks improve UX.

Database/server checks provide security.

---

# Error Handling

Do not silently ignore errors.

Bad:

```ts
try {
  await saveFeedback();
} catch {}
```

Better:

```ts
try {
  await saveFeedback();
} catch (error) {
  console.error("Failed to save feedback:", error);
  setError("Не удалось отправить отзыв");
}
```

Show understandable messages to users.

Keep technical details in logs.

---

# Loading States

Every async UI action should consider:

- loading;
- success;
- error.

Example:

```tsx
if (loading) {
  return <LoadingSpinner />;
}

if (error) {
  return <p>{error}</p>;
}

return <LessonList lessons={lessons} />;
```

Do not add complicated state machines for simple requests.

---

# TypeScript

Avoid `any`.

Use `unknown` when the type is genuinely unknown.

Prefer:

```ts
catch (error: unknown) {
  console.error(error);
}
```

Define interfaces for important application data.

Example:

```ts
export interface Lesson {
  id: string;
  classId: string;
  title: string;
  startedAt: string;
}
```

Do not create types for every tiny temporary object.

---

# Naming

Use clear English names in code.

Good:

```ts
loadLessons()
submitFeedback()
currentUser
selectedMood
isLoading
```

Bad:

```ts
doStuff()
handler2()
data123()
obj()
tempManager()
```

Boolean values should normally use prefixes such as:

```text
is
has
can
should
```

Examples:

```ts
isLoading
hasSubmittedFeedback
canEditLesson
```

---

# Comments

Comments should explain **why**, not repeat what the code already says.

Bad:

```ts
// Set loading to true
setLoading(true);
```

Useful:

```ts
// MAX init data is verified server-side because client data can be modified.
```

Do not over-comment obvious code.

---

# Styling

Keep styling straightforward.

Use the styling solution already present in the project.

Do not add another CSS framework without a reason.

Keep visual components responsive because the application runs mainly inside the MAX mobile client.

Design mobile-first.

Avoid layouts that depend on large desktop screens.

---

# UI / UX

The application is primarily used from a phone.

Prefer:

- large touch targets;
- simple forms;
- short interactions;
- clear feedback after actions;
- minimal number of screens;
- minimal number of required fields.

For student feedback, sending feedback should ideally take only a few taps.

Do not make the user complete large forms for routine actions.

---

# Anonymous Feedback

Anonymous feedback must actually be anonymous from the perspective promised by the UI.

Do not label something "anonymous" if teachers can directly retrieve the student's identity.

If identity is stored internally for abuse prevention, clearly separate this mechanism from what teachers can access.

Avoid exposing identifiers through API responses accidentally.

---

# Data Fetching

For the current project scale, normal React hooks are sufficient.

Example:

```tsx
useEffect(() => {
  const load = async () => {
    try {
      const data = await getLessons();
      setLessons(data);
    } catch {
      setError("Не удалось загрузить занятия");
    } finally {
      setLoading(false);
    }
  };

  load();
}, []);
```

Do not add React Query / TanStack Query unless repeated caching, synchronization, invalidation, or request management becomes painful enough to justify it.

---

# Dependencies

Before installing a dependency, check whether the task can reasonably be solved with:

- React;
- TypeScript;
- browser APIs;
- Supabase;
- existing project dependencies.

Do not install a package for trivial functionality.

Prefer a small amount of understandable code over adding an obscure dependency.

Do use a mature dependency when implementing the feature manually would be significantly harder or less safe.

---

# Refactoring

Do not refactor unrelated parts of the project while implementing a small task.

If asked to fix a feedback form, do not rewrite routing, database access, styling, and authentication at the same time.

Make focused changes.

Large refactors should only happen when they solve a concrete existing problem.

---

# Architecture Rule

Start simple.

When duplication or complexity actually appears, refactor it.

The preferred progression is:

```text
component
↓
component + helper
↓
component + API function
↓
shared hook/service only if genuinely needed
```

Not:

```text
component
↓
interface
↓
abstract service
↓
repository
↓
repository implementation
↓
use case
↓
controller
↓
provider
↓
factory
```

---

# Code Generation Rules For AI Agents

When generating code for this project:

1. Inspect existing project code before creating new patterns.
2. Follow the existing naming and folder structure.
3. Prefer modifying existing files over creating unnecessary new layers.
4. Do not rewrite working code without a reason.
5. Do not introduce architecture patterns unless they solve an existing problem.
6. Explain non-obvious decisions briefly.
7. Keep code beginner-readable.
8. Do not use advanced TypeScript solely to demonstrate cleverness.
9. Do not use `any` unless there is no reasonable alternative.
10. Never expose secrets in frontend code.
11. Validate MAX authentication data server-side.
12. Treat Supabase RLS and backend validation as security boundaries.
13. Keep UI mobile-first.
14. Keep commits/changes focused on the requested feature.
15. Before adding a dependency, explain why the existing stack is insufficient.

---

# Priority Order

When requirements conflict, use this priority:

1. security;
2. correctness;
3. readability;
4. simplicity;
5. maintainability;
6. performance;
7. architectural purity.

For this project, readable simple code is preferred over theoretically perfect architecture.