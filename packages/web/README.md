# ZoundZ Web App

This is the web frontend for ZoundZ, a platform for 1-of-1 music NFT auctions integrated with Farcaster.

## Features

- View live auctions and past drops
- Bid on music NFTs using your connected wallet
- Farcaster Frame integration for seamless bidding
- Real-time auction updates
- Mobile-responsive design

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Create a `.env.local` file with the following variables:
```env
NEXT_PUBLIC_INFURA_API_KEY=your_infura_key
NEXT_PUBLIC_API_URL=http://localhost:3000
NEYNAR_API_KEY=your_neynar_key
NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS=your_contract_address
```

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) to view the app.

## Farcaster Frame Integration

The app includes Farcaster Frame endpoints for bidding on NFTs:
- `/api/frame/[id]/bid`: Initial bid frame
- `/api/frame/[id]/confirm`: Bid confirmation frame

## Project Structure

- `/src/app`: Next.js app router pages and API routes
- `/src/components`: Reusable React components
- `/src/lib`: Utilities, configurations, and contract ABIs
