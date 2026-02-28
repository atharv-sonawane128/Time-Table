import { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className=" px-8 py-4">
      <div className="flex items-center justify-end">
        <Button onClick={onLogout} variant="destructive">Logout</Button>
      </div>
    </header>
  );
}
