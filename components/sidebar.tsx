'use client';

import { cn } from '@/lib/utils';
import { BookOpen, Calendar, Users, MapPin, FileText, Settings, BarChart3 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { User } from 'firebase/auth';

const menuItems = [
  { name: 'Dashboard', icon: BarChart3, path: '/dashboard' },
  { name: 'Timetables', icon: Calendar, path: '/timetables' },
  { name: 'Classes', icon: BookOpen, path: '/classes' },
  { name: 'Faculty', icon: Users, path: '/faculty' },
  { name: 'Rooms', icon: MapPin, path: '/rooms' },
  { name: 'Subjects', icon: FileText, path: '/subjects' },
  { name: 'Reports', icon: FileText, path: '/reports' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

interface SidebarProps {
  user?: User | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-black">Parul </h2>
        <h1 className="text-2xl font-bold text-red-400">University</h1>
      </div>
      <nav className="mt-8">
        <ul className="space-y-2 px-4">
          {menuItems.map((item) => {
            const isActive = item.path === '/timetable'
              ? pathname === '/timetable' || pathname.startsWith('/timetable/')
              : pathname === item.path;
            return (
              <li key={item.name}>
                <a
                  href={item.path}
                  className={cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors',
                    isActive
                      ? 'bg-blue-50 text-red-500 border-r-4 border-black'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile Section */}
      {user && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-400 rounded-full flex items-center justify-center text-white font-semibold">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
              <p className="text-xs text-gray-900 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
