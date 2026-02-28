import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import Link from 'next/link';

interface MasterCardProps {
  title: string;
  icon: string;
  href: string;
}

export default function MasterCard({ title, icon, href }: MasterCardProps) {
  const IconComponent = Icons[icon as keyof typeof Icons] as LucideIcon;

  return (
    <Link href={href}>
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-lg transition-shadow">
        <CardContent className="flex items-center p-6">
          <div className="flex-shrink-0">
            <IconComponent className="w-8 h-8 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-lg font-semibold text-gray-900">{title}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
