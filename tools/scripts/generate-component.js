#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { pascalCase, camelCase, kebabCase } = require('change-case');

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Component templates
const templates = {
  component: (name) => `import React from 'react';
import { cn } from '@/utils/cn';
import styles from './${name}.module.css';

export interface ${name}Props {
  className?: string;
  children?: React.ReactNode;
  // Add your props here
}

export const ${name}: React.FC<${name}Props> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(styles.root, className)}
      data-testid="${kebabCase(name)}"
      {...props}
    >
      {children}
    </div>
  );
};

${name}.displayName = '${name}';
`,

  styles: (name) => `.root {
  /* Add your styles here */
}
`,

  test: (name) => `import React from 'react';
import { render, screen } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('renders without crashing', () => {
    render(<${name} />);
    expect(screen.getByTestId('${kebabCase(name)}')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<${name} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders children', () => {
    render(
      <${name}>
        <span>Test Content</span>
      </${name}>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
`,

  story: (name) => `import type { Meta, StoryObj } from '@storybook/react';
import { ${name} } from './${name}';

const meta = {
  title: 'Components/${name}',
  component: ${name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof ${name}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: '${name} Component',
  },
};

export const CustomStyle: Story = {
  args: {
    children: 'With Custom Style',
    className: 'custom-class',
  },
};
`,

  index: (name) => `export { ${name} } from './${name}';
export type { ${name}Props } from './${name}';
`,

  hook: (name) => `import { useState, useEffect, useCallback } from 'react';

interface ${name}Options {
  // Add your options here
}

interface ${name}Return {
  // Add your return type here
}

export function ${camelCase(name)}(options?: ${name}Options): ${name}Return {
  const [state, setState] = useState();

  useEffect(() => {
    // Add your effect logic here
  }, []);

  const someMethod = useCallback(() => {
    // Add your method logic here
  }, []);

  return {
    // Return your hook values here
    state,
    someMethod,
  };
}
`,

  service: (name) => `import { db, auth } from '@/config/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';

export interface ${name}Data {
  id: string;
  // Add your data properties here
  createdAt: Date;
  updatedAt: Date;
}

export class ${name}Service {
  private static instance: ${name}Service;
  private collectionName = '${camelCase(name)}s';

  private constructor() {}

  static getInstance(): ${name}Service {
    if (!${name}Service.instance) {
      ${name}Service.instance = new ${name}Service();
    }
    return ${name}Service.instance;
  }

  async create(data: Omit<${name}Data, 'id' | 'createdAt' | 'updatedAt'>): Promise<${name}Data> {
    const docRef = doc(collection(db, this.collectionName));
    const now = new Date();
    
    const newData: ${name}Data = {
      ...data,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, newData);
    return newData;
  }

  async getById(id: string): Promise<${name}Data | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as ${name}Data;
    }
    return null;
  }

  async update(id: string, data: Partial<${name}Data>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await deleteDoc(docRef);
  }

  async list(options?: {
    limit?: number;
    orderBy?: keyof ${name}Data;
    orderDirection?: 'asc' | 'desc';
  }): Promise<${name}Data[]> {
    let q = query(collection(db, this.collectionName));

    if (options?.orderBy) {
      q = query(q, orderBy(options.orderBy, options.orderDirection || 'asc'));
    }

    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as ${name}Data);
  }
}

export const ${camelCase(name)}Service = ${name}Service.getInstance();
`,

  store: (name) => `import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface ${name}State {
  // Add your state properties here
  items: any[];
  loading: boolean;
  error: string | null;
}

interface ${name}Actions {
  // Add your actions here
  setItems: (items: any[]) => void;
  addItem: (item: any) => void;
  removeItem: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type ${name}Store = ${name}State & ${name}Actions;

const initialState: ${name}State = {
  items: [],
  loading: false,
  error: null,
};

export const use${name}Store = create<${name}Store>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,

        setItems: (items) =>
          set((state) => {
            state.items = items;
          }),

        addItem: (item) =>
          set((state) => {
            state.items.push(item);
          }),

        removeItem: (id) =>
          set((state) => {
            state.items = state.items.filter((item) => item.id !== id);
          }),

        setLoading: (loading) =>
          set((state) => {
            state.loading = loading;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
          }),

        reset: () => set(initialState),
      })),
      {
        name: '${kebabCase(name)}-store',
      }
    )
  )
);
`,

  page: (name) => `import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/utils/cn';
import styles from './${name}.module.css';

export interface ${name}PageProps {
  className?: string;
}

export const ${name}Page: React.FC<${name}PageProps> = ({ className }) => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('${camelCase(name)}.title')} - EATECH</title>
        <meta name="description" content={t('${camelCase(name)}.description')} />
      </Helmet>

      <div className={cn(styles.root, className)}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('${camelCase(name)}.title')}</h1>
        </div>

        <div className={styles.content}>
          {/* Add your page content here */}
        </div>
      </div>
    </>
  );
};

export default ${name}Page;
`
};

// Main CLI
async function main() {
  console.log(chalk.cyan.bold('\n🚀 EATECH Component Generator\n'));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'What would you like to generate?',
      choices: [
        { name: '📦 Component', value: 'component' },
        { name: '🪝 Hook', value: 'hook' },
        { name: '🔧 Service', value: 'service' },
        { name: '📊 Store', value: 'store' },
        { name: '📄 Page', value: 'page' },
      ],
    },
    {
      type: 'input',
      name: 'name',
      message: 'What is the name?',
      validate: (input) => {
        if (!input) return 'Name is required';
        if (!/^[A-Z]/.test(input)) return 'Name must start with uppercase letter';
        return true;
      },
    },
    {
      type: 'list',
      name: 'app',
      message: 'Which app?',
      choices: ['web', 'admin', 'master', 'kitchen', 'landing'],
      when: (answers) => answers.type !== 'service',
    },
    {
      type: 'confirm',
      name: 'includeTests',
      message: 'Include tests?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'includeStory',
      message: 'Include Storybook story?',
      default: true,
      when: (answers) => answers.type === 'component',
    },
  ]);

  const { type, name, app, includeTests, includeStory } = answers;
  const componentName = pascalCase(name);

  // Determine base path
  let basePath;
  switch (type) {
    case 'component':
      basePath = path.join('apps', app, 'src', 'components', componentName);
      break;
    case 'hook':
      basePath = path.join('apps', app, 'src', 'hooks');
      break;
    case 'service':
      basePath = path.join('packages', 'core', 'src', 'services', kebabCase(name));
      break;
    case 'store':
      basePath = path.join('apps', app, 'src', 'stores');
      break;
    case 'page':
      basePath = path.join('apps', app, 'src', 'pages', componentName);
      break;
  }

  try {
    // Create directory if needed
    if (type === 'component' || type === 'page') {
      await mkdir(basePath, { recursive: true });
    }

    // Generate files
    const files = [];

    switch (type) {
      case 'component':
        files.push(
          { path: path.join(basePath, `${componentName}.tsx`), content: templates.component(componentName) },
          { path: path.join(basePath, `${componentName}.module.css`), content: templates.styles(componentName) },
          { path: path.join(basePath, 'index.ts'), content: templates.index(componentName) }
        );
        if (includeTests) {
          files.push({ 
            path: path.join(basePath, `${componentName}.test.tsx`), 
            content: templates.test(componentName) 
          });
        }
        if (includeStory) {
          files.push({ 
            path: path.join(basePath, `${componentName}.stories.tsx`), 
            content: templates.story(componentName) 
          });
        }
        break;

      case 'hook':
        files.push({ 
          path: path.join(basePath, `${camelCase(name)}.ts`), 
          content: templates.hook(componentName) 
        });
        if (includeTests) {
          files.push({ 
            path: path.join(basePath, `${camelCase(name)}.test.ts`), 
            content: templates.test(componentName) 
          });
        }
        break;

      case 'service':
        files.push({ 
          path: path.join(basePath, `${kebabCase(name)}.service.ts`), 
          content: templates.service(componentName) 
        });
        if (includeTests) {
          files.push({ 
            path: path.join(basePath, `${kebabCase(name)}.service.test.ts`), 
            content: templates.test(componentName) 
          });
        }
        break;

      case 'store':
        files.push({ 
          path: path.join(basePath, `${kebabCase(name)}.store.ts`), 
          content: templates.store(componentName) 
        });
        if (includeTests) {
          files.push({ 
            path: path.join(basePath, `${kebabCase(name)}.store.test.ts`), 
            content: templates.test(componentName) 
          });
        }
        break;

      case 'page':
        files.push(
          { path: path.join(basePath, `${componentName}.tsx`), content: templates.page(componentName) },
          { path: path.join(basePath, `${componentName}.module.css`), content: templates.styles(componentName) },
          { path: path.join(basePath, 'index.ts'), content: templates.index(componentName) }
        );
        if (includeTests) {
          files.push({ 
            path: path.join(basePath, `${componentName}.test.tsx`), 
            content: templates.test(componentName) 
          });
        }
        break;
    }

    // Write all files
    for (const file of files) {
      await writeFile(file.path, file.content);
      console.log(chalk.green(`✅ Created: ${file.path}`));
    }

    console.log(chalk.cyan.bold(`\n🎉 Successfully generated ${type}: ${componentName}\n`));

    // Show next steps
    console.log(chalk.yellow('📝 Next steps:'));
    console.log(chalk.gray(`   1. Import and use your new ${type}`));
    if (includeTests) {
      console.log(chalk.gray(`   2. Run tests: npm test ${componentName}`));
    }
    if (includeStory && type === 'component') {
      console.log(chalk.gray(`   3. View in Storybook: npm run storybook`));
    }
    console.log('');

  } catch (error) {
    console.error(chalk.red('❌ Error generating files:'), error.message);
    process.exit(1);
  }
}

// Run CLI
main().catch((error) => {
  console.error(chalk.red('❌ Unexpected error:'), error);
  process.exit(1);
});
