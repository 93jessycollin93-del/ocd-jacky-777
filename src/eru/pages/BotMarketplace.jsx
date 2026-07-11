import BotMarketplaceShell from '../components/ailab/BotMarketplaceShell';

export default function BotMarketplace() {
  return (
    <div className="min-h-screen bg-background px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl">
        <BotMarketplaceShell embedded={false} />
      </div>
    </div>
  );
}