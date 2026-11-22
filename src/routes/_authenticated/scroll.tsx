import { createFileRoute } from '@tanstack/react-router';
import { Play, Sparkles, BrainCircuit, Puzzle, Gamepad2 } from 'lucide-react';
import { fr } from '@/lib/fr';

export const Route = createFileRoute('/_authenticated/scroll')({
  head: () => ({ meta: [{ title: 'Scroll · CreativeScroll' }, { name: 'description', content: 'Le fil de contenus à faire défiler arrive bientôt sur CreativeScroll.' }, { property: 'og:title', content: 'Scroll · CreativeScroll' }, { property: 'og:description', content: 'Quiz, puzzles, mini-jeux et vidéos à faire défiler.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: ScrollPage,
});

function ScrollPage() {
  const cards = [{ icon: BrainCircuit, cls: 'QUIZ' }, { icon: Puzzle, cls: 'PUZZLE' }, { icon: Gamepad2, cls: 'MINI_GAME' }];
  return <div className="scroll-soon">
    <div className="scroll-phone" aria-hidden="true"><div className="scroll-track">{[...cards, ...cards].map((c, i) => <div key={i} className={`scroll-card cover-art ${c.cls}`}><div className="cover-lines"/><c.icon/></div>)}</div></div>
    <div className="scroll-copy"><span className="soon-chip"><Sparkles size={13}/>{fr.scrollBadge}</span><h1><Play size={26}/>{fr.scrollTitle}</h1><p>{fr.scrollSubtitle}</p></div>
  </div>;
}
