import React, { forwardRef, HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const gridVariants = cva(
  'grid',
  {
    variants: {
      cols: {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
        6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
        12: 'grid-cols-12',
        auto: 'grid-cols-[repeat(auto-fit,minmax(250px,1fr))]',
      },
      gap: {
        none: 'gap-0',
        xs: 'gap-2',
        sm: 'gap-4',
        md: 'gap-6',
        lg: 'gap-8',
        xl: 'gap-12',
      },
      align: {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
        baseline: 'items-baseline',
      },
      justify: {
        start: 'justify-items-start',
        center: 'justify-items-center',
        end: 'justify-items-end',
        stretch: 'justify-items-stretch',
      },
    },
    defaultVariants: {
      cols: 1,
      gap: 'md',
      align: 'stretch',
      justify: 'stretch',
    },
  }
);

export interface GridProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
  as?: keyof JSX.IntrinsicElements;
}

const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols, gap, align, justify, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(gridVariants({ cols, gap, align, justify, className }))}
        {...props}
      />
    );
  }
);

Grid.displayName = 'Grid';

// Grid Item component for more control over individual items
export interface GridItemProps extends HTMLAttributes<HTMLDivElement> {
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'full' | 'auto';
  rowSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 'full' | 'auto';
  colStart?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto';
  colEnd?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'auto';
  rowStart?: 1 | 2 | 3 | 4 | 5 | 6 | 'auto';
  rowEnd?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'auto';
}

const colSpanClasses = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
  full: 'col-span-full',
  auto: 'col-auto',
};

const rowSpanClasses = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
  4: 'row-span-4',
  5: 'row-span-5',
  6: 'row-span-6',
  full: 'row-span-full',
  auto: 'row-auto',
};

const colStartClasses = {
  1: 'col-start-1',
  2: 'col-start-2',
  3: 'col-start-3',
  4: 'col-start-4',
  5: 'col-start-5',
  6: 'col-start-6',
  7: 'col-start-7',
  8: 'col-start-8',
  9: 'col-start-9',
  10: 'col-start-10',
  11: 'col-start-11',
  12: 'col-start-12',
  auto: 'col-start-auto',
};

const colEndClasses = {
  1: 'col-end-1',
  2: 'col-end-2',
  3: 'col-end-3',
  4: 'col-end-4',
  5: 'col-end-5',
  6: 'col-end-6',
  7: 'col-end-7',
  8: 'col-end-8',
  9: 'col-end-9',
  10: 'col-end-10',
  11: 'col-end-11',
  12: 'col-end-12',
  13: 'col-end-13',
  auto: 'col-end-auto',
};

export const GridItem = forwardRef<HTMLDivElement, GridItemProps>(
  ({ className, colSpan, rowSpan, colStart, colEnd, rowStart, rowEnd, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          colSpan && colSpanClasses[colSpan],
          rowSpan && rowSpanClasses[rowSpan],
          colStart && colStartClasses[colStart],
          colEnd && colEndClasses[colEnd],
          rowStart && `row-start-${rowStart}`,
          rowEnd && `row-end-${rowEnd}`,
          className
        )}
        {...props}
      />
    );
  }
);

GridItem.displayName = 'GridItem';

// Flexbox layout component
const flexVariants = cva(
  'flex',
  {
    variants: {
      direction: {
        row: 'flex-row',
        col: 'flex-col',
        rowReverse: 'flex-row-reverse',
        colReverse: 'flex-col-reverse',
      },
      wrap: {
        nowrap: 'flex-nowrap',
        wrap: 'flex-wrap',
        wrapReverse: 'flex-wrap-reverse',
      },
      align: {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
        baseline: 'items-baseline',
      },
      justify: {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly',
      },
      gap: {
        none: 'gap-0',
        xs: 'gap-2',
        sm: 'gap-4',
        md: 'gap-6',
        lg: 'gap-8',
        xl: 'gap-12',
      },
    },
    defaultVariants: {
      direction: 'row',
      wrap: 'nowrap',
      align: 'stretch',
      justify: 'start',
      gap: 'none',
    },
  }
);

export interface FlexProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof flexVariants> {
  as?: keyof JSX.IntrinsicElements;
}

export const Flex = forwardRef<HTMLDivElement, FlexProps>(
  ({ className, direction, wrap, align, justify, gap, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(flexVariants({ direction, wrap, align, justify, gap, className }))}
        {...props}
      />
    );
  }
);

Flex.displayName = 'Flex';

// Stack component (simplified Flex for common use cases)
export interface StackProps extends Omit<FlexProps, 'direction'> {
  direction?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({ direction = 'vertical', spacing = 'md', ...props }, ref) => {
    return (
      <Flex
        ref={ref}
        direction={direction === 'vertical' ? 'col' : 'row'}
        gap={spacing}
        {...props}
      />
    );
  }
);

Stack.displayName = 'Stack';

export { Grid, gridVariants, flexVariants };
