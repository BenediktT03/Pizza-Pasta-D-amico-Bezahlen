// Kitchen Settings Page
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Switch, Select } from '@eatech/ui';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const SettingsPage: React.FC = () => {
  const { truckName, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Settings state
  const [settings, setSettings] = useState({
    soundEnabled: true,
    soundVolume: 70,
    voiceAnnouncements: true,
    voiceLanguage: 'de',
    autoRefresh: true,
    refreshInterval: 10,
    displayMode: 'grid',
    fontSize: 'medium',
    showPreparationTime: true,
    showCustomerName: true,
    showOrderNumber: true
  });

  const handleSave = () => {
    // Save settings to Firebase
    console.log('Saving settings:', settings);
    // Show success message
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Einstellungen
              </h1>
              <p className="text-gray-600 mt-1">{truckName}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sound Settings */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Ton & Benachrichtigungen</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Töne aktiviert</p>
                <p className="text-sm text-gray-600">
                  Akustische Signale bei neuen Bestellungen
                </p>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onChange={(checked) => setSettings({ ...settings, soundEnabled: checked })}
              />
            </div>

            {settings.soundEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lautstärke: {settings.soundVolume}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.soundVolume}
                  onChange={(e) => setSettings({ ...settings, soundVolume: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sprachansagen</p>
                <p className="text-sm text-gray-600">
                  "Bestellung 123 ist fertig"
                </p>
              </div>
              <Switch
                checked={settings.voiceAnnouncements}
                onChange={(checked) => setSettings({ ...settings, voiceAnnouncements: checked })}
              />
            </div>

            {settings.voiceAnnouncements && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sprache
                </label>
                <Select
                  value={settings.voiceLanguage}
                  onChange={(value) => setSettings({ ...settings, voiceLanguage: value })}
                  options={[
                    { value: 'de', label: 'Deutsch' },
                    { value: 'fr', label: 'Französisch' },
                    { value: 'it', label: 'Italienisch' },
                    { value: 'en', label: 'Englisch' }
                  ]}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Display Settings */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Anzeige</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ansicht
              </label>
              <Select
                value={settings.displayMode}
                onChange={(value) => setSettings({ ...settings, displayMode: value })}
                options={[
                  { value: 'grid', label: 'Kachelansicht' },
                  { value: 'list', label: 'Listenansicht' }
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schriftgrösse
              </label>
              <Select
                value={settings.fontSize}
                onChange={(value) => setSettings({ ...settings, fontSize: value })}
                options={[
                  { value: 'small', label: 'Klein' },
                  { value: 'medium', label: 'Normal' },
                  { value: 'large', label: 'Gross' },
                  { value: 'xlarge', label: 'Sehr gross' }
                ]}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Vorbereitungszeit anzeigen</p>
                <p className="text-sm text-gray-600">
                  Geschätzte Zeit bis fertig
                </p>
              </div>
              <Switch
                checked={settings.showPreparationTime}
                onChange={(checked) => setSettings({ ...settings, showPreparationTime: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Kundenname anzeigen</p>
              </div>
              <Switch
                checked={settings.showCustomerName}
                onChange={(checked) => setSettings({ ...settings, showCustomerName: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Bestellnummer anzeigen</p>
              </div>
              <Switch
                checked={settings.showOrderNumber}
                onChange={(checked) => setSettings({ ...settings, showOrderNumber: checked })}
              />
            </div>
          </div>
        </Card>

        {/* System Settings */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">System</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Automatisch aktualisieren</p>
                <p className="text-sm text-gray-600">
                  Neue Bestellungen automatisch laden
                </p>
              </div>
              <Switch
                checked={settings.autoRefresh}
                onChange={(checked) => setSettings({ ...settings, autoRefresh: checked })}
              />
            </div>

            {settings.autoRefresh && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aktualisierungsintervall: {settings.refreshInterval} Sekunden
                </label>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={settings.refreshInterval}
                  onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            variant="secondary"
            onClick={handleSignOut}
          >
            Abmelden
          </Button>
          
          <Button
            variant="primary"
            onClick={handleSave}
          >
            Einstellungen speichern
          </Button>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
