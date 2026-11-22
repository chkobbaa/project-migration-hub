import { BrainCircuit, Puzzle, Gamepad2, FileText, Play } from 'lucide-react';
import type { Content } from '@/lib/queries';
import { fr } from '@/lib/fr';
import forestAsset from '@/assets/forest.jpg.asset.json';
const forest = forestAsset.url;
import nutritionAsset from '@/assets/nutrition.jpg.asset.json';
const nutrition = nutritionAsset.url;
import studioAsset from '@/assets/creative-studio.jpg.asset.json';
const studio = studioAsset.url;
export const typeIcons = { QUIZ: BrainCircuit, PUZZLE: Puzzle, MINI_GAME: Gamepad2, SHORT_DOC: FileText, VIDEO: Play };
export function StatusBadge({status}:{status:Content['status']}) {return <span className={`status-badge ${status}`}>{fr.statuses[status]}</span>;}
export function ContentCover({content}:{content:Content}) {
  const body=content.body;const key=body && typeof body==='object' && !Array.isArray(body) ? body['cover'] : null;
  const image=key==='forest'?forest:key==='nutrition'?nutrition:key==='studio'?studio:null;
  const Icon=typeIcons[content.content_type];
  return image?<img src={image} alt={content.title}/>:<div className={`cover-art ${content.content_type}`}><div className="cover-lines"/><Icon/></div>;
}