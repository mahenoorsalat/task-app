# Tutorial 0: Project Template

This is the template (or the "starting point") for the project. All the frontend and styling is implemented, but there is no functionality.

## Get Started

To use this, you will need to have NodeJS and NPM installed. I recommend being familiar with TypeScript and NextJS as well.

Install the dependencies.

```sh
npm install
```

Run the project (local mode).

```sh
npm run dev
```

You should now be able to see the app on http://localhost:3000. None of the functionality works though—everything is just a placeholder.

## Project Structure

This is a rough breakdown of the current project structure.

```sh
task-app-project
├── app  # Layout and Pages (JSX)
├── components  # UI Components
├── hooks  # App Logic Hooks
├── lib  # Data Models (from DB)
├── tutorial  # Documentation
└── types  # Typed Interfaces
```

For the tutorial (and for implementing the app logic), we'll mostly only need to work with the `hooks` — in addition to anything new we add.

Other notable details:

- We use [Tailwind CSS](https://tailwindcss.com/) and [shadcn/ui](https://ui.shadcn.com/) for styling.
- The `lib/database.types.ts` is actually generated from our Supabase database itself (which doesn't exist yet). Usually, this is only possible _after_ we deploy the database schema.

## Implementing Business Logic

The modules in the `/hooks` folder will our entry point for implementing application logic:

- `useAuth.ts`
- `useSubscription.ts`
- `useTaskManager.ts`
