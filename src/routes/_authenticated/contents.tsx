import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { WorkspacePage, WorkspaceError } from '@/components/workspace-page';
import { ListSkeleton } from '@/components/skeletons';
import { workspaceQuery } from '@/lib/queries';
import { requireRole } from '@/lib/role-guard';

export const Route = createFileRoute('/_authenticated/contents')({
  validateSearch: (search: Record<string, unknown>): { nouveau?: boolean } => (search['nouveau'] === true || search['nouveau'] === 'true' ? { nouveau: true } : {}),
  beforeLoad: () => requireRole('creator'),
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery()),
  head: () => ({ meta: [{ title: 'Mes contenus · CreativeScroll' }, { name: 'description', content: 'Créez, retrouvez et suivez la validation de tous vos contenus.' }, { property: 'og:title', content: 'Mes contenus · CreativeScroll' }, { property: 'og:description', content: 'Vos idées prennent vie, un contenu à la fois.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: ContentsPage,
  pendingComponent: ListSkeleton,
  errorComponent: WorkspaceError,
});

function ContentsPage() {
  const { nouveau } = Route.useSearch();
  const navigate = useNavigate({ from: '/contents' });
  return <WorkspacePage mode="creator" createOpen={Boolean(nouveau)} onCreateOpenChange={open => void navigate({ search: open ? { nouveau: true } : {}, replace: true })} />;
}
