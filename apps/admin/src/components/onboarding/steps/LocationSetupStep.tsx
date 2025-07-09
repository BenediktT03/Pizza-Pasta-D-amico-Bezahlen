import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@eatech/ui/components/Button';
import { Input } from '@eatech/ui/components/Input';
import { Select } from '@eatech/ui/components/Select';
import { 
  LocationMarkerIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  MapIcon
} from '@heroicons/react/outline';
import { GoogleMap, LoadScript, Marker, Autocomplete } from '@react-google-maps/api';
import toast from 'react-hot-toast';

// Validation schema
const locationSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
  street: z.string().min(3, 'Strasse erforderlich'),
  houseNumber: z.string().min(1, 'Hausnummer erforderlich'),
  postalCode: z.string().regex(/^\d{4}$/, 'PLZ muss 4 Ziffern haben'),
  city: z.string().min(2, 'Stadt erforderlich'),
  canton: z.string().min(2, 'Kanton erforderlich'),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  schedule: z.object({
    monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  }),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface LocationSetupStepProps {
  onComplete: (data: any) => void;
  data: any;
}

const SWISS_CANTONS = [
  { value: 'ZH', label: 'Zürich' },
  { value: 'BE', label: 'Bern' },
  { value: 'LU', label: 'Luzern' },
  { value: 'UR', label: 'Uri' },
  { value: 'SZ', label: 'Schwyz' },
  { value: 'OW', label: 'Obwalden' },
  { value: 'NW', label: 'Nidwalden' },
  { value: 'GL', label: 'Glarus' },
  { value: 'ZG', label: 'Zug' },
  { value: 'FR', label: 'Freiburg' },
  { value: 'SO', label: 'Solothurn' },
  { value: 'BS', label: 'Basel-Stadt' },
  { value: 'BL', label: 'Basel-Landschaft' },
  { value: 'SH', label: 'Schaffhausen' },
  { value: 'AR', label: 'Appenzell Ausserrhoden' },
  { value: 'AI', label: 'Appenzell Innerrhoden' },
  { value: 'SG', label: 'St. Gallen' },
  { value: 'GR', label: 'Graubünden' },
  { value: 'AG', label: 'Aargau' },
  { value: 'TG', label: 'Thurgau' },
  { value: 'TI', label: 'Tessin' },
  { value: 'VD', label: 'Waadt' },
  { value: 'VS', label: 'Wallis' },
  { value: 'NE', label: 'Neuenburg' },
  { value: 'GE', label: 'Genf' },
  { value: 'JU', label: 'Jura' },
];

const DEFAULT_SCHEDULE = {
  monday: { open: '11:30', close: '14:00', closed: false },
  tuesday: { open: '11:30', close: '14:00', closed: false },
  wednesday: { open: '11:30', close: '14:00', closed: false },
  thursday: { open: '11:30', close: '14:00', closed: false },
  friday: { open: '11:30', close: '14:00', closed: false },
  saturday: { open: '11:30', close: '14:00', closed: true },
  sunday: { open: '11:30', close: '14:00', closed: true },
};

const mapContainerStyle = {
  width: '100%',
  height: '300px',
};

const defaultCenter = {
  lat: 47.3769,
  lng: 8.5417, // Zürich
};

export const LocationSetupStep: React.FC<LocationSetupStepProps> = ({ onComplete, data }) => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState<any[]>(data.locations || []);
  const [showForm, setShowForm] = useState(locations.length === 0);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      schedule: DEFAULT_SCHEDULE,
      canton: 'ZH',
    },
  });

  const watchDays = watch('schedule');

  const onPlaceSelected = useCallback(() => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        setMapCenter({ lat, lng });
        setMarkerPosition({ lat, lng });
        setValue('coordinates', { lat, lng });

        // Parse address components
        if (place.address_components) {
          place.address_components.forEach((component) => {
            const types = component.types;
            
            if (types.includes('street_number')) {
              setValue('houseNumber', component.long_name);
            }
            if (types.includes('route')) {
              setValue('street', component.long_name);
            }
            if (types.includes('postal_code')) {
              setValue('postalCode', component.long_name);
            }
            if (types.includes('locality')) {
              setValue('city', component.long_name);
            }
            if (types.includes('administrative_area_level_1')) {
              // Try to match canton
              const cantonMatch = SWISS_CANTONS.find(
                c => c.label.toLowerCase() === component.long_name.toLowerCase()
              );
              if (cantonMatch) {
                setValue('canton', cantonMatch.value);
              }
            }
          });
        }
      }
    }
  }, [autocomplete, setValue]);

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });
      setValue('coordinates', { lat, lng });
    }
  }, [setValue]);

  const onSubmit = (formData: LocationFormData) => {
    const address = `${formData.street} ${formData.houseNumber}, ${formData.postalCode} ${formData.city}`;
    
    const newLocation = {
      ...formData,
      id: `location_${Date.now()}`,
      address,
      active: true,
    };

    setLocations([...locations, newLocation]);
    reset();
    setShowForm(false);
    setMarkerPosition(null);
    toast.success('Standort erfolgreich hinzugefügt!');
  };

  const deleteLocation = (id: string) => {
    setLocations(locations.filter(l => l.id !== id));
    toast.success('Standort gelöscht');
  };

  const handleContinue = () => {
    if (locations.length === 0) {
      toast.error('Bitte fügen Sie mindestens einen Standort hinzu');
      return;
    }
    onComplete({ locations });
  };

  const copyScheduleToAll = () => {
    const monday = watch('schedule.monday');
    ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach((day) => {
      setValue(`schedule.${day}` as any, monday);
    });
    toast.success('Öffnungszeiten auf alle Tage übertragen');
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Wo ist Ihr Food Truck zu finden? 📍
        </h2>
        <p className="text-gray-600">
          Fügen Sie Ihren ersten Standort hinzu - Sie können später weitere ergänzen
        </p>
      </div>

      {/* Location List */}
      {locations.length > 0 && !showForm && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ihre Standorte ({locations.length})
          </h3>
          <div className="space-y-3">
            {locations.map((location, index) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex items-start">
                  <LocationMarkerIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-medium text-gray-900">{location.name}</h4>
                    <p className="text-sm text-gray-500">{location.address}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteLocation(location.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </motion.div>
            ))}
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 flex items-center text-primary hover:text-primary-dark"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Weiteren Standort hinzufügen
          </button>
        </div>
      )}

      {/* Location Form */}
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Location Name */}
          <div>
            <label className="form-label">
              Standort-Name
            </label>
            <Input
              {...register('name')}
              placeholder="z.B. Bahnhofplatz Zürich"
              error={!!errors.name}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Map with Search */}
          <div>
            <label className="form-label mb-3">
              Standort auf der Karte
            </label>
            <LoadScript
              googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}
              libraries={['places']}
            >
              <div className="space-y-3">
                <Autocomplete
                  onLoad={setAutocomplete}
                  onPlaceChanged={onPlaceSelected}
                  options={{
                    componentRestrictions: { country: 'ch' },
                  }}
                >
                  <Input
                    placeholder="Adresse suchen..."
                    icon={<MapIcon className="h-5 w-5" />}
                  />
                </Autocomplete>

                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={15}
                  onClick={onMapClick}
                >
                  {markerPosition && (
                    <Marker position={markerPosition} />
                  )}
                </GoogleMap>
              </div>
            </LoadScript>
          </div>

          {/* Address Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="form-label">Strasse</label>
              <Input
                {...register('street')}
                placeholder="Bahnhofstrasse"
                error={!!errors.street}
              />
              {errors.street && (
                <p className="mt-1 text-sm text-red-600">{errors.street.message}</p>
              )}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="form-label">Hausnummer</label>
              <Input
                {...register('houseNumber')}
                placeholder="1"
                error={!!errors.houseNumber}
              />
              {errors.houseNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.houseNumber.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">PLZ</label>
              <Input
                {...register('postalCode')}
                placeholder="8001"
                error={!!errors.postalCode}
              />
              {errors.postalCode && (
                <p className="mt-1 text-sm text-red-600">{errors.postalCode.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Stadt</label>
              <Input
                {...register('city')}
                placeholder="Zürich"
                error={!!errors.city}
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="form-label">Kanton</label>
              <Select {...register('canton')} error={!!errors.canton}>
                {SWISS_CANTONS.map((canton) => (
                  <option key={canton.value} value={canton.value}>
                    {canton.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Opening Hours */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="form-label mb-0">
                Öffnungszeiten
              </label>
              <button
                type="button"
                onClick={copyScheduleToAll}
                className="text-sm text-primary hover:text-primary-dark"
              >
                Montag auf alle Tage übertragen
              </button>
            </div>
            
            <div className="space-y-3">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                <div key={day} className="flex items-center space-x-4">
                  <div className="w-24 text-sm font-medium text-gray-700 capitalize">
                    {t(`days.${day}`)}
                  </div>
                  
                  <input
                    type="checkbox"
                    {...register(`schedule.${day}.closed` as any)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-600">Geschlossen</span>
                  
                  {!watchDays?.[day]?.closed && (
                    <>
                      <Input
                        {...register(`schedule.${day}.open` as any)}
                        type="time"
                        className="w-24"
                      />
                      <span className="text-gray-500">-</span>
                      <Input
                        {...register(`schedule.${day}.close` as any)}
                        type="time"
                        className="w-24"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between">
            {locations.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
              >
                Abbrechen
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              className="ml-auto"
            >
              Standort hinzufügen
            </Button>
          </div>
        </form>
      )}

      {/* Tips */}
      <div className="mt-8 bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          💡 Standort-Tipps:
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Sie können Ihren Standort täglich spontan ändern</li>
          <li>• Kunden in der Nähe erhalten eine Push-Benachrichtigung</li>
          <li>• Fügen Sie beliebig viele Standorte hinzu</li>
          <li>• Öffnungszeiten können pro Standort variieren</li>
        </ul>
      </div>

      {/* Continue Button */}
      {!showForm && locations.length > 0 && (
        <div className="mt-8 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            onClick={handleContinue}
          >
            Weiter
          </Button>
        </div>
      )}
    </div>
  );
};
