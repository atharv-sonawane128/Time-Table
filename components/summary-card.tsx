import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';

interface SummaryCardProps {
  title: string;
  count: number;
  icon: string;
}

export default function SummaryCard({ title, count, icon }: SummaryCardProps) {
  const IconComponent = Icons[icon as keyof typeof Icons] as LucideIcon;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
      <CardContent className="flex items-center p-6">
        <div className="flex-shrink-0">
          <IconComponent className="w-8 h-8 text-blue-600" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{count}</p>
        </div>
      </CardContent>
    </Card>
  );
}
