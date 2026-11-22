import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkspaceShell } from '@/components/workspace-shell';
import { WorkspaceError } from '@/components/workspace-page';
import { ShellSkeleton } from '@/components/skeletons';
import { workspaceQuery } from '@/lib/queries';

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: '/auth' });
    return { userId: data.user.id };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery()),
  component: AuthenticatedLayout,
  pendingComponent: ShellSkeleton,
  errorComponent: WorkspaceError,
});

function AuthenticatedLayout() {
  const { data } = useSuspenseQuery(workspaceQuery());
  return <WorkspaceShell moderator={data.moderator} name={data.name} email={data.user.email ?? ''}><Outlet /></WorkspaceShell>;
}
