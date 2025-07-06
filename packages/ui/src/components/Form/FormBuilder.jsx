/**
 * EATECH - Form Builder Component
 * Version: 3.7.0
 * Description: Dynamic Form Builder mit Lazy Loading & Advanced Validation
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /packages/ui/src/components/Form/FormBuilder.jsx
 * 
 * Features: Dynamic forms, validation, conditional fields, multi-step forms
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, EyeOff, Calendar, Clock, MapPin, Upload,
  Plus, Minus, X, Check, AlertCircle, Info,
  ChevronDown, ChevronUp, Move, Settings,
  Star, Heart, ThumbsUp, DollarSign, Hash,
  Type, ToggleLeft, List, Image, FileText,
  Save, Download, Copy, RefreshCw, Zap
} from 'lucide-react';

// Lazy loaded field components
const TextField = lazy(() => import('./fields/TextField'));
const NumberField = lazy(() => import('./fields/NumberField'));
const EmailField = lazy(() => import('./fields/EmailField'));
const PasswordField = lazy(() => import('./fields/PasswordField'));
const TextareaField = lazy(() => import('./fields/TextareaField'));
const SelectField = lazy(() => import('./fields/SelectField'));
const MultiSelectField = lazy(() => import('./fields/MultiSelectField'));
const CheckboxField = lazy(() => import('./fields/CheckboxField'));
const RadioField = lazy(() => import('./fields/RadioField'));
const ToggleField = lazy(() => import('./fields/ToggleField'));
const DateField = lazy(() => import('./fields/DateField'));
const TimeField = lazy(() => import('./fields/TimeField'));
const DateTimeField = lazy(() => import('./fields/DateTimeField'));
const FileUploadField = lazy(() => import('./fields/FileUploadField'));
const ImageUploadField = lazy(() => import('./fields/ImageUploadField'));
const RatingField = lazy(() => import('./fields/RatingField'));
const SliderField = lazy(() => import('./fields/SliderField'));
const ColorField = lazy(() => import('./fields/ColorField'));
const LocationField = lazy(() => import('./fields/LocationField'));
const RichTextField = lazy(() => import('./fields/RichTextField'));
const RepeaterField = lazy(() => import('./fields/RepeaterField'));

// Lazy loaded form components
const FormSection = lazy(() => import('./FormSection'));
const FormStep = lazy(() => import('./FormStep'));
const FormValidationSummary = lazy(() => import('./FormValidationSummary'));
const FormProgress = lazy(() => import('./FormProgress'));
const ConditionalField = lazy(() => import('./ConditionalField'));

// Lazy loaded utilities
const validationUtils = () => import('../../utils/validationUtils');
const formatterUtils = () => import('../../utils/formatterUtils');
const storageUtils = () => import('../../utils/storageUtils');
const exportUtils = () => import('../../utils/exportUtils');

// Field types
export const FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  EMAIL: 'email',
  PASSWORD: 'password',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  TOGGLE: 'toggle',
  DATE: 'date',
  TIME: 'time',
  DATETIME: 'datetime',
  FILE_UPLOAD: 'file_upload',
  IMAGE_UPLOAD: 'image_upload',
  RATING: 'rating',
  SLIDER: 'slider',
  COLOR: 'color',
  LOCATION: 'location',
  RICH_TEXT: 'rich_text',
  REPEATER: 'repeater',
  SECTION: 'section',
  STEP: 'step'
};

// Validation rules
export const VALIDATION_RULES = {
  REQUIRED: 'required',
  MIN_LENGTH: 'minLength',
  MAX_LENGTH: 'maxLength',
  MIN_VALUE: 'minValue',
  MAX_VALUE: 'maxValue',
  PATTERN: 'pattern',
  EMAIL: 'email',
  URL: 'url',
  PHONE: 'phone',
  CUSTOM: 'custom'
};

// Form layouts
export const FORM_LAYOUTS = {
  SINGLE_COLUMN: 'single_column',
  TWO_COLUMN: 'two_column',
  THREE_COLUMN: 'three_column',
  GRID: 'grid',
  TABS: 'tabs',
  ACCORDION: 'accordion',
  STEPS: 'steps'
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
  </div>
);

const FormBuilder = ({
  schema,
  initialValues = {},
  onSubmit,
  onChange,
  onValidate,
  layout = FORM_LAYOUTS.SINGLE_COLUMN,
  enableAutoSave = false,
  enableValidation = true,
  enableConditionalFields = true,
  enableFormState = true,
  submitText = 'Submit',
  resetText = 'Reset',
  className = '',
  disabled = false,
  readonly = false
}) => {
  // ============================================================================
  // STATE
  // ============================================================================
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [validationSchema, setValidationSchema] = useState(null);
  const [fieldVisibility, setFieldVisibility] = useState({});
  const [fieldDependencies, setFieldDependencies] = useState({});
  const [autoSaveData, setAutoSaveData] = useState(null);
  const [formProgress, setFormProgress] = useState(0);

  // Refs
  const formRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const validationTimerRef = useRef(null);

  // Lazy loaded utilities
  const validationUtilsRef = useRef(null);
  const formatterUtilsRef = useRef(null);
  const storageUtilsRef = useRef(null);
  const exportUtilsRef = useRef(null);

  // ============================================================================
  // LAZY LOADING SETUP
  // ============================================================================
  useEffect(() => {
    const initializeLazyUtils = async () => {
      try {
        validationUtilsRef.current = await validationUtils();
        formatterUtilsRef.current = await formatterUtils();
        storageUtilsRef.current = await storageUtils();
        exportUtilsRef.current = await exportUtils();

        // Build validation schema
        if (enableValidation && schema) {
          const builtSchema = buildValidationSchema(schema);
          setValidationSchema(builtSchema);
        }

        // Setup field dependencies
        if (enableConditionalFields && schema) {
          const dependencies = buildFieldDependencies(schema);
          setFieldDependencies(dependencies);
        }

        // Load auto-saved data
        if (enableAutoSave && enableFormState) {
          await loadAutoSavedData();
        }

      } catch (error) {
        console.error('Failed to initialize form utilities:', error);
      }
    };

    initializeLazyUtils();
  }, [schema, enableValidation, enableConditionalFields, enableAutoSave, enableFormState]);

  // ============================================================================
  // FORM SCHEMA PROCESSING
  // ============================================================================
  const processedSchema = useMemo(() => {
    if (!schema) return [];

    return schema.map(field => ({
      ...field,
      id: field.id || field.name,
      visible: fieldVisibility[field.name] !== false,
      disabled: disabled || field.disabled || false,
      readonly: readonly || field.readonly || false
    }));
  }, [schema, fieldVisibility, disabled, readonly]);

  const buildValidationSchema = (schema) => {
    const validationSchema = {};

    const processField = (field) => {
      if (field.validation) {
        validationSchema[field.name] = field.validation;
      }

      // Handle nested fields (sections, repeaters)
      if (field.fields) {
        field.fields.forEach(processField);
      }
    };

    schema.forEach(processField);
    return validationSchema;
  };

  const buildFieldDependencies = (schema) => {
    const dependencies = {};

    const processField = (field) => {
      if (field.condition) {
        dependencies[field.name] = field.condition;
      }

      if (field.fields) {
        field.fields.forEach(processField);
      }
    };

    schema.forEach(processField);
    return dependencies;
  };

  // ============================================================================
  // FORM DATA MANAGEMENT
  // ============================================================================
  const updateFormData = useCallback((name, value, shouldValidate = true) => {
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Trigger onChange callback
      if (onChange) {
        onChange(newData, name, value);
      }
      
      return newData;
    });

    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Mark form as dirty
    if (!isDirty) {
      setIsDirty(true);
    }

    // Validate field if enabled
    if (shouldValidate && enableValidation) {
      validateField(name, value);
    }

    // Update conditional field visibility
    if (enableConditionalFields) {
      updateFieldVisibility(name, value);
    }

    // Auto-save if enabled
    if (enableAutoSave) {
      scheduleAutoSave();
    }

    // Update form progress
    updateFormProgress();
    
  }, [onChange, isDirty, enableValidation, enableConditionalFields, enableAutoSave]);

  const updateFieldVisibility = useCallback((changedField, value) => {
    const newVisibility = { ...fieldVisibility };
    let hasChanges = false;

    // Check all field dependencies
    Object.entries(fieldDependencies).forEach(([fieldName, condition]) => {
      const isVisible = evaluateCondition(condition, formData, changedField, value);
      
      if (newVisibility[fieldName] !== isVisible) {
        newVisibility[fieldName] = isVisible;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setFieldVisibility(newVisibility);
    }
  }, [fieldVisibility, fieldDependencies, formData]);

  const evaluateCondition = (condition, formData, changedField, changedValue) => {
    try {
      // Handle different condition types
      if (typeof condition === 'function') {
        const dataWithChanges = { ...formData, [changedField]: changedValue };
        return condition(dataWithChanges);
      }

      if (typeof condition === 'object') {
        const { field, operator, value } = condition;
        const fieldValue = field === changedField ? changedValue : formData[field];

        switch (operator) {
          case 'equals':
            return fieldValue === value;
          case 'notEquals':
            return fieldValue !== value;
          case 'contains':
            return Array.isArray(fieldValue) ? fieldValue.includes(value) : String(fieldValue).includes(value);
          case 'greaterThan':
            return Number(fieldValue) > Number(value);
          case 'lessThan':
            return Number(fieldValue) < Number(value);
          case 'isEmpty':
            return !fieldValue || fieldValue === '';
          case 'isNotEmpty':
            return fieldValue && fieldValue !== '';
          default:
            return true;
        }
      }

      return true;
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return true;
    }
  };

  // ============================================================================
  // VALIDATION
  // ============================================================================
  const validateField = useCallback(async (name, value) => {
    if (!validationUtilsRef.current || !validationSchema?.[name]) {
      return;
    }

    try {
      const fieldSchema = validationSchema[name];
      const isValid = await validationUtilsRef.current.validateField(value, fieldSchema);
      
      setErrors(prev => {
        const newErrors = { ...prev };
        if (isValid.success) {
          delete newErrors[name];
        } else {
          newErrors[name] = isValid.errors;
        }
        return newErrors;
      });

    } catch (error) {
      console.error('Validation error:', error);
    }
  }, [validationSchema]);

  const validateForm = useCallback(async () => {
    if (!enableValidation || !validationUtilsRef.current || !validationSchema) {
      return { isValid: true, errors: {} };
    }

    try {
      const result = await validationUtilsRef.current.validateForm(formData, validationSchema);
      setErrors(result.errors);
      
      if (onValidate) {
        onValidate(result);
      }
      
      return result;
    } catch (error) {
      console.error('Form validation error:', error);
      return { isValid: false, errors: {} };
    }
  }, [enableValidation, formData, validationSchema, onValidate]);

  const clearErrors = useCallback((fieldName = null) => {
    if (fieldName) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    } else {
      setErrors({});
    }
  }, []);

  // ============================================================================
  // FORM PROGRESS
  // ============================================================================
  const updateFormProgress = useCallback(() => {
    if (!schema) return;

    const totalFields = schema.filter(field => field.type !== FIELD_TYPES.SECTION).length;
    const completedFields = Object.keys(formData).filter(key => {
      const value = formData[key];
      return value !== null && value !== undefined && value !== '';
    }).length;

    const progress = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
    setFormProgress(Math.round(progress));
  }, [schema, formData]);

  // ============================================================================
  // AUTO-SAVE
  // ============================================================================
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      await saveFormData();
    }, 2000); // Auto-save after 2 seconds of inactivity
  }, []);

  const saveFormData = useCallback(async () => {
    if (!enableAutoSave || !storageUtilsRef.current) return;

    try {
      const saveData = {
        formData,
        timestamp: new Date().toISOString(),
        progress: formProgress
      };

      await storageUtilsRef.current.setItem(`form_autosave_${schema?.[0]?.formId || 'default'}`, saveData);
      setAutoSaveData(saveData);
    } catch (error) {
      console.error('Failed to auto-save form:', error);
    }
  }, [enableAutoSave, formData, formProgress, schema]);

  const loadAutoSavedData = useCallback(async () => {
    if (!storageUtilsRef.current) return;

    try {
      const savedData = await storageUtilsRef.current.getItem(`form_autosave_${schema?.[0]?.formId || 'default'}`);
      
      if (savedData && savedData.formData) {
        setAutoSaveData(savedData);
        
        // Ask user if they want to restore auto-saved data
        const shouldRestore = window.confirm(
          `Found auto-saved form data from ${new Date(savedData.timestamp).toLocaleString()}. Would you like to restore it?`
        );
        
        if (shouldRestore) {
          setFormData(savedData.formData);
          setFormProgress(savedData.progress || 0);
        }
      }
    } catch (error) {
      console.error('Failed to load auto-saved data:', error);
    }
  }, [schema]);

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================
  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      // Validate form
      const validation = await validateForm();
      
      if (!validation.isValid) {
        // Focus first error field
        const firstErrorField = Object.keys(validation.errors)[0];
        if (firstErrorField) {
          const element = formRef.current?.querySelector(`[name="${firstErrorField}"]`);
          element?.focus();
        }
        return;
      }

      // Call onSubmit callback
      if (onSubmit) {
        const result = await onSubmit(formData, {
          errors,
          touched,
          isDirty,
          progress: formProgress
        });

        // Handle submission result
        if (result?.success !== false) {
          // Clear auto-saved data on successful submission
          if (enableAutoSave && storageUtilsRef.current) {
            await storageUtilsRef.current.removeItem(`form_autosave_${schema?.[0]?.formId || 'default'}`);
          }
          
          // Reset form state
          setIsDirty(false);
          setTouched({});
          setErrors({});
        }
      }

    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting, validateForm, onSubmit, formData, errors, touched, 
    isDirty, formProgress, enableAutoSave, schema
  ]);

  const handleReset = useCallback(() => {
    setFormData(initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
    setCurrentStep(0);
    setFormProgress(0);
  }, [initialValues]);

  // ============================================================================
  // FIELD RENDERING
  // ============================================================================
  const renderField = useCallback((field, index) => {
    if (!field.visible) return null;

    const fieldProps = {
      key: field.id || field.name,
      name: field.name,
      value: formData[field.name] || field.defaultValue || '',
      onChange: (value) => updateFormData(field.name, value),
      onBlur: () => setTouched(prev => ({ ...prev, [field.name]: true })),
      error: errors[field.name],
      touched: touched[field.name],
      disabled: field.disabled,
      readonly: field.readonly,
      required: field.required,
      placeholder: field.placeholder,
      label: field.label,
      description: field.description,
      options: field.options,
      validation: field.validation,
      ...field.props
    };

    const FieldComponent = getFieldComponent(field.type);
    
    if (!FieldComponent) {
      console.warn(`Unknown field type: ${field.type}`);
      return null;
    }

    // Wrap conditional fields
    if (enableConditionalFields && field.condition) {
      return (
        <Suspense key={field.id || field.name} fallback={<LoadingSpinner />}>
          <ConditionalField condition={field.condition} formData={formData}>
            <FieldComponent {...fieldProps} />
          </ConditionalField>
        </Suspense>
      );
    }

    return (
      <Suspense key={field.id || field.name} fallback={<LoadingSpinner />}>
        <FieldComponent {...fieldProps} />
      </Suspense>
    );
  }, [formData, errors, touched, updateFormData, enableConditionalFields]);

  const getFieldComponent = (type) => {
    const components = {
      [FIELD_TYPES.TEXT]: TextField,
      [FIELD_TYPES.NUMBER]: NumberField,
      [FIELD_TYPES.EMAIL]: EmailField,
      [FIELD_TYPES.PASSWORD]: PasswordField,
      [FIELD_TYPES.TEXTAREA]: TextareaField,
      [FIELD_TYPES.SELECT]: SelectField,
      [FIELD_TYPES.MULTI_SELECT]: MultiSelectField,
      [FIELD_TYPES.CHECKBOX]: CheckboxField,
      [FIELD_TYPES.RADIO]: RadioField,
      [FIELD_TYPES.TOGGLE]: ToggleField,
      [FIELD_TYPES.DATE]: DateField,
      [FIELD_TYPES.TIME]: TimeField,
      [FIELD_TYPES.DATETIME]: DateTimeField,
      [FIELD_TYPES.FILE_UPLOAD]: FileUploadField,
      [FIELD_TYPES.IMAGE_UPLOAD]: ImageUploadField,
      [FIELD_TYPES.RATING]: RatingField,
      [FIELD_TYPES.SLIDER]: SliderField,
      [FIELD_TYPES.COLOR]: ColorField,
      [FIELD_TYPES.LOCATION]: LocationField,
      [FIELD_TYPES.RICH_TEXT]: RichTextField,
      [FIELD_TYPES.REPEATER]: RepeaterField,
      [FIELD_TYPES.SECTION]: FormSection
    };

    return components[type];
  };

  // ============================================================================
  // LAYOUT RENDERING
  // ============================================================================
  const renderFormLayout = () => {
    switch (layout) {
      case FORM_LAYOUTS.TWO_COLUMN:
        return renderTwoColumnLayout();
      case FORM_LAYOUTS.THREE_COLUMN:
        return renderThreeColumnLayout();
      case FORM_LAYOUTS.GRID:
        return renderGridLayout();
      case FORM_LAYOUTS.TABS:
        return renderTabsLayout();
      case FORM_LAYOUTS.ACCORDION:
        return renderAccordionLayout();
      case FORM_LAYOUTS.STEPS:
        return renderStepsLayout();
      default:
        return renderSingleColumnLayout();
    }
  };

  const renderSingleColumnLayout = () => (
    <div className="space-y-6">
      {processedSchema.map(renderField)}
    </div>
  );

  const renderTwoColumnLayout = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {processedSchema.map(renderField)}
    </div>
  );

  const renderThreeColumnLayout = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {processedSchema.map(renderField)}
    </div>
  );

  const renderGridLayout = () => (
    <div className="grid grid-cols-12 gap-4">
      {processedSchema.map((field, index) => (
        <div 
          key={field.id || field.name}
          className={`col-span-12 ${field.gridSize || 'md:col-span-6'}`}
        >
          {renderField(field, index)}
        </div>
      ))}
    </div>
  );

  const renderStepsLayout = () => {
    const steps = processedSchema.filter(field => field.type === FIELD_TYPES.STEP);
    
    if (steps.length === 0) {
      return renderSingleColumnLayout();
    }

    const currentStepFields = steps[currentStep]?.fields || [];

    return (
      <div className="space-y-6">
        {/* Progress */}
        <Suspense fallback={<div className="h-2 bg-gray-200 rounded"></div>}>
          <FormProgress
            currentStep={currentStep}
            totalSteps={steps.length}
            progress={formProgress}
          />
        </Suspense>

        {/* Step Content */}
        <Suspense fallback={<LoadingSpinner />}>
          <FormStep
            step={steps[currentStep]}
            fields={currentStepFields}
            renderField={renderField}
          />
        </Suspense>

        {/* Step Navigation */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : submitText}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderTabsLayout = () => {
    // Implementation for tabs layout
    return renderSingleColumnLayout(); // Fallback
  };

  const renderAccordionLayout = () => {
    // Implementation for accordion layout
    return renderSingleColumnLayout(); // Fallback
  };

  // ============================================================================
  // FORM ACTIONS
  // ============================================================================
  const renderFormActions = () => {
    if (layout === FORM_LAYOUTS.STEPS) {
      return null; // Steps have their own navigation
    }

    return (
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <div className="flex items-center gap-4">
          {enableFormState && isDirty && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Unsaved changes
            </span>
          )}
          
          {autoSaveData && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Auto-saved {new Date(autoSaveData.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting || !isDirty}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {resetText}
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting || Object.keys(errors).length > 0}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {submitText}
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  if (!schema || schema.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No form schema provided</p>
      </div>
    );
  }

  return (
    <div className={`form-builder ${className}`}>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        {/* Validation Summary */}
        {enableValidation && Object.keys(errors).length > 0 && (
          <Suspense fallback={null}>
            <FormValidationSummary
              errors={errors}
              onFieldFocus={(fieldName) => {
                const element = formRef.current?.querySelector(`[name="${fieldName}"]`);
                element?.focus();
              }}
            />
          </Suspense>
        )}

        {/* Form Content */}
        {renderFormLayout()}

        {/* Form Actions */}
        {renderFormActions()}
      </form>
    </div>
  );
};

export default FormBuilder;