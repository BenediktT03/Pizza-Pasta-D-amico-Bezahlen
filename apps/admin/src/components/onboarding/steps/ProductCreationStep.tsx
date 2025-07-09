import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@eatech/ui/components/Button';
import { Input } from '@eatech/ui/components/Input';
import { Textarea } from '@eatech/ui/components/Textarea';
import { Select } from '@eatech/ui/components/Select';
import { Checkbox } from '@eatech/ui/components/Checkbox';
import { 
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  SparklesIcon
} from '@heroicons/react/outline';
import toast from 'react-hot-toast';

// Validation schema
const productSchema = z.object({
  name: z.object({
    de: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
    fr: z.string().optional(),
    it: z.string().optional(),
    en: z.string().optional(),
  }),
  description: z.object({
    de: z.string().min(10, 'Beschreibung muss mindestens 10 Zeichen lang sein'),
    fr: z.string().optional(),
    it: z.string().optional(),
    en: z.string().optional(),
  }),
  price: z.number().min(0.5, 'Preis muss mindestens 0.50 CHF sein').max(999, 'Preis zu hoch'),
  category: z.enum(['starters', 'mains', 'sides', 'drinks', 'desserts']),
  allergens: z.array(z.string()).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductCreationStepProps {
  onComplete: (data: any) => void;
  data: any;
}

const ALLERGENS = [
  { value: 'gluten', label: 'Gluten', emoji: '🌾' },
  { value: 'crustaceans', label: 'Krebstiere', emoji: '🦐' },
  { value: 'eggs', label: 'Eier', emoji: '🥚' },
  { value: 'fish', label: 'Fisch', emoji: '🐟' },
  { value: 'peanuts', label: 'Erdnüsse', emoji: '🥜' },
  { value: 'soybeans', label: 'Soja', emoji: '🌱' },
  { value: 'milk', label: 'Milch', emoji: '🥛' },
  { value: 'nuts', label: 'Nüsse', emoji: '🌰' },
  { value: 'celery', label: 'Sellerie', emoji: '🥬' },
  { value: 'mustard', label: 'Senf', emoji: '🟡' },
  { value: 'sesame', label: 'Sesam', emoji: '🌾' },
  { value: 'sulphites', label: 'Sulfite', emoji: '🧪' },
  { value: 'lupin', label: 'Lupinen', emoji: '🌿' },
  { value: 'molluscs', label: 'Weichtiere', emoji: '🦪' },
];

const CATEGORIES = [
  { value: 'starters', label: 'Vorspeisen' },
  { value: 'mains', label: 'Hauptgerichte' },
  { value: 'sides', label: 'Beilagen' },
  { value: 'drinks', label: 'Getränke' },
  { value: 'desserts', label: 'Desserts' },
];

export const ProductCreationStep: React.FC<ProductCreationStepProps> = ({ onComplete, data }) => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<any[]>(data.products || []);
  const [showForm, setShowForm] = useState(products.length === 0);
  const [currentLang, setCurrentLang] = useState('de');
  const [showAIHelper, setShowAIHelper] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      category: 'mains',
      allergens: [],
      price: 15.90, // Psychologischer Preis
    },
  });

  // Tutorial-Produkt (Burger)
  const createTutorialProduct = () => {
    const tutorialProduct = {
      name: {
        de: 'Classic Burger',
        fr: 'Burger Classique',
        it: 'Burger Classico',
        en: 'Classic Burger',
      },
      description: {
        de: 'Saftiges Rindfleisch-Patty mit Salat, Tomaten, Zwiebeln und unserer Spezialsauce',
        fr: 'Galette de bœuf juteuse avec salade, tomates, oignons et notre sauce spéciale',
        it: 'Succoso hamburger di manzo con insalata, pomodori, cipolle e la nostra salsa speciale',
        en: 'Juicy beef patty with lettuce, tomatoes, onions and our special sauce',
      },
      price: 15.90,
      category: 'mains',
      allergens: ['gluten', 'eggs', 'milk', 'mustard'],
    };

    Object.entries(tutorialProduct).forEach(([key, value]) => {
      setValue(key as any, value);
    });

    setShowAIHelper(true);
  };

  const onSubmit = (formData: ProductFormData) => {
    const newProduct = {
      ...formData,
      id: `product_${Date.now()}`,
      available: true,
    };

    setProducts([...products, newProduct]);
    reset();
    setShowForm(false);
    toast.success('Produkt erfolgreich hinzugefügt!');
  };

  const deleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
    toast.success('Produkt gelöscht');
  };

  const handleContinue = () => {
    if (products.length === 0) {
      toast.error('Bitte erstellen Sie mindestens ein Produkt');
      return;
    }
    onComplete({ products });
  };

  // AI-powered translation
  const autoTranslate = async () => {
    const germanName = watch('name.de');
    const germanDesc = watch('description.de');

    if (!germanName || !germanDesc) {
      toast.error('Bitte füllen Sie zuerst Name und Beschreibung auf Deutsch aus');
      return;
    }

    // Simulate AI translation
    toast.loading('KI übersetzt...');
    
    setTimeout(() => {
      setValue('name.fr', `${germanName} (FR)`);
      setValue('name.it', `${germanName} (IT)`);
      setValue('name.en', `${germanName} (EN)`);
      
      setValue('description.fr', `${germanDesc} (FR)`);
      setValue('description.it', `${germanDesc} (IT)`);
      setValue('description.en', `${germanDesc} (EN)`);
      
      toast.dismiss();
      toast.success('Übersetzungen generiert! (Demo)');
    }, 1500);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Erstellen Sie Ihr erstes Produkt 🍔
        </h2>
        <p className="text-gray-600">
          Lassen Sie uns mit einem klassischen Burger beginnen!
        </p>
      </div>

      {/* Product List */}
      {products.length > 0 && !showForm && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ihre Produkte ({products.length})
          </h3>
          <div className="space-y-3">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
              >
                <div>
                  <h4 className="font-medium text-gray-900">{product.name.de}</h4>
                  <p className="text-sm text-gray-500">{product.price} CHF</p>
                </div>
                <button
                  onClick={() => deleteProduct(product.id)}
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
            Weiteres Produkt hinzufügen
          </button>
        </div>
      )}

      {/* Product Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* Tutorial Helper */}
            {products.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-800">
                      <strong>Tipp:</strong> Klicken Sie auf den Button unten, um automatisch einen 
                      Beispiel-Burger zu erstellen!
                    </p>
                    <button
                      type="button"
                      onClick={createTutorialProduct}
                      className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Beispiel-Burger erstellen →
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Language Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {['de', 'fr', 'it', 'en'].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setCurrentLang(lang)}
                    className={`
                      py-2 px-1 border-b-2 font-medium text-sm
                      ${currentLang === lang
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </nav>
            </div>

            {/* Name & Description per Language */}
            <div className="space-y-4">
              <div>
                <label className="form-label">
                  Name ({currentLang.toUpperCase()})
                </label>
                <Input
                  {...register(`name.${currentLang}` as any)}
                  placeholder={currentLang === 'de' ? 'z.B. Classic Burger' : 'Übersetzung'}
                  error={!!errors.name?.[currentLang]}
                />
                {errors.name?.[currentLang] && (
                  <p className="mt-1 text-sm text-red-600">{errors.name[currentLang]?.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">
                  Beschreibung ({currentLang.toUpperCase()})
                </label>
                <Textarea
                  {...register(`description.${currentLang}` as any)}
                  rows={3}
                  placeholder={currentLang === 'de' ? 'Beschreiben Sie Ihr Produkt...' : 'Übersetzung'}
                  error={!!errors.description?.[currentLang]}
                />
                {errors.description?.[currentLang] && (
                  <p className="mt-1 text-sm text-red-600">{errors.description[currentLang]?.message}</p>
                )}
              </div>
            </div>

            {/* AI Translation Helper */}
            {currentLang === 'de' && (
              <button
                type="button"
                onClick={autoTranslate}
                className="flex items-center text-sm text-primary hover:text-primary-dark"
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                Automatisch in alle Sprachen übersetzen (KI)
              </button>
            )}

            {/* Price & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Preis (CHF)
                </label>
                <Input
                  {...register('price', { valueAsNumber: true })}
                  type="number"
                  step="0.05"
                  placeholder="15.90"
                  error={!!errors.price}
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">
                  Kategorie
                </label>
                <Select
                  {...register('category')}
                  error={!!errors.category}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Allergens */}
            <div>
              <label className="form-label mb-3">
                Allergene (14 EU-Allergene)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ALLERGENS.map((allergen) => (
                  <label
                    key={allergen.value}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <Checkbox
                      {...register('allergens')}
                      value={allergen.value}
                    />
                    <span>{allergen.emoji}</span>
                    <span>{allergen.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between">
              {products.length > 0 && (
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
                Produkt hinzufügen
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* AI Helper Animation */}
      <AnimatePresence>
        {showAIHelper && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-8 right-8 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-xs"
          >
            <div className="flex items-start">
              <SparklesIcon className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">KI-Assistent</p>
                <p className="text-sm text-gray-600 mt-1">
                  Ich habe ein Beispiel-Produkt für Sie vorbereitet! 
                  Sie können es jetzt anpassen oder direkt speichern.
                </p>
                <button
                  onClick={() => setShowAIHelper(false)}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  Verstanden
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue Button */}
      {!showForm && products.length > 0 && (
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
