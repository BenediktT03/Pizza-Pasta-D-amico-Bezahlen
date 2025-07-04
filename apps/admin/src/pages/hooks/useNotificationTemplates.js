/**
 * EATECH - useNotificationTemplates Hook
 * Version: 23.0.0
 * Description: Custom Hook für die Verwaltung von Notification Templates
 * File Path: /apps/admin/src/hooks/useNotificationTemplates.js
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
const COLLECTION_NAME = 'notificationTemplates';

// ============================================================================
// CUSTOM HOOK
// ============================================================================
export const useNotificationTemplates = () => {
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
        isActive: true
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
      name: `${template.name} (Kopie)`
    };
    
    delete duplicatedTemplate.id;
    delete duplicatedTemplate.createdAt;
    delete duplicatedTemplate.updatedAt;
    
    return createTemplate(duplicatedTemplate);
  }, [templates, createTemplate]);
  
  // Get Template by ID
  const getTemplateById = useCallback((templateId) => {
    return templates.find(t => t.id === templateId);
  }, [templates]);
  
  // Get Templates by Type
  const getTemplatesByType = useCallback((type) => {
    return templates.filter(t => t.type === type);
  }, [templates]);
  
  // Get Templates by Channel
  const getTemplatesByChannel = useCallback((channel) => {
    return templates.filter(t => t.channels[channel]?.enabled);
  }, [templates]);
  
  // Search Templates
  const searchTemplates = useCallback((searchTerm) => {
    if (!searchTerm) return templates;
    
    const term = searchTerm.toLowerCase();
    return templates.filter(template => 
      template.name.toLowerCase().includes(term) ||
      template.type.toLowerCase().includes(term)
    );
  }, [templates]);
  
  // Validate Template Variables
  const validateTemplateVariables = useCallback((template, availableVariables) => {
    const errors = [];
    const variablePattern = /\{\{(\w+)\}\}/g;
    
    // Check each channel
    Object.entries(template.channels).forEach(([channel, data]) => {
      if (!data.enabled) return;
      
      // Extract all variables from template content
      const content = [
        data.subject,
        data.body,
        data.message,
        data.title
      ].filter(Boolean).join(' ');
      
      const matches = content.match(variablePattern);
      if (matches) {
        matches.forEach(match => {
          const variable = match.replace(/\{\{|\}\}/g, '');
          if (!availableVariables.includes(variable)) {
            errors.push({
              channel,
              variable: match,
              message: `Variable ${match} ist nicht verfügbar`
            });
          }
        });
      }
    });
    
    return errors;
  }, []);
  
  // Preview Template with Data
  const previewTemplate = useCallback((template, data = {}) => {
    const replaceVariables = (text) => {
      if (!text) return text;
      
      let result = text;
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || '');
      });
      
      // Replace any remaining variables with placeholders
      result = result.replace(/\{\{(\w+)\}\}/g, '[[$1]]');
      
      return result;
    };
    
    const preview = {
      ...template,
      channels: {}
    };
    
    Object.entries(template.channels).forEach(([channel, channelData]) => {
      if (!channelData.enabled) return;
      
      preview.channels[channel] = {
        ...channelData,
        subject: replaceVariables(channelData.subject),
        body: replaceVariables(channelData.body),
        message: replaceVariables(channelData.message),
        title: replaceVariables(channelData.title)
      };
    });
    
    return preview;
  }, []);
  
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
    loadTemplates,
    
    // Getters
    getTemplateById,
    getTemplatesByType,
    getTemplatesByChannel,
    searchTemplates,
    
    // Utilities
    validateTemplateVariables,
    previewTemplate
  };
};