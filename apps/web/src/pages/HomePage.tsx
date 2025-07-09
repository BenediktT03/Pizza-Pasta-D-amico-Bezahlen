// Customer Home Page
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { Button, Card } from '@eatech/ui';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  MapPinIcon, 
  ClockIcon, 
  PhoneIcon,
  GlobeAltIcon 
} from '@heroicons/react/24/outline';

interface TruckData {
  id: string;
  name: string;
  description: string;
  logo?: string;
  coverImage?: string;
  cuisine: string[];
  location?: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  openingHours: {
    [key: string]: { open: string; close: string; closed?: boolean };
  };
  phone?: string;
  website?: string;
  isActive: boolean;
}

const HomePage: React.FC = () => {
  const { truckId } = useParams<{ truckId: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [truck, setTruck] = useState<TruckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTruck = async () => {
      if (!truckId) {
        setError('Kein Food Truck angegeben');
        setLoading(false);
        return;
      }

      try {
        const truckDoc = await getDoc(doc(db, 'foodtrucks', truckId));
        
        if (!truckDoc.exists()) {
          setError('Food Truck nicht gefunden');
          setLoading(false);
          return;
        }

        const truckData = { id: truckDoc.id, ...truckDoc.data() } as TruckData;
        
        if (!truckData.isActive) {
          setError('Dieser Food Truck ist momentan nicht verfügbar');
          setLoading(false);
          return;
        }

        setTruck(truckData);
      } catch (err) {
        console.error('Error loading truck:', err);
        setError('Fehler beim Laden des Food Trucks');
      } finally {
        setLoading(false);
      }
    };

    loadTruck();
  }, [truckId]);

  const getCurrentDayHours = () => {
    if (!truck?.openingHours) return null;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    return truck.openingHours[today];
  };

  const isCurrentlyOpen = () => {
    const hours = getCurrentDayHours();
    if (!hours || hours.closed) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [openHour, openMin] = hours.open.split(':').map(Number);
    const [closeHour, closeMin] = hours.close.split(':').map(Number);
    
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (error || !truck) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Food Truck nicht gefunden'}
          </h1>
          <Button onClick={() => navigate('/')}>
            Zurück zur Startseite
          </Button>
        </div>
      </Layout>
    );
  }

  const todayHours = getCurrentDayHours();
  const isOpen = isCurrentlyOpen();

  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative h-64 md:h-96">
        {truck.coverImage ? (
          <img
            src={truck.coverImage}
            alt={truck.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary to-primary-dark" />
        )}
        
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              {truck.logo && (
                <img
                  src={truck.logo}
                  alt={`${truck.name} Logo`}
                  className="w-20 h-20 rounded-lg bg-white p-2"
                />
              )}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">{truck.name}</h1>
                {truck.cuisine.length > 0 && (
                  <p className="text-lg mt-1">
                    {truck.cuisine.join(' • ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {truck.description && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-3">{t('about')}</h2>
                <p className="text-gray-600">{truck.description}</p>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                size="large"
                variant="primary"
                fullWidth
                onClick={() => navigate(`/${truckId}/menu`)}
                disabled={!isOpen}
              >
                {isOpen ? t('orderNow') : t('viewMenu')}
              </Button>
              
              <Button
                size="large"
                variant="secondary"
                fullWidth
                onClick={() => navigate(`/${truckId}/voice`)}
                disabled={!isOpen}
              >
                🎤 {t('voiceOrder')}
              </Button>
            </div>

            {/* Features */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t('features')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💳</span>
                  <span>{t('cashless')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🌍</span>
                  <span>{t('multiLanguage')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <span>{t('preOrder')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📱</span>
                  <span>{t('mobileOptimized')}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Info */}
          <div className="space-y-4">
            {/* Status Card */}
            <Card className={`p-4 ${isOpen ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {isOpen ? t('openNow') : t('closed')}
                </span>
                {todayHours && !todayHours.closed && (
                  <span className="text-sm">
                    {todayHours.open} - {todayHours.close}
                  </span>
                )}
              </div>
            </Card>

            {/* Location */}
            {truck.location && (
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <MapPinIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{t('location')}</h4>
                    <p className="text-sm text-gray-600">{truck.location.address}</p>
                    <button
                      onClick={() => {
                        window.open(
                          `https://maps.google.com/?q=${truck.location?.coordinates.lat},${truck.location?.coordinates.lng}`,
                          '_blank'
                        );
                      }}
                      className="text-sm text-primary hover:underline mt-2"
                    >
                      {t('showOnMap')}
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {/* Opening Hours */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <ClockIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">{t('openingHours')}</h4>
                  <div className="space-y-1">
                    {Object.entries(truck.openingHours).map(([day, hours]) => {
                      const isToday = day === ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
                      return (
                        <div
                          key={day}
                          className={`flex justify-between text-sm ${
                            isToday ? 'font-semibold' : 'text-gray-600'
                          }`}
                        >
                          <span>{t(`days.${day}`)}</span>
                          <span>
                            {hours.closed ? t('closed') : `${hours.open} - ${hours.close}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            {/* Contact */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">{t('contact')}</h4>
              <div className="space-y-2">
                {truck.phone && (
                  <a
                    href={`tel:${truck.phone}`}
                    className="flex items-center gap-3 text-sm hover:text-primary"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    <span>{truck.phone}</span>
                  </a>
                )}
                {truck.website && (
                  <a
                    href={truck.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm hover:text-primary"
                  >
                    <GlobeAltIcon className="h-4 w-4" />
                    <span>{t('website')}</span>
                  </a>
                )}
              </div>
            </Card>

            {/* Language Selector */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">{t('language')}</h4>
              <div className="grid grid-cols-2 gap-2">
                {['de', 'fr', 'it', 'en'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => i18n.changeLanguage(lang)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      i18n.language === lang
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {t(`languages.${lang}`)}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
