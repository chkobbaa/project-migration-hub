import { createFileRoute } from '@tanstack/react-router';
import { CreatorDashboard } from '@/components/creator-dashboard';
import { WorkspaceError } from '@/components/workspace-page';
import { DashboardSkeleton } from '@/components/skeletons';
import { notificationsQuery, workspaceQuery } from '@/lib/queries';
import { requireRole } from '@/lib/role-guard';

export const Route = createFileRoute('/_authenticated/creator')({
  beforeLoad: () => requireRole('creator'),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(workspaceQuery()), context.queryClient.ensureQueryData(notificationsQuery())]),
  head: () => ({ meta: [{ title: 'Accueil · CreativeScroll' }, { name: 'description', content: 'Votre tableau de bord : notifications, statistiques et derniers contenus.' }, { property: 'og:title', content: 'Accueil · CreativeScroll' }, { property: 'og:description', content: 'Tout l’essentiel de votre espace créateur en un coup d’œil.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: CreatorDashboard,
  pendingComponent: DashboardSkeleton,
  errorComponent: WorkspaceError,
});
