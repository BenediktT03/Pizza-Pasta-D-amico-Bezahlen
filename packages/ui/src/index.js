/**
 * EATECH UI Component Library
 * Central export file for all shared components
 * File Path: /packages/ui/src/index.js
 */

// Layout Components
export { default as Container } from './components/Layout/Container';
export { default as Grid } from './components/Layout/Grid';
export { default as Flex } from './components/Layout/Flex';
export { default as Spacer } from './components/Layout/Spacer';

// Core Components
export { default as Button } from './components/Button/Button';
export { default as Card } from './components/Card/Card';
export { default as Modal } from './components/Modal/Modal';
export { default as Badge } from './components/Badge/Badge';
export { default as Avatar } from './components/Avatar/Avatar';
export { default as Spinner } from './components/Spinner/Spinner';
export { default as Skeleton } from './components/Skeleton/Skeleton';

// Form Components
export { default as Input } from './components/Form/Input';
export { default as Select } from './components/Form/Select';
export { default as Checkbox } from './components/Form/Checkbox';
export { default as Radio } from './components/Form/Radio';
export { default as Switch } from './components/Form/Switch';
export { default as TextArea } from './components/Form/TextArea';
export { default as FormGroup } from './components/Form/FormGroup';
export { default as FormLabel } from './components/Form/FormLabel';
export { default as FormError } from './components/Form/FormError';

// Data Display
export { default as Table } from './components/Table/Table';
export { default as List } from './components/List/List';
export { default as Stat } from './components/Stat/Stat';
export { default as Progress } from './components/Progress/Progress';
export { default as Empty } from './components/Empty/Empty';

// Feedback Components
export { default as Alert } from './components/Alert/Alert';
export { default as Toast } from './components/Toast/Toast';
export { default as Tooltip } from './components/Tooltip/Tooltip';
export { default as Popover } from './components/Popover/Popover';

// Navigation
export { default as Tabs } from './components/Tabs/Tabs';
export { default as Breadcrumb } from './components/Breadcrumb/Breadcrumb';
export { default as Pagination } from './components/Pagination/Pagination';
export { default as Dropdown } from './components/Dropdown/Dropdown';

// Typography
export { default as Heading } from './components/Typography/Heading';
export { default as Text } from './components/Typography/Text';
export { default as Link } from './components/Typography/Link';

// EATECH Specific Components
export { default as TenantSelector } from './components/TenantSelector/TenantSelector';
export { default as ProductCard } from './components/ProductCard/ProductCard';
export { default as OrderCard } from './components/OrderCard/OrderCard';
export { default as QRCode } from './components/QRCode/QRCode';
export { default as PriceDisplay } from './components/PriceDisplay/PriceDisplay';

// Hooks
export { default as useTheme } from './hooks/useTheme';
export { default as useMediaQuery } from './hooks/useMediaQuery';
export { default as useClickOutside } from './hooks/useClickOutside';
export { default as useDebounce } from './hooks/useDebounce';

// Theme
export { default as defaultTheme } from './theme/defaultTheme';
export { ThemeProvider } from './theme/ThemeProvider';

// Utils
export * from './utils/colors';
export * from './utils/spacing';
export * from './utils/breakpoints';