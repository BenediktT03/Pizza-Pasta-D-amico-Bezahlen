// Kitchen Dashboard Page
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card } from '@eatech/ui';
import { 
  ShoppingCartIcon,
  ClipboardListIcon,
  CubeIcon,
  CogIcon
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  const { truckName } = useAuth();

  const menuItems = [
    {
      title: 'Bestellungen',
      description: 'Aktuelle Bestellungen anzeigen',
      icon: ShoppingCartIcon,
      link: '/orders',
      color: 'bg-blue-500'
    },
    {
      title: 'Warteschlange',
      description: 'Alle ausstehenden Bestellungen',
      icon: ClipboardListIcon,
      link: '/queue',
      color: 'bg-green-500'
    },
    {
      title: 'Inventar',
      description: 'Schnelle Inventar-Updates',
      icon: CubeIcon,
      link: '/inventory',
      color: 'bg-yellow-500'
    },
    {
      title: 'Einstellungen',
      description: 'Kitchen Display konfigurieren',
      icon: CogIcon,
      link: '/settings',
      color: 'bg-gray-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Kitchen Display
              </h1>
              <p className="text-gray-600 mt-1">{truckName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('de-CH', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {new Date().toLocaleTimeString('de-CH', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.link} to={item.link}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-center">
                    <div className={`${item.color} p-4 rounded-lg`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="ml-4">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {item.title}
                      </h2>
                      <p className="text-gray-600 mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-600">Offene Bestellungen</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">In Bearbeitung</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">Fertig</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">Ø Wartezeit</p>
            <p className="text-2xl font-bold text-gray-900">-- Min</p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
