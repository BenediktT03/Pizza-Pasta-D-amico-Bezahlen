/**
 * EATECH - Dashboard Favorites System Styles
 * File Path: /apps/admin/src/pages/Dashboard/Dashboard.css
 */

/* ============================================================================
   BASE
   ============================================================================ */
.dashboard {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 2rem;
  position: relative;
}

/* Animated Background */
.dashboard::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(at 20% 80%, var(--primary) 0px, transparent 50%),
    radial-gradient(at 80% 20%, var(--secondary) 0px, transparent 50%);
  opacity: 0.02;
  pointer-events: none;
  animation: backgroundFloat 20s ease-in-out infinite;
}

@keyframes backgroundFloat {
  0%, 100% { transform: scale(1) translate(0, 0); }
  50% { transform: scale(1.1) translate(-20px, -20px); }
}

/* ============================================================================
   HEADER
   ============================================================================ */
.dashboard-header {
  margin-bottom: 3rem;
  animation: slideInDown 0.6s ease-out;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 2rem;
}

.dashboard-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title-icon {
  color: var(--primary);
  animation: sparkle 3s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { 
    transform: scale(1) rotate(0deg);
    filter: brightness(1);
  }
  50% { 
    transform: scale(1.1) rotate(180deg);
    filter: brightness(1.3);
  }
}

.dashboard-subtitle {
  color: var(--text-secondary);
  margin-top: 0.5rem;
  font-size: 1.125rem;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.time-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.time {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.date {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.view-toggle,
.refresh-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-toggle:hover,
.refresh-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  transform: translateY(-2px);
}

.view-toggle.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.refresh-btn:hover {
  animation: rotate 0.5s ease;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ============================================================================
   QUICK STATS
   ============================================================================ */
.quick-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.6s ease-out;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:nth-child(1) { animation-delay: 0.1s; }
.stat-card:nth-child(2) { animation-delay: 0.2s; }
.stat-card:nth-child(3) { animation-delay: 0.3s; }
.stat-card:nth-child(4) { animation-delay: 0.4s; }

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.5s ease;
}

.stat-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--glow);
}

.stat-card:hover::before {
  transform: scaleX(1);
}

.stat-card.primary { --gradient: linear-gradient(90deg, #4ECDC4, #44A3AA); }
.stat-card.secondary { --gradient: linear-gradient(90deg, #FFD700, #FFA500); }
.stat-card.tertiary { --gradient: linear-gradient(90deg, #A855F7, #9333EA); }
.stat-card.quaternary { --gradient: linear-gradient(90deg, #FF6B6B, #FF5252); }

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 12px;
  margin-bottom: 1rem;
  color: var(--primary);
}

.stat-content h3 {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.stat-trend {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  background: var(--bg-tertiary);
}

.stat-trend.positive {
  color: #4ADE80;
  background: rgba(74, 222, 128, 0.1);
}

.stat-trend.negative {
  color: #EF4444;
  background: rgba(239, 68, 68, 0.1);
}

.stat-trend.neutral {
  color: var(--text-secondary);
}

/* Mini Charts */
.mini-pie {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
}

.activity-bars {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 40px;
}

.activity-bars .bar {
  width: 6px;
  background: var(--primary);
  border-radius: 3px 3px 0 0;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.activity-bars .bar:hover {
  opacity: 1;
}

/* ============================================================================
   FAVORITES SECTION
   ============================================================================ */
.favorites-section {
  margin-bottom: 3rem;
}

.section-header {
  margin-bottom: 2rem;
  animation: fadeIn 0.8s ease-out 0.5s both;
}

.section-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.section-icon {
  color: var(--primary);
}

.section-subtitle {
  color: var(--text-secondary);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-color);
  border-radius: 20px;
  color: var(--text-secondary);
}

.empty-state svg {
  color: var(--text-tertiary);
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

/* Category Groups */
.category-group {
  margin-bottom: 2.5rem;
  animation: fadeInUp 0.6s ease-out;
}

.category-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

/* Grid View */
.favorites-container.grid .functions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.function-card.grid {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.function-card.grid::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--gradient);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.function-card.grid:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 24px var(--shadow-color);
  border-color: var(--primary);
}

.function-card.grid:hover::before {
  opacity: 0.05;
}

/* List View */
.favorites-container.list .functions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.function-card.list {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.function-card.list:hover {
  background: var(--bg-tertiary);
  transform: translateX(8px);
  border-color: var(--primary);
}

/* Function Card Content */
.function-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.function-emoji {
  font-size: 2.5rem;
}

.function-arrow {
  color: var(--text-tertiary);
  transition: all 0.2s ease;
}

.function-card:hover .function-arrow {
  color: var(--primary);
  transform: translateX(4px);
}

.function-content h4 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.function-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.function-stats .stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.function-stats .stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.function-stats .stat-trend {
  margin-top: 0.5rem;
  font-size: 0.75rem;
}

.function-chart {
  margin-top: 1rem;
  height: 40px;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.function-card:hover .function-chart {
  opacity: 1;
}

/* List View Specific */
.function-card.list .function-header {
  margin-bottom: 0;
  gap: 1rem;
}

.function-card.list .function-emoji {
  font-size: 1.5rem;
}

.function-card.list .function-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.function-card.list h4 {
  margin-bottom: 0;
}

.function-card.list .function-stats {
  flex-direction: row;
  align-items: center;
  gap: 1rem;
}

.function-card.list .stat-value {
  font-size: 1.125rem;
}

/* ============================================================================
   ADD FUNCTIONS
   ============================================================================ */
.add-functions {
  text-align: center;
  padding: 3rem 0;
  animation: fadeIn 0.8s ease-out 0.8s both;
}

.add-button {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-button:hover {
  background: var(--bg-tertiary);
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-2px);
}

.hint {
  margin-top: 1rem;
  color: var(--text-tertiary);
  font-size: 0.875rem;
}

/* ============================================================================
   ANIMATIONS
   ============================================================================ */
@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ============================================================================
   RESPONSIVE
   ============================================================================ */
@media (max-width: 1200px) {
  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard {
    padding: 1rem;
  }
  
  .header-content {
    flex-direction: column;
  }
  
  .dashboard-title {
    font-size: 1.75rem;
  }
  
  .header-info {
    width: 100%;
    justify-content: space-between;
  }
  
  .time-display {
    display: none;
  }
  
  .quick-stats {
    grid-template-columns: 1fr;
  }
  
  .favorites-container.grid .functions-grid {
    grid-template-columns: 1fr;
  }
}