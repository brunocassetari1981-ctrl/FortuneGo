// src/services/api.ts

export interface GameItem {
  id: string;
  name: string;
  rtp: string;
  category: string;
}

export const getLocalGames = async (): Promise<GameItem[]> => {
  // Simula uma resposta de API local
  return [
    { id: '1', name: 'Fortune Tiger', rtp: '96.8%', category: 'Slots' },
    { id: '2', name: 'Fortune Ox', rtp: '96.75%', category: 'Slots' },
    { id: '3', name: 'Fortune Rabbit', rtp: '96.75%', category: 'Slots' },
    { id: '4', name: 'Fortune Snake', rtp: '96.8%', category: 'Slots' }
  ];
};