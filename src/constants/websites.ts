import { WebsiteConfig } from '../types';

export const DEFAULT_WEBSITES: WebsiteConfig[] = [
  {
    id: 'rrfvillage',
    name: 'RRF Village Quests',
    url: 'https://quests.rrfvillage.xyz',
    referralLink: 'https://quests.rrfvillage.xyz/r/WNUGJZTA',
    referralCode: 'WNUGJZTA',
    chainId: 2020, // Ronin
    contractAddress: '0x9f065e324a68e8cfa0c999e285a4ab935dd12ad9',
    calldata: '0x183ff085',
    badge: 'ACTIVE NOW',
    description: 'Daily check-in on Ronin Network. Multiplies quest points & grants Land NFT airdrop opportunities.',
    icon: '🌾',
    enabled: true,
    apiBaseUrl: 'https://api.rrfvillage.xyz'
  }
];
