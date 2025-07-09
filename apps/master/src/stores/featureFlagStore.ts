// Feature Flag Store for Master Admin
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  dependencies?: string[];
  incompatible?: string[];
  rolloutPercentage: number;
  schedule?: {
    enableAt?: Date;
    disableAt?: Date;
  };
  level: 'global' | 'manager' | 'truck';
  targetId?: string; // managerId or truckId if not global
  lastModified: Date;
  lastModifiedBy: string;
}

export interface FeatureFlagCategory {
  id: string;
  name: string;
  icon: string;
  features: FeatureFlag[];
}

interface FeatureFlagState {
  // Feature flags
  globalFlags: FeatureFlag[];
  managerFlags: Map<string, FeatureFlag[]>; // managerId -> flags
  truckFlags: Map<string, FeatureFlag[]>; // truckId -> flags
  
  // UI State
  selectedCategory: string;
  searchTerm: string;
  viewMode: 'grid' | 'list';
  showScheduled: boolean;
  showRollout: boolean;
  
  // Selected entities for bulk operations
  selectedFlags: Set<string>;
  
  // Actions
  setGlobalFlags: (flags: FeatureFlag[]) => void;
  setManagerFlags: (managerId: string, flags: FeatureFlag[]) => void;
  setTruckFlags: (truckId: string, flags: FeatureFlag[]) => void;
  updateFlag: (flag: FeatureFlag) => void;
  toggleFlag: (flagKey: string, level: 'global' | 'manager' | 'truck', targetId?: string) => void;
  bulkToggle: (flagKeys: string[], enabled: boolean, level: 'global' | 'manager' | 'truck', targetId?: string) => void;
  setSelectedCategory: (category: string) => void;
  setSearchTerm: (term: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  toggleShowScheduled: () => void;
  toggleShowRollout: () => void;
  toggleFlagSelection: (flagKey: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
}

// Feature categories configuration
export const FEATURE_CATEGORIES: FeatureFlagCategory[] = [
  { id: 'all', name: 'Alle Features', icon: '🎯', features: [] },
  { id: 'ordering', name: 'Bestellung', icon: '🛒', features: [] },
  { id: 'payment', name: 'Zahlung', icon: '💳', features: [] },
  { id: 'ai', name: 'AI/ML', icon: '🤖', features: [] },
  { id: 'analytics', name: 'Analytics', icon: '📊', features: [] },
  { id: 'kitchen', name: 'Küche', icon: '🍳', features: [] },
  { id: 'haccp', name: 'HACCP', icon: '🌡️', features: [] },
  { id: 'notifications', name: 'Benachrichtigungen', icon: '🔔', features: [] },
  { id: 'branding', name: 'Branding', icon: '🎨', features: [] },
  { id: 'social', name: 'Community', icon: '👥', features: [] }
];

export const useFeatureFlagStore = create<FeatureFlagState>()(
  devtools(
    (set, get) => ({
      // Initial state
      globalFlags: [],
      managerFlags: new Map(),
      truckFlags: new Map(),
      selectedCategory: 'all',
      searchTerm: '',
      viewMode: 'grid',
      showScheduled: false,
      showRollout: false,
      selectedFlags: new Set(),

      // Actions
      setGlobalFlags: (flags) => set({ globalFlags: flags }),
      
      setManagerFlags: (managerId, flags) => set((state) => {
        const newMap = new Map(state.managerFlags);
        newMap.set(managerId, flags);
        return { managerFlags: newMap };
      }),
      
      setTruckFlags: (truckId, flags) => set((state) => {
        const newMap = new Map(state.truckFlags);
        newMap.set(truckId, flags);
        return { truckFlags: newMap };
      }),
      
      updateFlag: (flag) => set((state) => {
        if (flag.level === 'global') {
          return {
            globalFlags: state.globalFlags.map(f => 
              f.key === flag.key ? flag : f
            )
          };
        } else if (flag.level === 'manager' && flag.targetId) {
          const managerFlags = state.managerFlags.get(flag.targetId) || [];
          const newManagerFlags = new Map(state.managerFlags);
          newManagerFlags.set(flag.targetId, managerFlags.map(f => 
            f.key === flag.key ? flag : f
          ));
          return { managerFlags: newManagerFlags };
        } else if (flag.level === 'truck' && flag.targetId) {
          const truckFlags = state.truckFlags.get(flag.targetId) || [];
          const newTruckFlags = new Map(state.truckFlags);
          newTruckFlags.set(flag.targetId, truckFlags.map(f => 
            f.key === flag.key ? flag : f
          ));
          return { truckFlags: newTruckFlags };
        }
        return state;
      }),
      
      toggleFlag: (flagKey, level, targetId) => {
        const state = get();
        let flag: FeatureFlag | undefined;
        
        if (level === 'global') {
          flag = state.globalFlags.find(f => f.key === flagKey);
        } else if (level === 'manager' && targetId) {
          flag = state.managerFlags.get(targetId)?.find(f => f.key === flagKey);
        } else if (level === 'truck' && targetId) {
          flag = state.truckFlags.get(targetId)?.find(f => f.key === flagKey);
        }
        
        if (flag) {
          get().updateFlag({
            ...flag,
            enabled: !flag.enabled,
            lastModified: new Date(),
            lastModifiedBy: 'master_admin'
          });
        }
      },
      
      bulkToggle: (flagKeys, enabled, level, targetId) => {
        const state = get();
        
        flagKeys.forEach(key => {
          let flag: FeatureFlag | undefined;
          
          if (level === 'global') {
            flag = state.globalFlags.find(f => f.key === key);
          } else if (level === 'manager' && targetId) {
            flag = state.managerFlags.get(targetId)?.find(f => f.key === key);
          } else if (level === 'truck' && targetId) {
            flag = state.truckFlags.get(targetId)?.find(f => f.key === key);
          }
          
          if (flag) {
            get().updateFlag({
              ...flag,
              enabled,
              lastModified: new Date(),
              lastModifiedBy: 'master_admin'
            });
          }
        });
      },
      
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setSearchTerm: (term) => set({ searchTerm: term }),
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleShowScheduled: () => set((state) => ({ showScheduled: !state.showScheduled })),
      toggleShowRollout: () => set((state) => ({ showRollout: !state.showRollout })),
      
      toggleFlagSelection: (flagKey) => set((state) => {
        const newSelection = new Set(state.selectedFlags);
        if (newSelection.has(flagKey)) {
          newSelection.delete(flagKey);
        } else {
          newSelection.add(flagKey);
        }
        return { selectedFlags: newSelection };
      }),
      
      clearSelection: () => set({ selectedFlags: new Set() }),
      
      selectAll: () => set((state) => {
        const allFlags = state.globalFlags.map(f => f.key);
        return { selectedFlags: new Set(allFlags) };
      })
    })
  )
);

// Selectors
export const useFilteredFlags = (level: 'global' | 'manager' | 'truck' = 'global', targetId?: string) => {
  const {
    globalFlags,
    managerFlags,
    truckFlags,
    selectedCategory,
    searchTerm,
    showScheduled,
    showRollout
  } = useFeatureFlagStore();
  
  let flags: FeatureFlag[] = [];
  
  if (level === 'global') {
    flags = globalFlags;
  } else if (level === 'manager' && targetId) {
    flags = managerFlags.get(targetId) || [];
  } else if (level === 'truck' && targetId) {
    flags = truckFlags.get(targetId) || [];
  }
  
  // Category filter
  if (selectedCategory !== 'all') {
    flags = flags.filter(f => f.category === selectedCategory);
  }
  
  // Search filter
  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    flags = flags.filter(f => 
      f.name.toLowerCase().includes(search) ||
      f.description.toLowerCase().includes(search) ||
      f.key.toLowerCase().includes(search)
    );
  }
  
  // Special filters
  if (showScheduled) {
    flags = flags.filter(f => f.schedule);
  }
  
  if (showRollout) {
    flags = flags.filter(f => f.rolloutPercentage < 100);
  }
  
  return flags;
};

// Get feature stats
export const useFeatureStats = () => {
  const { globalFlags } = useFeatureFlagStore();
  
  const total = globalFlags.length;
  const active = globalFlags.filter(f => f.enabled).length;
  const scheduled = globalFlags.filter(f => f.schedule).length;
  const rollout = globalFlags.filter(f => f.rolloutPercentage < 100).length;
  const withDependencies = globalFlags.filter(f => f.dependencies && f.dependencies.length > 0).length;
  
  return {
    total,
    active,
    inactive: total - active,
    scheduled,
    rollout,
    withDependencies,
    activePercentage: total > 0 ? Math.round((active / total) * 100) : 0
  };
};
