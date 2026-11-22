import { createFileRoute, redirect } from '@tanstack/react-router';

// Creation now lives inside "Mes contenus"; keep old links working.
export const Route = createFileRoute('/_authenticated/create')({
  beforeLoad: () => { throw redirect({ to: '/contents', search: { nouveau: true }, replace: true }); },
});
