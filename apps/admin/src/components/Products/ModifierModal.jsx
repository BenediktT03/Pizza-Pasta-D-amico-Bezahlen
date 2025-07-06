/**
 * EATECH - Modifier Modal Component
 * Version: 6.8.0
 * Description: Advanced Product Modifier Management mit Lazy Loading & AI Suggestions
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/components/Products/ModifierModal.jsx
 * 
 * Features: Modifier groups, pricing, AI suggestions, templates, bulk operations
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Minus, Edit3, Trash2, Copy, Save, 
  RotateCcw, ChevronDown, ChevronUp, DragHandleVertical2,
  Sparkles, Zap, AlertCircle, CheckCircle, Info,
  DollarSign, Percent, Hash, Tag, Palette,
  Eye, EyeOff, Lock, Unlock, Star, TrendingUp,
  Search, Filter, SortAsc, SortDesc, MoreVertical,
  Download, Upload, Clipboard, Wand2
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// Lazy loaded components
const ModifierPreview = lazy(() => import('./ModifierPreview'));
const AIModifierSuggestions = lazy(() => import('./AIModifierSuggestions'));
const ModifierTemplates = lazy(() => import('./ModifierTemplates'));
const BulkModifierEditor = lazy(() => import('./BulkModifierEditor'));
const ModifierAnalytics = lazy(() => import('./ModifierAnalytics'));
const PricingStrategy = lazy(() => import('./PricingStrategy'));
const ModifierConflictResolver = lazy(() => import('./ModifierConflictResolver'));
const ModifierExporter = lazy(() => import('./ModifierExporter'));

// Lazy loaded services
const modifierService = () => import('../../services/modifierService');
const aiService = () => import('../../services/aiService');
const analyticsService = () => import('../../services/analyticsService');
const pricingService = () => import('../../services/pricingService');
const templateService = () => import('../../services/templateService');

// Lazy loaded utilities
const validationUtils = () => import('../../utils/validationUtils');
const formattersUtils = () => import('../../utils/formattersUtils');
const calculationUtils = () => import('../../utils/calculationUtils');

// Constants
const MODIFIER_TYPES = {
  SINGLE_SELECT: 'single_select',
  MULTI_SELECT: 'multi_select',
  INCREMENT: 'increment',
  TEXT_INPUT: 'text_input',
  SIZE_OPTION: 'size_option'
};

const PRICING_TYPES = {
  FIXED: 'fixed',
  PERCENTAGE: 'percentage',
  MULTIPLIER: 'multiplier',
  TIERED: 'tiered'
};

const MODIFIER_CATEGORIES = {
  SIZE: 'size',
  EXTRAS: 'extras',
  SAUCE: 'sauce',
  SPICE_LEVEL: 'spice_level',
  CUSTOMIZATION: 'customization',
  DIETARY: 'dietary'
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const ModifierModal = ({
  isOpen,
  onClose,
  onSave,
  product,
  modifierGroups = [],
  className = ''
}) => {
  // ============================================================================
  // STATE
  // ============================================================================
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBulkEditor, setShowBulkEditor] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showExporter, setShowExporter] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('order');
  const [sortDirection, setSortDirection] = useState('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [analytics, setAnalytics] = useState({});

  // Lazy loaded services refs
  const modifierServiceRef = React.useRef(null);
  const aiServiceRef = React.useRef(null);
  const analyticsServiceRef = React.useRef(null);
  const pricingServiceRef = React.useRef(null);
  const templateServiceRef = React.useRef(null);
  const validationUtilsRef = React.useRef(null);
  const formattersRef = React.useRef(null);
  const calculationUtilsRef = React.useRef(null);

  // ============================================================================
  // LAZY LOADING SETUP
  // ============================================================================
  useEffect(() => {
    const initializeLazyServices = async () => {
      try {
        // Initialize utilities
        validationUtilsRef.current = await validationUtils();
        formattersRef.current = await formattersUtils();
        calculationUtilsRef.current = await calculationUtils();

        // Initialize services
        const ModifierService = await modifierService();
        modifierServiceRef.current = new ModifierService.default();

        const AIService = await aiService();
        aiServiceRef.current = new AIService.default();

        const AnalyticsService = await analyticsService();
        analyticsServiceRef.current = new AnalyticsService.default();

        const PricingService = await pricingService();
        pricingServiceRef.current = new PricingService.default();

        const TemplateService = await templateService();
        templateServiceRef.current = new TemplateService.default();

        // Load initial data
        if (isOpen) {
          await loadModifierData();
        }

      } catch (error) {
        console.error('Failed to initialize modifier services:', error);
        setError(error.message);
      }
    };

    if (isOpen) {
      initializeLazyServices();
    }
  }, [isOpen]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  const loadModifierData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Initialize groups from props or create default
      const initialGroups = modifierGroups.length > 0 
        ? modifierGroups 
        : [createDefaultGroup()];
      
      setGroups(initialGroups);
      setActiveGroupId(initialGroups[0]?.id);

      // Load AI suggestions
      if (aiServiceRef.current && product) {
        const suggestions = await aiServiceRef.current.getModifierSuggestions({
          productName: product.name,
          category: product.category,
          existingModifiers: initialGroups
        });
        setAiSuggestions(suggestions);
      }

      // Load templates
      if (templateServiceRef.current) {
        const modifierTemplates = await templateServiceRef.current.getModifierTemplates({
          category: product?.category,
          cuisine: product?.cuisine
        });
        setTemplates(modifierTemplates);
      }

      // Load analytics
      if (analyticsServiceRef.current && product) {
        const modifierAnalytics = await analyticsServiceRef.current.getModifierAnalytics(product.id);
        setAnalytics(modifierAnalytics);
      }

    } catch (error) {
      console.error('Failed to load modifier data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [modifierGroups, product]);

  const createDefaultGroup = () => ({
    id: generateId(),
    name: 'Options',
    required: false,
    multiSelect: false,
    maxSelections: 1,
    minSelections: 0,
    displayOrder: 0,
    category: MODIFIER_CATEGORIES.EXTRAS,
    modifiers: []
  });

  const generateId = () => `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // ============================================================================
  // GROUP MANAGEMENT
  // ============================================================================
  const addGroup = useCallback(() => {
    const newGroup = {
      ...createDefaultGroup(),
      name: `Group ${groups.length + 1}`,
      displayOrder: groups.length
    };
    
    setGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
    setHasChanges(true);
  }, [groups.length]);

  const updateGroup = useCallback((groupId, updates) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, ...updates }
        : group
    ));
    setHasChanges(true);
  }, []);

  const deleteGroup = useCallback((groupId) => {
    setGroups(prev => prev.filter(group => group.id !== groupId));
    
    // Set new active group
    const remainingGroups = groups.filter(group => group.id !== groupId);
    if (remainingGroups.length > 0) {
      setActiveGroupId(remainingGroups[0].id);
    } else {
      setActiveGroupId(null);
    }
    
    setHasChanges(true);
  }, [groups]);

  const duplicateGroup = useCallback((groupId) => {
    const groupToDuplicate = groups.find(group => group.id === groupId);
    if (!groupToDuplicate) return;

    const duplicatedGroup = {
      ...groupToDuplicate,
      id: generateId(),
      name: `${groupToDuplicate.name} (Copy)`,
      displayOrder: groups.length,
      modifiers: groupToDuplicate.modifiers.map(modifier => ({
        ...modifier,
        id: generateId()
      }))
    };

    setGroups(prev => [...prev, duplicatedGroup]);
    setActiveGroupId(duplicatedGroup.id);
    setHasChanges(true);
  }, [groups]);

  // ============================================================================
  // MODIFIER MANAGEMENT
  // ============================================================================
  const addModifier = useCallback((groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const newModifier = {
      id: generateId(),
      name: '',
      price: 0,
      pricingType: PRICING_TYPES.FIXED,
      available: true,
      displayOrder: group.modifiers.length,
      description: '',
      image: null,
      allergens: [],
      nutritionalInfo: {},
      inventory: null
    };

    updateGroup(groupId, {
      modifiers: [...group.modifiers, newModifier]
    });
  }, [groups, updateGroup]);

  const updateModifier = useCallback((groupId, modifierId, updates) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const updatedModifiers = group.modifiers.map(modifier =>
      modifier.id === modifierId
        ? { ...modifier, ...updates }
        : modifier
    );

    updateGroup(groupId, { modifiers: updatedModifiers });
  }, [groups, updateGroup]);

  const deleteModifier = useCallback((groupId, modifierId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const updatedModifiers = group.modifiers.filter(modifier => modifier.id !== modifierId);
    updateGroup(groupId, { modifiers: updatedModifiers });
  }, [groups, updateGroup]);

  const duplicateModifier = useCallback((groupId, modifierId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const modifierToDuplicate = group.modifiers.find(m => m.id === modifierId);
    if (!modifierToDuplicate) return;

    const duplicatedModifier = {
      ...modifierToDuplicate,
      id: generateId(),
      name: `${modifierToDuplicate.name} (Copy)`,
      displayOrder: group.modifiers.length
    };

    updateGroup(groupId, {
      modifiers: [...group.modifiers, duplicatedModifier]
    });
  }, [groups, updateGroup]);

  // ============================================================================
  // DRAG & DROP
  // ============================================================================
  const handleDragEnd = useCallback((result) => {
    const { destination, source, type } = result;

    if (!destination) return;

    if (type === 'group') {
      // Reorder groups
      const newGroups = Array.from(groups);
      const [reorderedGroup] = newGroups.splice(source.index, 1);
      newGroups.splice(destination.index, 0, reorderedGroup);

      // Update display orders
      const updatedGroups = newGroups.map((group, index) => ({
        ...group,
        displayOrder: index
      }));

      setGroups(updatedGroups);
      setHasChanges(true);
    } else if (type === 'modifier') {
      // Reorder modifiers within a group
      const groupId = source.droppableId;
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      const newModifiers = Array.from(group.modifiers);
      const [reorderedModifier] = newModifiers.splice(source.index, 1);
      newModifiers.splice(destination.index, 0, reorderedModifier);

      // Update display orders
      const updatedModifiers = newModifiers.map((modifier, index) => ({
        ...modifier,
        displayOrder: index
      }));

      updateGroup(groupId, { modifiers: updatedModifiers });
    }
  }, [groups, updateGroup]);

  // ============================================================================
  // AI SUGGESTIONS
  // ============================================================================
  const applyAISuggestion = useCallback(async (suggestion) => {
    try {
      setIsLoading(true);

      if (suggestion.type === 'group') {
        // Add suggested group
        const newGroup = {
          id: generateId(),
          ...suggestion.data,
          displayOrder: groups.length
        };
        setGroups(prev => [...prev, newGroup]);
      } else if (suggestion.type === 'modifier') {
        // Add suggested modifier to active group
        const activeGroup = groups.find(g => g.id === activeGroupId);
        if (activeGroup) {
          addModifier(activeGroupId);
          const newModifierId = generateId();
          updateModifier(activeGroupId, newModifierId, suggestion.data);
        }
      } else if (suggestion.type === 'pricing') {
        // Apply suggested pricing strategy
        if (pricingServiceRef.current) {
          const optimizedPricing = await pricingServiceRef.current.optimizePricing(
            groups,
            suggestion.strategy
          );
          setGroups(optimizedPricing);
        }
      }

      setHasChanges(true);
    } catch (error) {
      console.error('Failed to apply AI suggestion:', error);
    } finally {
      setIsLoading(false);
    }
  }, [groups, activeGroupId, addModifier, updateModifier]);

  // ============================================================================
  // TEMPLATES
  // ============================================================================
  const applyTemplate = useCallback((template) => {
    const newGroups = template.groups.map(group => ({
      ...group,
      id: generateId(),
      displayOrder: groups.length + template.groups.indexOf(group),
      modifiers: group.modifiers.map(modifier => ({
        ...modifier,
        id: generateId()
      }))
    }));

    setGroups(prev => [...prev, ...newGroups]);
    setHasChanges(true);
  }, [groups.length]);

  // ============================================================================
  // VALIDATION
  // ============================================================================
  const validateModifiers = useCallback(() => {
    if (!validationUtilsRef.current) return {};

    const errors = {};

    groups.forEach(group => {
      const groupErrors = {};

      // Validate group
      if (!group.name.trim()) {
        groupErrors.name = 'Group name is required';
      }

      if (group.required && group.minSelections === 0) {
        groupErrors.minSelections = 'Required groups must have minimum selections > 0';
      }

      if (group.maxSelections < group.minSelections) {
        groupErrors.maxSelections = 'Maximum selections cannot be less than minimum';
      }

      // Validate modifiers
      const modifierErrors = {};
      group.modifiers.forEach(modifier => {
        const modErrors = {};

        if (!modifier.name.trim()) {
          modErrors.name = 'Modifier name is required';
        }

        if (modifier.price < 0) {
          modErrors.price = 'Price cannot be negative';
        }

        if (Object.keys(modErrors).length > 0) {
          modifierErrors[modifier.id] = modErrors;
        }
      });

      if (Object.keys(modifierErrors).length > 0) {
        groupErrors.modifiers = modifierErrors;
      }

      if (Object.keys(groupErrors).length > 0) {
        errors[group.id] = groupErrors;
      }
    });

    setValidationErrors(errors);
    return errors;
  }, [groups]);

  // ============================================================================
  // SAVE & CANCEL
  // ============================================================================
  const handleSave = useCallback(async () => {
    try {
      setIsLoading(true);

      // Validate before saving
      const errors = validateModifiers();
      if (Object.keys(errors).length > 0) {
        setError('Please fix validation errors before saving');
        return;
      }

      // Save modifier groups
      await onSave(groups);
      setHasChanges(false);
      onClose();

    } catch (error) {
      console.error('Failed to save modifiers:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [groups, validateModifiers, onSave, onClose]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const activeGroup = useMemo(() => {
    return groups.find(group => group.id === activeGroupId);
  }, [groups, activeGroupId]);

  const filteredGroups = useMemo(() => {
    let filtered = groups;

    if (searchTerm) {
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.modifiers.some(modifier =>
          modifier.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(group => group.category === selectedCategory);
    }

    // Sort groups
    filtered.sort((a, b) => {
      if (sortBy === 'order') {
        return sortDirection === 'asc' 
          ? a.displayOrder - b.displayOrder
          : b.displayOrder - a.displayOrder;
      } else if (sortBy === 'name') {
        return sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return 0;
    });

    return filtered;
  }, [groups, searchTerm, selectedCategory, sortBy, sortDirection]);

  const totalModifiers = useMemo(() => {
    return groups.reduce((total, group) => total + group.modifiers.length, 0);
  }, [groups]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderGroupList = () => (
    <div className="w-1/3 border-r border-gray-200 bg-gray-50">
      {/* Group List Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Modifier Groups</h3>
          <button
            onClick={addGroup}
            className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            title="Add Group"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {Object.entries(MODIFIER_CATEGORIES).map(([key, value]) => (
              <option key={key} value={value}>
                {value.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Group List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="groups" type="group">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex-1 overflow-y-auto"
            >
              {filteredGroups.map((group, index) => (
                <Draggable key={group.id} draggableId={group.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`p-3 border-b border-gray-200 cursor-pointer transition-colors ${
                        activeGroupId === group.id
                          ? 'bg-primary-50 border-l-4 border-l-primary'
                          : 'hover:bg-gray-100'
                      } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                      onClick={() => setActiveGroupId(group.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div {...provided.dragHandleProps}>
                            <DragHandleVertical2 className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{group.name}</div>
                            <div className="text-sm text-gray-500">
                              {group.modifiers.length} modifier{group.modifiers.length !== 1 ? 's' : ''}
                              {group.required && (
                                <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs">
                                  Required
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {validationErrors[group.id] && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateGroup(group.id);
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Duplicate Group"
                          >
                            <Copy className="w-3 h-3 text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteGroup(group.id);
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Delete Group"
                          >
                            <Trash2 className="w-3 h-3 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Group Actions */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Templates
          </button>
          <button
            onClick={() => setShowAISuggestions(true)}
            className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm flex items-center justify-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            AI Suggest
          </button>
        </div>
      </div>
    </div>
  );

  const renderGroupEditor = () => {
    if (!activeGroup) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Select a group to edit modifiers</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col">
        {/* Group Editor Header */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              {activeGroup.name}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnalytics(true)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="View Analytics"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => addModifier(activeGroup.id)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Modifier
              </button>
            </div>
          </div>

          {/* Group Settings */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={activeGroup.name}
                onChange={(e) => updateGroup(activeGroup.id, { name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {validationErrors[activeGroup.id]?.name && (
                <p className="text-sm text-red-600 mt-1">
                  {validationErrors[activeGroup.id].name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={activeGroup.category}
                onChange={(e) => updateGroup(activeGroup.id, { category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {Object.entries(MODIFIER_CATEGORIES).map(([key, value]) => (
                  <option key={key} value={value}>
                    {value.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Selections
              </label>
              <input
                type="number"
                min="0"
                value={activeGroup.minSelections}
                onChange={(e) => updateGroup(activeGroup.id, { minSelections: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Selections
              </label>
              <input
                type="number"
                min="1"
                value={activeGroup.maxSelections}
                onChange={(e) => updateGroup(activeGroup.id, { maxSelections: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={activeGroup.required}
                onChange={(e) => updateGroup(activeGroup.id, { required: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Required</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={activeGroup.multiSelect}
                onChange={(e) => updateGroup(activeGroup.id, { multiSelect: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Multi-select</span>
            </label>
          </div>
        </div>

        {/* Modifiers List */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeGroup.modifiers.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-4">No modifiers yet</p>
              <button
                onClick={() => addModifier(activeGroup.id)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Add First Modifier
              </button>
            </div>
          ) : (
            <Droppable droppableId={activeGroup.id} type="modifier">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {activeGroup.modifiers.map((modifier, index) => (
                    <Draggable key={modifier.id} draggableId={modifier.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-white border border-gray-200 rounded-lg p-4 ${
                            snapshot.isDragging ? 'shadow-lg' : ''
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div {...provided.dragHandleProps} className="mt-2">
                              <DragHandleVertical2 className="w-4 h-4 text-gray-400" />
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Name
                                </label>
                                <input
                                  type="text"
                                  value={modifier.name}
                                  onChange={(e) => updateModifier(activeGroup.id, modifier.id, { name: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                  placeholder="Modifier name"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Price
                                </label>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={modifier.price}
                                    onChange={(e) => updateModifier(activeGroup.id, modifier.id, { price: parseFloat(e.target.value) || 0 })}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                  />
                                </div>
                              </div>

                              <div className="flex items-end gap-2">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={modifier.available}
                                    onChange={(e) => updateModifier(activeGroup.id, modifier.id, { available: e.target.checked })}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                  />
                                  <span className="text-sm text-gray-700">Available</span>
                                </label>

                                <button
                                  onClick={() => duplicateModifier(activeGroup.id, modifier.id)}
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Duplicate"
                                >
                                  <Copy className="w-4 h-4 text-gray-500" />
                                </button>

                                <button
                                  onClick={() => deleteModifier(activeGroup.id, modifier.id)}
                                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {modifier.description && (
                            <div className="mt-3 ml-8">
                              <textarea
                                value={modifier.description}
                                onChange={(e) => updateModifier(activeGroup.id, modifier.id, { description: e.target.value })}
                                placeholder="Description (optional)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                rows="2"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={handleCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-white rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col ${className}`}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Modifier Management</h2>
              <p className="text-gray-600">
                {product?.name} • {groups.length} group{groups.length !== 1 ? 's' : ''} • {totalModifiers} modifier{totalModifiers !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkEditor(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Bulk Edit
              </button>
              <button
                onClick={() => setShowExporter(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Export
              </button>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-6 py-3 bg-red-50 border-b border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Group List */}
            {renderGroupList()}

            {/* Group Editor */}
            {renderGroupEditor()}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {hasChanges && (
                <span className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                  Unsaved changes
                </span>
              )}
              
              <Suspense fallback={null}>
                <ModifierPreview groups={groups} />
              </Suspense>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading || Object.keys(validationErrors).length > 0}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Modifiers
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Lazy Loaded Modals */}
        {showAISuggestions && (
          <Suspense fallback={null}>
            <AIModifierSuggestions
              isOpen={showAISuggestions}
              suggestions={aiSuggestions}
              onClose={() => setShowAISuggestions(false)}
              onApply={applyAISuggestion}
            />
          </Suspense>
        )}

        {showTemplates && (
          <Suspense fallback={null}>
            <ModifierTemplates
              isOpen={showTemplates}
              templates={templates}
              onClose={() => setShowTemplates(false)}
              onApply={applyTemplate}
            />
          </Suspense>
        )}

        {showBulkEditor && (
          <Suspense fallback={null}>
            <BulkModifierEditor
              isOpen={showBulkEditor}
              groups={groups}
              onClose={() => setShowBulkEditor(false)}
              onSave={setGroups}
            />
          </Suspense>
        )}

        {showAnalytics && (
          <Suspense fallback={null}>
            <ModifierAnalytics
              isOpen={showAnalytics}
              analytics={analytics}
              onClose={() => setShowAnalytics(false)}
            />
          </Suspense>
        )}

        {showExporter && (
          <Suspense fallback={null}>
            <ModifierExporter
              isOpen={showExporter}
              groups={groups}
              onClose={() => setShowExporter(false)}
            />
          </Suspense>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ModifierModal;