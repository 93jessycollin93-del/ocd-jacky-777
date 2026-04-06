import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TelegramProvider } from '@/components/telegram/TelegramProvider';
import RoomHub from '@/components/telegram/RoomHub';
import SecurityCenter from '@/components/telegram/SecurityCenter';
import MusicLab from '@/components/telegram/MusicLab';
import CreatureLab from '@/components/telegram/CreatureLab';

type ActiveRoom = 'hub' | 'security' | 'music' | 'creatures' | 'jackie' | 'jade' | 'store' | 'legal';

export default function TelegramShell() {
  const navigate = useNavigate();
  const [activeRoom, setActiveRoom] = useState<ActiveRoom>('hub');

  const handleNavigate = useCallback((roomId: string) => {
    switch (roomId) {
      case 'jackie':
        navigate('/');
        break;
      case 'jade':
      case 'store':
        navigate('/play');
        break;
      case 'security':
        setActiveRoom('security');
        break;
      case 'music':
        setActiveRoom('music');
        break;
      case 'creatures':
        setActiveRoom('creatures');
        break;
      case 'legal':
        setActiveRoom('legal');
        break;
      default:
        setActiveRoom('hub');
    }
  }, [navigate]);

  return (
    <TelegramProvider>
      <div className="h-[100dvh] w-full overflow-hidden bg-background" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {activeRoom === 'hub' && <RoomHub onNavigate={handleNavigate} />}
        {activeRoom === 'security' && <SecurityCenter onBack={() => setActiveRoom('hub')} />}
        {activeRoom === 'music' && <MusicLab onBack={() => setActiveRoom('hub')} />}
        {activeRoom === 'creatures' && <CreatureLab onBack={() => setActiveRoom('hub')} />}
      </div>
    </TelegramProvider>
  );
}
