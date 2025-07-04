/**
 * EATECH - useReportTemplates Hook
 * Version: 23.0.0
 * Description: Custom Hook für die Verwaltung von Report-Vorlagen
 * File Path: /apps/admin/src/hooks/useReportTemplates.js
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from './useTenant';
import { useAuth } from './useAuth';

// ============================================================================
// CONSTANTS
// ============================================================================
const COLLECTION_NAME = 'reportTemplates';

// ============================================================================
// CUSTOM HOOK
// ============================================================================
export const useReportTemplates = () => {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const isMounted = useRef(true);
  
  // State
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Load Templates
  const loadTemplates = useCallback(async () => {
    if (!tenant?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const templatesQuery = query(
        collection(db, COLLECTION_NAME),
        where('tenantId', '==', tenant.id),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(templatesQuery);
      const templatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      
      if (isMounted.current) {
        setTemplates(templatesData);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
      if (isMounted.current) {
        setError(err.message);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [tenant?.id]);
  
  // Create Template
  const createTemplate = useCallback(async (templateData) => {
    if (!tenant?.id || !user?.uid) {
      throw new Error('No tenant or user selected');
    }
    
    try {
      const newTemplate = {
        ...templateData,
        tenantId: tenant.id,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        usageCount: 0
      };
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), newTemplate);
      
      // Add to local state immediately
      if (isMounted.current) {
        setTemplates(prev => [{
          id: docRef.id,
          ...newTemplate,
          createdAt: new Date(),
          updatedAt: new Date()
        }, ...prev]);
      }
      
      return docRef.id;
    } catch (err) {
      console.error('Error creating template:', err);
      throw err;
    }
  }, [tenant?.id, user?.uid]);
  
  // Update Template
  const updateTemplate = useCallback(async (templateId, updates) => {
    if (!tenant?.id) {
      throw new Error('No tenant selected');
    }
    
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      };
      
      await updateDoc(doc(db, COLLECTION_NAME, templateId), updateData);
      
      // Update local state
      if (isMounted.current) {
        setTemplates(prev => prev.map(template => 
          template.id === templateId 
            ? { ...template, ...updateData, updatedAt: new Date() }
            : template
        ));
      }
    } catch (err) {
      console.error('Error updating template:', err);
      throw err;
    }
  }, [tenant?.id, user?.uid]);
  
  // Delete Template
  const deleteTemplate = useCallback(async (templateId) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, templateId));
      
      // Update local state
      if (isMounted.current) {
        setTemplates(prev => prev.filter(template => template.id !== templateId));
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      throw err;
    }
  }, []);
  
  // Duplicate Template
  const duplicateTemplate = useCallback(async (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error('Template not found');
    }
    
    const duplicatedTemplate = {
      ...template,
      name: `${template.name} (Kopie)`,
      isDefault: false
    };
    
    delete duplicatedTemplate.id;
    delete duplicatedTemplate.createdAt;
    delete duplicatedTemplate.updatedAt;
    
    return createTemplate(duplicatedTemplate);
  }, [templates, createTemplate]);
  
  // Use Template (increment usage count)
  const useTemplate = useCallback(async (templateId) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;
      
      await updateDoc(doc(db, COLLECTION_NAME, templateId), {
        usageCount: (template.usageCount || 0) + 1,
        lastUsed: serverTimestamp()
      });
      
      // Update local state
      if (isMounted.current) {
        setTemplates(prev => prev.map(t => 
          t.id === templateId 
            ? { ...t, usageCount: (t.usageCount || 0) + 1, lastUsed: new Date() }
            : t
        ));
      }
    } catch (err) {
      console.error('Error updating template usage:', err);
    }
  }, [templates]);
  
  // Get Template by ID
  const getTemplateById = useCallback((templateId) => {
    return templates.find(t => t.id === templateId);
  }, [templates]);
  
  // Get Templates by Category
  const getTemplatesByCategory = useCallback((category) => {
    if (!category || category === 'all') return templates;
    return templates.filter(t => t.category === category);
  }, [templates]);
  
  // Get Most Used Templates
  const getMostUsedTemplates = useCallback((limit = 5) => {
    return [...templates]
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, limit);
  }, [templates]);
  
  // Search Templates
  const searchTemplates = useCallback((searchTerm) => {
    if (!searchTerm) return templates;
    
    const term = searchTerm.toLowerCase();
    return templates.filter(template => 
      template.name.toLowerCase().includes(term) ||
      template.description?.toLowerCase().includes(term) ||
      template.category?.toLowerCase().includes(term) ||
      template.reportType?.toLowerCase().includes(term)
    );
  }, [templates]);
  
  // Initial load
  useEffect(() => {
    if (tenant?.id) {
      loadTemplates();
    }
  }, [tenant?.id, loadTemplates]);
  
  return {
    // State
    templates,
    loading,
    error,
    
    // Actions
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    useTemplate,
    loadTemplates,
    
    // Getters
    getTemplateById,
    getTemplatesByCategory,
    getMostUsedTemplates,
    searchTemplates
  };
};