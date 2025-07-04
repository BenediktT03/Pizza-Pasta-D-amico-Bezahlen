/**
 * EATECH - Email Templates Hook
 * Version: 24.0.0
 * Description: Custom Hook für Email Template Management
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/hooks/useEmailTemplates.js
 */

import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { getDatabaseInstance } from '../lib/firebase';
import { useTenant } from './useTenant';
import { toast } from 'react-hot-toast';
import mjml2html from 'mjml-browser';

// ============================================================================
// HOOK
// ============================================================================

export const useEmailTemplates = () => {
  const { tenant } = useTenant();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load templates
  useEffect(() => {
    if (!tenant?.id) return;

    const db = getDatabaseInstance();
    const templatesRef = ref(db, `tenants/${tenant.id}/emailTemplates`);

    const unsubscribe = onValue(
      templatesRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const templatesList = Object.entries(data).map(([id, template]) => ({
          id,
          ...template
        }));
        
        // Sort by updated date
        templatesList.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt);
          const dateB = new Date(b.updatedAt || b.createdAt);
          return dateB - dateA;
        });
        
        setTemplates(templatesList);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Error loading templates:', error);
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenant]);

  // Create template
  const createTemplate = useCallback(async (templateData) => {
    if (!tenant?.id) {
      throw new Error('No tenant selected');
    }

    try {
      const db = getDatabaseInstance();
      const templatesRef = ref(db, `tenants/${tenant.id}/emailTemplates`);
      
      // Compile MJML to HTML
      let html = '';
      if (templateData.mjml) {
        const result = mjml2html(templateData.mjml, {
          validationLevel: 'soft',
          minify: true
        });
        html = result.html;
      }
      
      const newTemplate = {
        ...templateData,
        html,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: tenant.email || 'system',
        tenantId: tenant.id
      };
      
      const newRef = await push(templatesRef, newTemplate);
      
      toast.success('E-Mail-Vorlage erstellt');
      return newRef.key;
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Fehler beim Erstellen der Vorlage');
      throw error;
    }
  }, [tenant]);

  // Update template
  const updateTemplate = useCallback(async (templateId, updates) => {
    if (!tenant?.id) {
      throw new Error('No tenant selected');
    }

    try {
      const db = getDatabaseInstance();
      const templateRef = ref(db, `tenants/${tenant.id}/emailTemplates/${templateId}`);
      
      // Compile MJML to HTML if MJML is updated
      let html = updates.html;
      if (updates.mjml) {
        const result = mjml2html(updates.mjml, {
          validationLevel: 'soft',
          minify: true
        });
        html = result.html;
      }
      
      const updateData = {
        ...updates,
        html,
        updatedAt: new Date().toISOString(),
        updatedBy: tenant.email || 'system'
      };
      
      await update(templateRef, updateData);
      
      toast.success('E-Mail-Vorlage aktualisiert');
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Fehler beim Aktualisieren der Vorlage');
      throw error;
    }
  }, [tenant]);

  // Delete template
  const deleteTemplate = useCallback(async (templateId) => {
    if (!tenant?.id) {
      throw new Error('No tenant selected');
    }

    try {
      const db = getDatabaseInstance();
      const templateRef = ref(db, `tenants/${tenant.id}/emailTemplates/${templateId}`);
      
      await remove(templateRef);
      
      toast.success('E-Mail-Vorlage gelöscht');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Fehler beim Löschen der Vorlage');
      throw error;
    }
  }, [tenant]);

  // Duplicate template
  const duplicateTemplate = useCallback(async (template) => {
    if (!tenant?.id) {
      throw new Error('No tenant selected');
    }

    try {
      const duplicatedTemplate = {
        ...template,
        name: `${template.name} (Kopie)`,
        isActive: false,
        id: undefined
      };
      
      const newId = await createTemplate(duplicatedTemplate);
      return newId;
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Fehler beim Duplizieren der Vorlage');
      throw error;
    }
  }, [tenant, createTemplate]);

  // Get template by ID
  const getTemplateById = useCallback((templateId) => {
    return templates.find(template => template.id === templateId);
  }, [templates]);

  // Get templates by type
  const getTemplatesByType = useCallback((type) => {
    return templates.filter(template => template.type === type);
  }, [templates]);

  // Get active templates
  const getActiveTemplates = useCallback(() => {
    return templates.filter(template => template.isActive);
  }, [templates]);

  // Send test email
  const sendTestEmail = useCallback(async (templateId, testEmail) => {
    if (!tenant?.id) {
      throw new Error('No tenant selected');
    }

    try {
      // In production, this would call a Cloud Function
      // For now, we'll simulate the send
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success(`Test-E-Mail gesendet an ${testEmail}`);
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Fehler beim Senden der Test-E-Mail');
      throw error;
    }
  }, [tenant]);

  // Validate MJML
  const validateMjml = useCallback((mjmlContent) => {
    try {
      const result = mjml2html(mjmlContent, {
        validationLevel: 'strict'
      });
      
      return {
        valid: result.errors.length === 0,
        errors: result.errors,
        html: result.html
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: error.message }],
        html: ''
      };
    }
  }, []);

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    getTemplateById,
    getTemplatesByType,
    getActiveTemplates,
    sendTestEmail,
    validateMjml
  };
};