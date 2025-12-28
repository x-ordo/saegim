import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getDriverInfo, isSessionValid, DriverInfo } from '../services/driverApi';

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const navItems: NavItem[] = [
  { href: '/driver', label: '홈', icon: '🏠' },
  { href: '/driver/deliveries', label: '배송', icon: '📋' },
  { href: '/driver/scan', label: '스캔', icon: '📷' },
  { href: '/driver/history', label: '이력', icon: '📜' },
  { href: '/driver/profile', label: '내정보', icon: '👤' },
];

export const DriverLayout = ({
  title,
  children,
  showNav = true,
  showHeader = true,
}: {
  title: string;
  children: React.ReactNode;
  showNav?: boolean;
  showHeader?: boolean;
}) => {
  const router = useRouter();
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if session is valid
    if (!isSessionValid()) {
      router.replace('/driver/login');
      return;
    }

    const info = getDriverInfo();
    setDriverInfo(info);
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      {showHeader && (
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">{title}</h1>
              {driverInfo && (
                <p className="text-xs text-gray-500">
                  {driverInfo.organization_name}
                </p>
              )}
            </div>
            {driverInfo && (
              <div className="text-right">
                <p className="text-sm font-medium">{driverInfo.courier_name}</p>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-16">
        {children}
      </main>

      {/* Bottom Navigation */}
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-10">
          <div className="flex justify-around items-center h-14">
            {navItems.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center flex-1 h-full ${
                    isActive ? 'text-orange-500' : 'text-gray-500'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs mt-0.5">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};
