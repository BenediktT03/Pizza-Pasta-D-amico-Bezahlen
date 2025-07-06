/**
 * EATECH - Stack Trace Component
 * Version: 1.0.0
 * Description: Interaktive Stack-Trace-Anzeige mit Syntax-Highlighting und Source-Map-Support
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/pages/Monitoring/components/StackTrace.jsx
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Code,
  FileText,
  ExternalLink,
  Copy,
  ChevronRight,
  ChevronDown,
  Package,
  Folder,
  File,
  AlertCircle,
  Info,
  Maximize2,
  Minimize2,
  Download,
  Search,
  Filter,
  X
} from 'lucide-react';
import styles from './StackTrace.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const FILE_ICONS = {
  '.js': { icon: FileText, color: '#f7df1e' },
  '.jsx': { icon: FileText, color: '#61dafb' },
  '.ts': { icon: FileText, color: '#3178c6' },
  '.tsx': { icon: FileText, color: '#3178c6' },
  '.css': { icon: FileText, color: '#1572b6' },
  '.scss': { icon: FileText, color: '#cf649a' },
  '.json': { icon: FileText, color: '#292929' },
  '.html': { icon: FileText, color: '#e34c26' },
  '.vue': { icon: FileText, color: '#4fc08d' },
  '.svelte': { icon: FileText, color: '#ff3e00' }
};

const FRAMEWORK_PATTERNS = {
  react: /react|react-dom/i,
  next: /next\.js|next\//i,
  vue: /vue\.js|vue\//i,
  angular: /angular/i,
  svelte: /svelte/i,
  node: /node:|internal\//i,
  webpack: /webpack/i,
  vite: /vite/i
};

const SOURCE_PATTERNS = {
  nodeModules: /node_modules/,
  internal: /^internal\/|^\[/,
  native: /^native/,
  anonymous: /^<anonymous>/,
  eval: /eval at/
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const parseFrame = (frame) => {
  const { function: funcName, file, line, column } = frame;
  
  // Extract file extension
  const fileExt = file ? file.substring(file.lastIndexOf('.')) : '';
  const fileIcon = FILE_ICONS[fileExt] || { icon: File, color: '#6b7280' };
  
  // Detect framework
  let framework = null;
  Object.entries(FRAMEWORK_PATTERNS).forEach(([name, pattern]) => {
    if (pattern.test(file)) {
      framework = name;
    }
  });
  
  // Detect source type
  let sourceType = 'app';
  if (SOURCE_PATTERNS.nodeModules.test(file)) {
    sourceType = 'dependency';
  } else if (SOURCE_PATTERNS.internal.test(file)) {
    sourceType = 'internal';
  } else if (SOURCE_PATTERNS.native.test(file)) {
    sourceType = 'native';
  }
  
  // Clean file path
  const cleanPath = file
    .replace(/^.*\/node_modules\//, '')
    .replace(/^webpack:\/\/\//, '')
    .replace(/\?.*$/, '');
  
  // Extract package name if dependency
  let packageName = null;
  if (sourceType === 'dependency') {
    const match = cleanPath.match(/^(@[^\/]+\/[^\/]+|[^\/]+)/);
    packageName = match ? match[1] : null;
  }
  
  return {
    ...frame,
    fileExt,
    fileIcon,
    framework,
    sourceType,
    cleanPath,
    packageName,
    displayName: funcName || '<anonymous>'
  };
};

const highlightCode = (code, language = 'javascript') => {
  // Simple syntax highlighting
  const keywords = /\b(const|let|var|function|return|if|else|for|while|class|extends|import|export|from|async|await|try|catch|throw|new|this|super)\b/g;
  const strings = /(["'`])(?:(?=(\\?))\2.)*?\1/g;
  const numbers = /\b\d+\b/g;
  const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
  const functions = /\b(\w+)(?=\()/g;
  
  return code
    .replace(comments, '<span class="comment">$&</span>')
    .replace(strings, '<span class="string">$&</span>')
    .replace(keywords, '<span class="keyword">$&</span>')
    .replace(numbers, '<span class="number">$&</span>')
    .replace(functions, '<span class="function">$1</span>');
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const FrameComponent = ({ frame, index, expanded, onToggle, onCopy, onViewSource }) => {
  const parsed = useMemo(() => parseFrame(frame), [frame]);
  const FileIcon = parsed.fileIcon.icon;
  
  return (
    <div 
      className={styles.frame}
      data-source-type={parsed.sourceType}
      data-expanded={expanded}
    >
      <div 
        className={styles.frameHeader}
        onClick={() => onToggle(index)}
      >
        <div className={styles.frameIndex}>{index}</div>
        
        <div className={styles.frameInfo}>
          <div className={styles.frameFunctionRow}>
            <span className={styles.frameFunction}>{parsed.displayName}</span>
            {parsed.framework && (
              <span className={styles.frameFramework} data-framework={parsed.framework}>
                {parsed.framework}
              </span>
            )}
          </div>
          
          <div className={styles.frameLocation}>
            <FileIcon size={14} style={{ color: parsed.fileIcon.color }} />
            <span className={styles.framePath}>{parsed.cleanPath}</span>
            <span className={styles.framePosition}>:{frame.line}:{frame.column}</span>
          </div>
        </div>
        
        <div className={styles.frameActions}>
          {parsed.sourceType === 'app' && (
            <button
              className={styles.frameAction}
              onClick={(e) => {
                e.stopPropagation();
                onViewSource(frame);
              }}
              title="Source anzeigen"
            >
              <Code size={16} />
            </button>
          )}
          
          <button
            className={styles.frameAction}
            onClick={(e) => {
              e.stopPropagation();
              onCopy(frame);
            }}
            title="Frame kopieren"
          >
            <Copy size={16} />
          </button>
          
          <div className={styles.frameChevron}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className={styles.frameDetails}>
          <div className={styles.frameDetailGrid}>
            <div>
              <span>Funktion:</span>
              <strong>{frame.function || '<anonymous>'}</strong>
            </div>
            <div>
              <span>Datei:</span>
              <strong>{frame.file}</strong>
            </div>
            <div>
              <span>Position:</span>
              <strong>Zeile {frame.line}, Spalte {frame.column}</strong>
            </div>
            {parsed.packageName && (
              <div>
                <span>Package:</span>
                <strong>{parsed.packageName}</strong>
              </div>
            )}
          </div>
          
          {frame.source && (
            <div className={styles.frameSource}>
              <h5>Source Code:</h5>
              <pre>
                <code dangerouslySetInnerHTML={{ 
                  __html: highlightCode(frame.source) 
                }} />
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const StackTrace = ({ stack, frames = [], error = null }) => {
  const [expandedFrames, setExpandedFrames] = useState(new Set([0]));
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  
  // Parse frames if only stack string provided
  const parsedFrames = useMemo(() => {
    if (frames.length > 0) {
      return frames.map(parseFrame);
    }
    
    if (!stack) return [];
    
    // Parse stack string
    const lines = stack.split('\n');
    const parsed = [];
    
    lines.forEach((line, index) => {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        parsed.push(parseFrame({
          function: match[1],
          file: match[2],
          line: parseInt(match[3]),
          column: parseInt(match[4])
        }));
      } else {
        // Try alternate format
        const altMatch = line.match(/at\s+(.+?):(\d+):(\d+)/);
        if (altMatch) {
          parsed.push(parseFrame({
            function: '<anonymous>',
            file: altMatch[1],
            line: parseInt(altMatch[2]),
            column: parseInt(altMatch[3])
          }));
        }
      }
    });
    
    return parsed;
  }, [frames, stack]);
  
  // Filter frames
  const filteredFrames = useMemo(() => {
    let filtered = parsedFrames;
    
    // Apply source filter
    if (filter !== 'all') {
      filtered = filtered.filter(frame => frame.sourceType === filter);
    }
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(frame => 
        frame.displayName.toLowerCase().includes(search) ||
        frame.cleanPath.toLowerCase().includes(search) ||
        (frame.packageName && frame.packageName.toLowerCase().includes(search))
      );
    }
    
    return filtered;
  }, [parsedFrames, filter, searchTerm]);
  
  // Handlers
  const handleToggleFrame = useCallback((index) => {
    setExpandedFrames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);
  
  const handleExpandAll = useCallback(() => {
    setExpandedFrames(new Set(filteredFrames.map((_, i) => i)));
  }, [filteredFrames]);
  
  const handleCollapseAll = useCallback(() => {
    setExpandedFrames(new Set());
  }, []);
  
  const handleCopyFrame = useCallback((frame) => {
    const text = `at ${frame.function} (${frame.file}:${frame.line}:${frame.column})`;
    navigator.clipboard.writeText(text);
  }, []);
  
  const handleCopyAll = useCallback(() => {
    navigator.clipboard.writeText(stack || 'No stack trace available');
  }, [stack]);
  
  const handleViewSource = useCallback((frame) => {
    // In real implementation, this would open source viewer
    console.log('View source:', frame);
  }, []);
  
  const handleDownload = useCallback(() => {
    const data = {
      error: error,
      stack: stack,
      frames: parsedFrames,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stack-trace-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [error, stack, parsedFrames]);
  
  // Stats
  const stats = useMemo(() => {
    const byType = {};
    parsedFrames.forEach(frame => {
      byType[frame.sourceType] = (byType[frame.sourceType] || 0) + 1;
    });
    return byType;
  }, [parsedFrames]);
  
  if (!stack && frames.length === 0) {
    return (
      <div className={styles.emptyState}>
        <AlertCircle size={32} />
        <p>Kein Stack Trace verfügbar</p>
      </div>
    );
  }
  
  return (
    <div className={`${styles.container} ${fullscreen ? styles.fullscreen : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h4>Stack Trace</h4>
          <div className={styles.stats}>
            <span>{parsedFrames.length} Frames</span>
            {stats.app > 0 && <span className={styles.appFrames}>{stats.app} App</span>}
            {stats.dependency > 0 && <span className={styles.depFrames}>{stats.dependency} Dependencies</span>}
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <button onClick={() => setShowRaw(!showRaw)} title="Raw anzeigen">
            <Code size={16} />
          </button>
          <button onClick={handleDownload} title="Download">
            <Download size={16} />
          </button>
          <button onClick={handleCopyAll} title="Alles kopieren">
            <Copy size={16} />
          </button>
          <button onClick={() => setFullscreen(!fullscreen)} title="Vollbild">
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      
      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.filterGroup}>
          <button
            className={filter === 'all' ? styles.active : ''}
            onClick={() => setFilter('all')}
          >
            Alle
          </button>
          <button
            className={filter === 'app' ? styles.active : ''}
            onClick={() => setFilter('app')}
          >
            App Code
          </button>
          <button
            className={filter === 'dependency' ? styles.active : ''}
            onClick={() => setFilter('dependency')}
          >
            Dependencies
          </button>
        </div>
        
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Frames durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>
        
        <div className={styles.expandControls}>
          <button onClick={handleExpandAll}>Alle aufklappen</button>
          <button onClick={handleCollapseAll}>Alle zuklappen</button>
        </div>
      </div>
      
      {/* Content */}
      {showRaw ? (
        <div className={styles.rawStack}>
          <pre>{stack}</pre>
        </div>
      ) : (
        <div className={styles.frames}>
          {filteredFrames.length === 0 ? (
            <div className={styles.noResults}>
              <Info size={24} />
              <p>Keine Frames gefunden</p>
            </div>
          ) : (
            filteredFrames.map((frame, index) => (
              <FrameComponent
                key={index}
                frame={frame}
                index={index}
                expanded={expandedFrames.has(index)}
                onToggle={handleToggleFrame}
                onCopy={handleCopyFrame}
                onViewSource={handleViewSource}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default React.memo(StackTrace);