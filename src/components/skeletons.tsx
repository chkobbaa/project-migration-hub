import { fr } from '@/lib/fr';

function Bone({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function HeadingSkeleton() {
  return <div className="sk-heading"><Bone className="sk-line sk-w-40 sk-h-lg" /><Bone className="sk-line sk-w-60" /></div>;
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return <div className="content-grid">{Array.from({ length: count }, (_, i) => (
    <div key={i} className="sk-card"><Bone className="sk-cover" /><div className="sk-card-body"><Bone className="sk-line sk-w-30" /><Bone className="sk-line sk-w-80 sk-h-md" /><Bone className="sk-line sk-w-60" /></div></div>
  ))}</div>;
}

export function ListSkeleton() {
  return <div role="status" aria-label={fr.loading} className="page-skeleton"><HeadingSkeleton /><div className="sk-toolbar"><Bone className="sk-line sk-w-20" /><div className="sk-icons"><Bone className="sk-icon" /><Bone className="sk-icon" /></div></div><CardGridSkeleton /></div>;
}

export function DashboardSkeleton() {
  return <div role="status" aria-label={fr.loading} className="page-skeleton">
    <HeadingSkeleton />
    <div className="dash-stats">{Array.from({ length: 4 }, (_, i) => <Bone key={i} className="sk-stat" />)}</div>
    <div className="dash-grid"><div className="sk-panel">{Array.from({ length: 4 }, (_, i) => <div key={i} className="sk-row"><Bone className="sk-dot" /><div className="sk-row-lines"><Bone className="sk-line sk-w-70" /><Bone className="sk-line sk-w-40" /></div></div>)}</div><div className="sk-panel"><Bone className="sk-line sk-w-40 sk-h-md" />{Array.from({ length: 3 }, (_, i) => <Bone key={i} className="sk-mini" />)}</div></div>
  </div>;
}

export function DetailSkeleton() {
  return <div role="status" aria-label={fr.loading} className="page-skeleton sk-detail"><Bone className="sk-line sk-w-20" /><Bone className="sk-hero" /><Bone className="sk-line sk-w-30" /><Bone className="sk-line sk-w-70 sk-h-lg" /><Bone className="sk-line sk-w-90" /><Bone className="sk-line sk-w-60" /></div>;
}

export function FormSkeleton() {
  return <div role="status" aria-label={fr.loading} className="page-skeleton"><HeadingSkeleton /><div className="sk-form">{Array.from({ length: 4 }, (_, i) => <div key={i} className="sk-field"><Bone className="sk-line sk-w-20" /><Bone className="sk-input" /></div>)}</div></div>;
}

/** Full app frame shown while the signed-in area loads for the first time. */
export function ShellSkeleton() {
  return <div className="app-layout" role="status" aria-label={fr.loading}>
    <aside className="sidebar"><Bone className="sk-line sk-w-80 sk-h-lg" /><div className="sk-nav">{Array.from({ length: 3 }, (_, i) => <Bone key={i} className="sk-nav-item" />)}</div></aside>
    <div className="main-column"><header className="topbar"><Bone className="sk-avatar" /></header><main className="workspace-main"><DashboardSkeleton /></main></div>
    <div className="bottom-nav sk-bottom-nav"><Bone className="sk-pill" /><Bone className="sk-pill" /><Bone className="sk-pill" /></div>
  </div>;
}
