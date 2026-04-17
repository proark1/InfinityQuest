import { Reputation } from '../types';
import { TRAVEL_KEYWORDS } from './constants';

export interface TravelEvent {
  id: string;
  minAct?: number;
  weight: number;
  prompt: string;
}

const EVENTS: TravelEvent[] = [
  {
    id: 'wanderer',
    weight: 10,
    prompt: 'A ragged wanderer crosses the player\'s path and asks for coin, bread, or water. If the player has charisma and chooses to help, it could pay off later. Offer 2-3 choices.',
  },
  {
    id: 'ambush',
    weight: 8,
    prompt: 'Bandits or beasts spring from cover. Trigger a combat encounter appropriate to the player\'s level. Set combat.newEnemy.',
  },
  {
    id: 'storm',
    weight: 6,
    prompt: 'The weather turns violent — a sudden storm, biting wind, or choking ash. Trigger a worldRoll with label "Weather exposure — Stamina" OR describe shelter options.',
  },
  {
    id: 'shrine',
    weight: 5,
    prompt: 'A small roadside shrine appears. It hums faintly. Offer the player a choice to leave an offering (e.g., -10 gold for a blessing: small hpRestore or a buff) or pass on.',
  },
  {
    id: 'merchant',
    weight: 6,
    prompt: 'A traveling merchant with a laden cart hails the player. Set activeMerchant with 4-6 wares thematic to the region.',
  },
  {
    id: 'ruin',
    weight: 5,
    minAct: 2,
    prompt: 'The road passes a ruined structure — a tower, well, or statue — with a visible way in. Hint at loot or a clue; let the player decide to investigate.',
  },
  {
    id: 'omen',
    weight: 4,
    prompt: 'A strange omen: a flock of ravens circling, a blood-red sky, a voice on the wind. Foreshadow trouble ahead without resolving. Add a codex entry.',
  },
  {
    id: 'lost_traveler',
    weight: 5,
    prompt: 'A lost traveler, clearly panicked, begs for escort to the nearest settlement. Offer a choice: escort (CHA check opportunity + reward), ignore (reputation hit).',
  },
  {
    id: 'beast_sign',
    weight: 4,
    prompt: 'Tracks, a carcass, or gnawed bones tell of a large predator nearby. Heighten tension; no encounter yet. Player can choose to track, avoid, or camp.',
  },
  {
    id: 'stranger_warning',
    weight: 4,
    prompt: 'A stranger passes on the road and mutters a warning — "Don\'t take the east fork tonight" or "The bridge has fallen." Plant a foreshadow.',
  },
  {
    id: 'wandering_noble',
    weight: 3,
    prompt: 'A minor noble or acolyte of one of the factions crosses paths. Adjust tone based on the player\'s reputation with that faction. Potential quest hook.',
  },
  {
    id: 'faction_patrol',
    weight: 4,
    prompt: 'A patrol from one of the factions passes. If the player has Hostile reputation with them, they attack or demand tribute. Otherwise they nod and pass.',
  },
  {
    id: 'cursed_site',
    weight: 3,
    minAct: 2,
    prompt: 'The player stumbles upon a cursed locale — a haunted grove, a burned village, an open grave. Apply a small worldRoll for creeping dread (Stamina).',
  },
  {
    id: 'hidden_cache',
    weight: 3,
    prompt: 'A glint of metal in the brush — a hidden cache or dropped pack. Offer an Intelligence or Stamina check to investigate safely. Potential loot if passed.',
  },
];

export function actionLooksLikeTravel(action: string): boolean {
  const lower = action.toLowerCase();
  return TRAVEL_KEYWORDS.some(k => lower.includes(k));
}

export function pickTravelEvent(opts: { currentAct: number; reputation: Reputation[] }): TravelEvent | null {
  const eligible = EVENTS.filter(e => !e.minAct || opts.currentAct >= e.minAct);
  if (eligible.length === 0) return null;

  // Boost faction_patrol weight if the player has any hostile rep.
  const hostile = opts.reputation.some(r => r.status === 'Hostile');
  const weighted = eligible.flatMap(e => {
    const bonus = e.id === 'faction_patrol' && hostile ? 6 : 0;
    return Array<TravelEvent>(e.weight + bonus).fill(e);
  });

  return weighted[Math.floor(Math.random() * weighted.length)] || null;
}
