import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@eatech/ui/components/Button';
import { 
  PhotographIcon,
  UploadIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/outline';
import { uploadFile } from '@eatech/core/services/storage';
import toast from 'react-hot-toast';

interface LogoUploadStepProps {
  onComplete: (data: any) => void;
  data: any;
}

export const LogoUploadStep: React.FC<LogoUploadStepProps> = ({ onComplete, data }) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(data.url || null);
  const [uploadedFile, setUploadedFile] = useState<any>(data || null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Bitte laden Sie nur Bilddateien hoch');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Die Datei ist zu gross (max. 5MB)');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    try {
      const uploadResult = await uploadFile(file, {
        path: 'logos',
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.9,
      });

      setUploadedFile({
        url: uploadResult.url,
        path: uploadResult.path,
        size: file.size,
        type: file.type,
        name: file.name,
      });

      toast.success('Logo erfolgreich hochgeladen!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload fehlgeschlagen. Bitte versuchen Sie es erneut.');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleContinue = () => {
    if (!uploadedFile) {
      toast.error('Bitte laden Sie zuerst ein Logo hoch');
      return;
    }
    onComplete(uploadedFile);
  };

  const handleRemove = () => {
    setPreview(null);
    setUploadedFile(null);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Laden Sie Ihr Logo hoch 🎨
        </h2>
        <p className="text-gray-600">
          Ihr Logo wird auf der Speisekarte und allen digitalen Materialien angezeigt
        </p>
      </div>

      {/* Upload Area */}
      {!preview ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-colors duration-200
            ${isDragActive 
              ? 'border-primary bg-primary-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          <motion.div
            animate={{ scale: isDragActive ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            ) : (
              <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            )}
          </motion.div>

          <p className="text-lg font-medium text-gray-900 mb-2">
            {isDragActive
              ? 'Lassen Sie die Datei hier los...'
              : 'Klicken Sie hier oder ziehen Sie Ihr Logo hierher'
            }
          </p>
          <p className="text-sm text-gray-500">
            PNG, JPG, GIF oder SVG bis zu 5MB
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Preview */}
          <div className="relative bg-gray-50 rounded-lg p-8">
            <button
              onClick={handleRemove}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
            >
              <XCircleIcon className="h-5 w-5 text-gray-500" />
            </button>

            <div className="flex items-center justify-center">
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                src={preview}
                alt="Logo Preview"
                className="max-h-48 max-w-full rounded-lg shadow-md"
              />
            </div>
          </div>

          {/* Upload Success */}
          {uploadedFile && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center text-green-600"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              <span className="font-medium">Logo erfolgreich hochgeladen!</span>
            </motion.div>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          💡 Tipps für ein gutes Logo:
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Verwenden Sie ein quadratisches Format (1:1)</li>
          <li>• Mindestens 512x512 Pixel für beste Qualität</li>
          <li>• Transparenter Hintergrund (PNG) empfohlen</li>
          <li>• Klare, einfache Designs funktionieren am besten</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-end">
        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={!uploadedFile || uploading}
        >
          Weiter
        </Button>
      </div>
    </div>
  );
};
