# Blue Square - On-Chain Activity Tracker

A MiniKit-powered mini app that tracks on-chain activity and rewards users with points for their blockchain interactions.

## Features

### 🎯 Activity Tracking
- **Token Transfers**: Earn 2 points per transfer
- **NFT Transfers**: Earn 2 points per transfer  
- **Smart Contract Interactions**: Earn 5 points per interaction
- **Token Swaps**: Earn 8 points per swap
- **Staking Activities**: Earn 8 points per stake
- **NFT Mints**: Earn 8 points per mint

### 🏆 Points & Levels System
- **Newbie**: 0-49 points
- **HODLer**: 50-99 points
- **Crypto Native**: 100-199 points
- **DeFi Master**: 200-499 points
- **Whale**: 500-999 points
- **Diamond Hands**: 1000+ points

### 🏅 Leaderboard
- View top users by on-chain points
- Filter by timeframe (Week, Month, All-time)
- Real-time rankings

### 🎁 Rewards Center
- **Dynamic Rewards System**: Create and manage rewards through the quest-admin panel
- **Quest-Based Eligibility**: Rewards can require completion of specific quests
- **Level Requirements**: Set minimum level requirements for rewards
- **Points Rewards**: Earn points for completing quests and activities
- **NFT Badges & Tokens**: Exclusive digital collectibles
- **Trading Fee Discounts**: Platform benefits
- **VIP Access Passes**: Premium features and early access
- **Redemption Tracking**: Prevents duplicate redemptions
- **Limited Editions**: Set maximum redemption limits

### 🔔 Notifications
- Get notified when you earn points
- Activity milestone celebrations
- Leaderboard position updates

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Mini App**: MiniKit for Farcaster integration
- **Blockchain**: Base network support
- **Styling**: Tailwind CSS with custom theme
- **State Management**: React hooks
- **API**: Next.js API routes

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Farcaster account for testing

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd blue-square
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file with:
   ```env
   NEXT_PUBLIC_CDP_CLIENT_API_KEY=your_cdp_api_key
   NEXT_PUBLIC_URL=your_deployed_url
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Deploy to Vercel**:
   ```bash
   npm install -g vercel
   vercel
   ```

### Setting up the Manifest

1. **Generate manifest**:
   ```bash
   npx create-onchain --manifest
   ```

2. **Add environment variables to Vercel**:
   - `FARCASTER_HEADER`
   - `FARCASTER_PAYLOAD` 
   - `FARCASTER_SIGNATURE`

## Architecture

### Components
- `ActivityTracker`: Main activity display and points tracking
- `Leaderboard`: User rankings and competition
- `Rewards`: Dynamic rewards system with eligibility checking
- `Quests`: Quest completion tracking
- `Button` & `Icon`: Reusable UI components

### API Routes
- `/api/activity`: Handle activity tracking and points calculation
- `/api/quests`: Quest completion and management
- `/api/rewards`: Reward redemption and eligibility checking

### Data Flow
1. User connects wallet
2. App fetches on-chain activity
3. Points calculated based on activity type
4. Data stored and displayed in UI
5. Users can view leaderboard and redeem rewards

## Customization

### Adding New Activity Types
1. Update `ActivityType` in `ActivityTracker.tsx`
2. Add points calculation in `/api/activity/route.ts`
3. Add icon mapping in `Icon.tsx`

### Modifying Points System
Edit the `POINTS_MAP` in `/api/activity/route.ts`:
```typescript
const POINTS_MAP = {
  token_transfer: 10,
  nft_transfer: 25,
  // Add new types here
};
```

### Theme Customization
Modify `app/theme.css` to change colors and styling:
```css
:root {
  --app-accent: #10b981; /* Primary green */
  --app-accent-hover: #059669;
  /* Add more custom variables */
}
```

## Real-World Integration

To make this production-ready, you would need to:

1. **Blockchain Data Sources**:
   - Integrate with Alchemy API for Base network
   - Use Etherscan API for transaction history
   - Implement webhook listeners for real-time updates

2. **Database**:
   - Replace mock data with PostgreSQL/MongoDB
   - Add user authentication and session management
   - Implement caching for performance

3. **Smart Contracts**:
   - Deploy points token contract on Base
   - Create reward distribution contracts
   - Add on-chain verification for activities

4. **Security**:
   - Add rate limiting to API routes
   - Implement proper authentication
   - Add input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Documentation**: [MiniKit Docs](https://docs.base.org/base-app/build-with-minikit/)
- **Community**: [Base Discord](https://discord.gg/base)
- **Issues**: Create an issue in this repository

---

Built with ❤️ on Base using MiniKit
