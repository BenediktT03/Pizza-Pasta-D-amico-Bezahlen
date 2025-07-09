// Re-export all components
export * from './components/Button/Button';
export * from './components/Card/Card';
export * from './components/Modal/Modal';
export * from './components/Form/Input';
export * from './components/Form/Select';
export * from './components/Form/Checkbox';
export * from './components/Layout/Container';
export * from './components/Layout/Grid';
export * from './components/Feedback/Alert';
export * from './components/Feedback/Toast';
export * from './components/Navigation/Tabs';
export * from './components/DataDisplay/Table';

// Re-export themes
export * from './themes';

// Re-export animations
export * from './animations/transitions';

// Re-export utilities
export * from './utils/cn';

// Export types
export type { ButtonProps } from './components/Button/Button';
export type { CardProps } from './components/Card/Card';
export type { ModalProps } from './components/Modal/Modal';
export type { InputProps } from './components/Form/Input';
export type { SelectProps, SelectOption } from './components/Form/Select';
export type { CheckboxProps } from './components/Form/Checkbox';
export type { ContainerProps } from './components/Layout/Container';
export type { GridProps, GridItemProps } from './components/Layout/Grid';
export type { AlertProps } from './components/Feedback/Alert';
export type { Toast, ToastProviderProps } from './components/Feedback/Toast';
export type { TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps } from './components/Navigation/Tabs';
export type { DataTableProps, DataTableColumn } from './components/DataDisplay/Table';

// Component groups for easy importing
export const Form = {
  Input: () => import('./components/Form/Input').then(m => m.Input),
  Select: () => import('./components/Form/Select').then(m => m.Select),
  Checkbox: () => import('./components/Form/Checkbox').then(m => m.Checkbox),
};

export const Layout = {
  Container: () => import('./components/Layout/Container').then(m => m.Container),
  Grid: () => import('./components/Layout/Grid').then(m => m.Grid),
  GridItem: () => import('./components/Layout/Grid').then(m => m.GridItem),
  Flex: () => import('./components/Layout/Grid').then(m => m.Flex),
  Stack: () => import('./components/Layout/Grid').then(m => m.Stack),
};

export const Feedback = {
  Alert: () => import('./components/Feedback/Alert').then(m => m.Alert),
  AlertDialog: () => import('./components/Feedback/Alert').then(m => m.AlertDialog),
  Toast: () => import('./components/Feedback/Toast').then(m => m.ToastProvider),
};

// Version
export const VERSION = '1.0.0';

// Default export with all components
export default {
  // Core components
  Button: () => import('./components/Button/Button').then(m => m.Button),
  Card: () => import('./components/Card/Card').then(m => m.Card),
  Modal: () => import('./components/Modal/Modal').then(m => m.Modal),
  
  // Form components
  Form,
  
  // Layout components
  Layout,
  
  // Feedback components
  Feedback,
  
  // Navigation components
  Tabs: () => import('./components/Navigation/Tabs').then(m => m.Tabs),
  TabsList: () => import('./components/Navigation/Tabs').then(m => m.TabsList),
  TabsTrigger: () => import('./components/Navigation/Tabs').then(m => m.TabsTrigger),
  TabsContent: () => import('./components/Navigation/Tabs').then(m => m.TabsContent),
  
  // Data display components
  Table: () => import('./components/DataDisplay/Table').then(m => m.Table),
  DataTable: () => import('./components/DataDisplay/Table').then(m => m.DataTable),
  
  // Utilities
  cn: () => import('./utils/cn').then(m => m.cn),
  
  // Version
  VERSION,
};
