/**
 * EATECH - Loyalty Program Management
 * Version: 20.0.0
 * Description: Umfassendes Treueprogramm-System mit Punkteverwaltung und Belohnungen
 * Features: Punkte-Management, Belohnungen, Stufen, Kampagnen, Analytics
 * File Path: /src/pages/LoyaltyProgram/LoyaltyProgram.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Award, Gift, Star, TrendingUp, Users, 
  DollarSign, Target, Calendar, Settings,
  Plus, Edit2, Trash2, Search, Filter,
  Download, Upload, RefreshCw, Info,
  CheckCircle, XCircle, Clock, AlertCircle,
  Zap, Heart, Coffee, Pizza, Percent,
  Trophy, Medal, Crown, Gem, ChevronRight,
  BarChart3, PieChart, Activity, CreditCard
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import styles from './LoyaltyProgram.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const LOYALTY_TIERS = [
  {
    id: 'BRONZE',
    name: 'Bronze',
    icon: Medal,
    color: '#CD7F32',
    bgColor: 'rgba(205, 127, 50, 0.1)',
    minPoints: 0,
    benefits: {
      pointMultiplier: 1,
      birthdayBonus: 50,
      welcomeBonus: 25,
      extraPerks: []
    }
  },
  {
    id: 'SILVER',
    name: 'Silber',
    icon: Medal,
    color: '#C0C0C0',
    bgColor: 'rgba(192, 192, 192, 0.1)',
    minPoints: 500,
    benefits: {
      pointMultiplier: 1.25,
      birthdayBonus: 100,
      welcomeBonus: 50,
      extraPerks: ['Gratis Getränk-Upgrade', 'Early Access zu neuen Produkten']
    }
  },
  {
    id: 'GOLD',
    name: 'Gold',
    icon: Crown,
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.1)',
    minPoints: 1500,
    benefits: {
      pointMultiplier: 1.5,
      birthdayBonus: 200,
      welcomeBonus: 100,
      extraPerks: ['Gratis Getränk-Upgrade', 'Early Access', 'Exklusive Angebote']
    }
  },
  {
    id: 'PLATINUM',
    name: 'Platin',
    icon: Gem,
    color: '#E5E4E2',
    bgColor: 'rgba(229, 228, 226, 0.1)',
    minPoints: 3000,
    benefits: {
      pointMultiplier: 2,
      birthdayBonus: 500,
      welcomeBonus: 200,
      extraPerks: ['VIP Support', 'Persönlicher Account Manager', 'Exklusive Events']
    }
  }
];

const REWARD_CATEGORIES = {
  DISCOUNT: { label: 'Rabatte', icon: Percent, color: '#4CAF50' },
  FREEITEM: { label: 'Gratis Artikel', icon: Gift, color: '#2196F3' },
  UPGRADE: { label: 'Upgrades', icon: Zap, color: '#9C27B0' },
  SPECIAL: { label: 'Specials', icon: Star, color: '#FF9800' }
};

const POINT_RULES = [
  { id: 'purchase', name: 'Einkauf', points: 1, per: 1, unit: 'CHF', active: true },
  { id: 'review', name: 'Bewertung', points: 50, per: 1, unit: 'Bewertung', active: true },
  { id: 'referral', name: 'Empfehlung', points: 200, per: 1, unit: 'Neukunde', active: true },
  { id: 'social', name: 'Social Media', points: 25, per: 1, unit: 'Share', active: true },
  { id: 'app', name: 'App Download', points: 100, per: 1, unit: 'Download', active: true }
];

// Mock Data
const generateMockRewards = () => [
  {
    id: 'RW001',
    name: '10% Rabatt',
    category: 'DISCOUNT',
    pointsCost: 100,
    value: 10,
    type: 'percentage',
    description: '10% Rabatt auf die gesamte Bestellung',
    validityDays: 30,
    stock: -1, // unlimited
    redeemed: 1234,
    active: true,
    tierRestriction: null
  },
  {
    id: 'RW002',
    name: 'Gratis Kaffee',
    category: 'FREEITEM',
    pointsCost: 150,
    value: 5.50,
    type: 'item',
    description: 'Ein gratis Kaffee nach Wahl',
    validityDays: 14,
    stock: 500,
    redeemed: 342,
    active: true,
    tierRestriction: null
  },
  {
    id: 'RW003',
    name: '5 CHF Gutschein',
    category: 'DISCOUNT',
    pointsCost: 200,
    value: 5,
    type: 'fixed',
    description: '5 CHF Rabatt auf die nächste Bestellung',
    validityDays: 30,
    stock: -1,
    redeemed: 892,
    active: true,
    tierRestriction: null
  },
  {
    id: 'RW004',
    name: 'Gratis Pizza',
    category: 'FREEITEM',
    pointsCost: 500,
    value: 18,
    type: 'item',
    description: 'Eine gratis Pizza nach Wahl (bis 18 CHF)',
    validityDays: 21,
    stock: 100,
    redeemed: 67,
    active: true,
    tierRestriction: 'SILVER'
  },
  {
    id: 'RW005',
    name: 'VIP Event Ticket',
    category: 'SPECIAL',
    pointsCost: 1000,
    value: 50,
    type: 'experience',
    description: 'Exklusives Foodtruck Event mit Verkostung',
    validityDays: 90,
    stock: 20,
    redeemed: 12,
    active: true,
    tierRestriction: 'GOLD'
  }
];

const generateMockMembers = (count = 100) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `MEM${String(i + 1).padStart(6, '0')}`,
    name: `Kunde ${i + 1}`,
    email: `kunde${i + 1}@example.com`,
    points: Math.floor(Math.random() * 5000),
    lifetimePoints: Math.floor(Math.random() * 10000),
    tier: LOYALTY_TIERS[Math.floor(Math.random() * LOYALTY_TIERS.length)].id,
    joinedDate: new Date(2023 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
    lastActivity: new Date(2025, 0, Math.floor(Math.random() * 7) + 1),
    rewardsRedeemed: Math.floor(Math.random() * 20),
    totalSpent: Math.floor(Math.random() * 5000)
  }));
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const LoyaltyProgram = () => {
  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [rewards, setRewards] = useState([]);
  const [members, setMembers] = useState([]);
  const [pointRules, setPointRules] = useState(POINT_RULES);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('ALL');
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [showEditRewardModal, setShowEditRewardModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Load Data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      setRewards(generateMockRewards());
      setMembers(generateMockMembers());
    } catch (error) {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  // Statistics
  const statistics = useMemo(() => {
    const stats = {
      totalMembers: members.length,
      activeMembers: members.filter(m => {
        const daysSinceActivity = (new Date() - new Date(m.lastActivity)) / (1000 * 60 * 60 * 24);
        return daysSinceActivity < 30;
      }).length,
      totalPointsIssued: members.reduce((sum, m) => sum + m.lifetimePoints, 0),
      totalPointsRedeemed: rewards.reduce((sum, r) => sum + (r.redeemed * r.pointsCost), 0),
      averagePointsPerMember: 0,
      tierDistribution: {},
      popularRewards: rewards.sort((a, b) => b.redeemed - a.redeemed).slice(0, 5),
      conversionRate: 0
    };

    stats.averagePointsPerMember = stats.totalMembers > 0 
      ? Math.round(stats.totalPointsIssued / stats.totalMembers)
      : 0;

    // Calculate tier distribution
    LOYALTY_TIERS.forEach(tier => {
      stats.tierDistribution[tier.id] = members.filter(m => m.tier === tier.id).length;
    });

    // Calculate conversion rate
    const membersWhoRedeemed = members.filter(m => m.rewardsRedeemed > 0).length;
    stats.conversionRate = stats.totalMembers > 0 
      ? ((membersWhoRedeemed / stats.totalMembers) * 100).toFixed(1)
      : 0;

    return stats;
  }, [members, rewards]);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    let filtered = [...members];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.id.toLowerCase().includes(term)
      );
    }

    if (filterTier !== 'ALL') {
      filtered = filtered.filter(member => member.tier === filterTier);
    }

    return filtered.sort((a, b) => b.points - a.points);
  }, [members, searchTerm, filterTier]);

  // Handlers
  const handleAddReward = async (rewardData) => {
    try {
      const newReward = {
        ...rewardData,
        id: `RW${String(rewards.length + 1).padStart(3, '0')}`,
        redeemed: 0,
        active: true
      };
      setRewards([...rewards, newReward]);
      toast.success('Belohnung erfolgreich hinzugefügt');
      setShowAddRewardModal(false);
    } catch (error) {
      toast.error('Fehler beim Hinzufügen der Belohnung');
    }
  };

  const handleEditReward = async (rewardData) => {
    try {
      setRewards(rewards.map(r => 
        r.id === selectedReward.id ? { ...r, ...rewardData } : r
      ));
      toast.success('Belohnung erfolgreich aktualisiert');
      setShowEditRewardModal(false);
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Belohnung');
    }
  };

  const handleDeleteReward = async (rewardId) => {
    if (window.confirm('Möchten Sie diese Belohnung wirklich löschen?')) {
      try {
        setRewards(rewards.filter(r => r.id !== rewardId));
        toast.success('Belohnung erfolgreich gelöscht');
      } catch (error) {
        toast.error('Fehler beim Löschen der Belohnung');
      }
    }
  };

  const handleToggleReward = async (rewardId) => {
    try {
      setRewards(rewards.map(r => 
        r.id === rewardId ? { ...r, active: !r.active } : r
      ));
      toast.success('Status erfolgreich geändert');
    } catch (error) {
      toast.error('Fehler beim Statuswechsel');
    }
  };

  const handleUpdatePointRule = (ruleId, updates) => {
    setPointRules(pointRules.map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
    toast.success('Punkteregel aktualisiert');
  };

  const handleAwardPoints = async (memberId, points, reason) => {
    try {
      setMembers(members.map(m =>
        m.id === memberId 
          ? { 
              ...m, 
              points: m.points + points,
              lifetimePoints: m.lifetimePoints + points,
              lastActivity: new Date()
            }
          : m
      ));
      toast.success(`${points} Punkte erfolgreich vergeben`);
    } catch (error) {
      toast.error('Fehler beim Vergeben der Punkte');
    }
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderOverview = () => (
    <div className={styles.overview}>
      {/* Statistics Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users />
          </div>
          <div className={styles.statContent}>
            <h3>{statistics.totalMembers}</h3>
            <p>Mitglieder</p>
            <span className={styles.statChange}>
              <TrendingUp size={14} /> +12% diesen Monat
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Activity />
          </div>
          <div className={styles.statContent}>
            <h3>{statistics.activeMembers}</h3>
            <p>Aktive Mitglieder</p>
            <span className={styles.statSubtext}>Letzte 30 Tage</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Star />
          </div>
          <div className={styles.statContent}>
            <h3>{statistics.totalPointsIssued.toLocaleString()}</h3>
            <p>Punkte vergeben</p>
            <span className={styles.statSubtext}>Ø {statistics.averagePointsPerMember} pro Mitglied</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Gift />
          </div>
          <div className={styles.statContent}>
            <h3>{statistics.conversionRate}%</h3>
            <p>Einlösungsrate</p>
            <span className={styles.statSubtext}>Mitglieder mit Einlösungen</span>
          </div>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className={styles.section}>
        <h2>Mitglieder-Verteilung</h2>
        <div className={styles.tierDistribution}>
          {LOYALTY_TIERS.map(tier => {
            const count = statistics.tierDistribution[tier.id] || 0;
            const percentage = statistics.totalMembers > 0 
              ? ((count / statistics.totalMembers) * 100).toFixed(1)
              : 0;
            
            return (
              <div key={tier.id} className={styles.tierCard} style={{ borderColor: tier.color }}>
                <div className={styles.tierHeader}>
                  <div className={styles.tierIcon} style={{ backgroundColor: tier.bgColor, color: tier.color }}>
                    {React.createElement(tier.icon, { size: 24 })}
                  </div>
                  <div>
                    <h3>{tier.name}</h3>
                    <p>ab {tier.minPoints} Punkte</p>
                  </div>
                </div>
                <div className={styles.tierStats}>
                  <div className={styles.tierCount}>{count}</div>
                  <div className={styles.tierPercentage}>{percentage}%</div>
                </div>
                <div className={styles.tierBenefits}>
                  <p>{tier.benefits.pointMultiplier}x Punkte</p>
                  <p>{tier.benefits.birthdayBonus} Geburtstagspunkte</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popular Rewards */}
      <div className={styles.section}>
        <h2>Beliebteste Belohnungen</h2>
        <div className={styles.popularRewards}>
          {statistics.popularRewards.map((reward, index) => (
            <div key={reward.id} className={styles.popularReward}>
              <div className={styles.popularRank}>{index + 1}</div>
              <div className={styles.popularIcon} style={{ backgroundColor: REWARD_CATEGORIES[reward.category].color + '20' }}>
                {React.createElement(REWARD_CATEGORIES[reward.category].icon, { 
                  size: 20, 
                  color: REWARD_CATEGORIES[reward.category].color 
                })}
              </div>
              <div className={styles.popularInfo}>
                <h4>{reward.name}</h4>
                <p>{reward.pointsCost} Punkte</p>
              </div>
              <div className={styles.popularStats}>
                <span>{reward.redeemed}x eingelöst</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Point Rules */}
      <div className={styles.section}>
        <h2>Punkte-Regeln</h2>
        <div className={styles.pointRules}>
          {pointRules.map(rule => (
            <div key={rule.id} className={styles.pointRule}>
              <div className={styles.ruleInfo}>
                <h4>{rule.name}</h4>
                <p>{rule.points} Punkte pro {rule.per} {rule.unit}</p>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={rule.active}
                  onChange={(e) => handleUpdatePointRule(rule.id, { active: e.target.checked })}
                />
                <span className={styles.toggleSlider} />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRewards = () => (
    <div className={styles.rewards}>
      <div className={styles.rewardsHeader}>
        <h2>Belohnungen verwalten</h2>
        <button 
          className={styles.addButton}
          onClick={() => setShowAddRewardModal(true)}
        >
          <Plus size={16} /> Neue Belohnung
        </button>
      </div>

      <div className={styles.rewardsGrid}>
        {rewards.map(reward => (
          <div 
            key={reward.id} 
            className={`${styles.rewardCard} ${!reward.active ? styles.inactive : ''}`}
          >
            <div className={styles.rewardHeader}>
              <div 
                className={styles.rewardIcon}
                style={{ backgroundColor: REWARD_CATEGORIES[reward.category].color + '20' }}
              >
                {React.createElement(REWARD_CATEGORIES[reward.category].icon, {
                  size: 24,
                  color: REWARD_CATEGORIES[reward.category].color
                })}
              </div>
              <div className={styles.rewardActions}>
                <button
                  onClick={() => {
                    setSelectedReward(reward);
                    setShowEditRewardModal(true);
                  }}
                  title="Bearbeiten"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleToggleReward(reward.id)}
                  title={reward.active ? 'Deaktivieren' : 'Aktivieren'}
                >
                  {reward.active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                </button>
                <button
                  onClick={() => handleDeleteReward(reward.id)}
                  title="Löschen"
                  className={styles.danger}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className={styles.rewardBody}>
              <h3>{reward.name}</h3>
              <p className={styles.rewardDescription}>{reward.description}</p>
              
              <div className={styles.rewardDetails}>
                <div className={styles.rewardCost}>
                  <Star size={16} />
                  {reward.pointsCost} Punkte
                </div>
                <div className={styles.rewardValue}>
                  {reward.type === 'percentage' && `${reward.value}%`}
                  {reward.type === 'fixed' && `CHF ${reward.value}`}
                  {reward.type === 'item' && `CHF ${reward.value} Wert`}
                  {reward.type === 'experience' && 'Erlebnis'}
                </div>
              </div>

              <div className={styles.rewardStats}>
                <div>
                  <span className={styles.label}>Eingelöst:</span>
                  <span className={styles.value}>{reward.redeemed}x</span>
                </div>
                <div>
                  <span className={styles.label}>Gültigkeit:</span>
                  <span className={styles.value}>{reward.validityDays} Tage</span>
                </div>
                {reward.stock !== -1 && (
                  <div>
                    <span className={styles.label}>Lager:</span>
                    <span className={styles.value}>{reward.stock - reward.redeemed}</span>
                  </div>
                )}
              </div>

              {reward.tierRestriction && (
                <div className={styles.tierRestriction}>
                  <Info size={14} />
                  Nur für {LOYALTY_TIERS.find(t => t.id === reward.tierRestriction)?.name}+
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMembers = () => (
    <div className={styles.members}>
      <div className={styles.membersHeader}>
        <h2>Mitglieder</h2>
        <div className={styles.memberControls}>
          <div className={styles.searchBar}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Suche nach Name, E-Mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="ALL">Alle Stufen</option>
            {LOYALTY_TIERS.map(tier => (
              <option key={tier.id} value={tier.id}>{tier.name}</option>
            ))}
          </select>

          <button className={styles.exportButton}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className={styles.membersTable}>
        <table>
          <thead>
            <tr>
              <th>Mitglied</th>
              <th>Stufe</th>
              <th>Punkte</th>
              <th>Lifetime</th>
              <th>Einlösungen</th>
              <th>Umsatz</th>
              <th>Letzte Aktivität</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map(member => {
              const tier = LOYALTY_TIERS.find(t => t.id === member.tier);
              return (
                <tr key={member.id}>
                  <td>
                    <div className={styles.memberInfo}>
                      <div className={styles.memberAvatar}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className={styles.memberName}>{member.name}</div>
                        <div className={styles.memberEmail}>{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div 
                      className={styles.tierBadge}
                      style={{ backgroundColor: tier.bgColor, color: tier.color }}
                    >
                      {React.createElement(tier.icon, { size: 14 })}
                      {tier.name}
                    </div>
                  </td>
                  <td className={styles.points}>{member.points.toLocaleString()}</td>
                  <td className={styles.lifetime}>{member.lifetimePoints.toLocaleString()}</td>
                  <td>{member.rewardsRedeemed}</td>
                  <td>CHF {member.totalSpent.toFixed(2)}</td>
                  <td>{new Date(member.lastActivity).toLocaleDateString('de-CH')}</td>
                  <td>
                    <div className={styles.memberActions}>
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setShowMemberModal(true);
                        }}
                        title="Details anzeigen"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCampaigns = () => (
    <div className={styles.campaigns}>
      <div className={styles.campaignsHeader}>
        <h2>Kampagnen & Aktionen</h2>
        <button className={styles.addButton}>
          <Plus size={16} /> Neue Kampagne
        </button>
      </div>

      <div className={styles.campaignsList}>
        <div className={styles.campaign}>
          <div className={styles.campaignIcon}>
            <Gift />
          </div>
          <div className={styles.campaignInfo}>
            <h3>Doppelte Punkte Wochenende</h3>
            <p>Alle Einkäufe erhalten 2x Punkte</p>
            <div className={styles.campaignMeta}>
              <span><Calendar size={14} /> 10.01. - 12.01.2025</span>
              <span><Users size={14} /> Alle Mitglieder</span>
            </div>
          </div>
          <div className={styles.campaignStatus}>
            <span className={styles.active}>Aktiv</span>
          </div>
        </div>

        <div className={styles.campaign}>
          <div className={styles.campaignIcon}>
            <Trophy />
          </div>
          <div className={styles.campaignInfo}>
            <h3>Gold Status Challenge</h3>
            <p>500 Bonuspunkte beim Erreichen von Gold</p>
            <div className={styles.campaignMeta}>
              <span><Calendar size={14} /> 01.01. - 31.01.2025</span>
              <span><Users size={14} /> Silber Mitglieder</span>
            </div>
          </div>
          <div className={styles.campaignStatus}>
            <span className={styles.scheduled}>Geplant</span>
          </div>
        </div>

        <div className={styles.campaign}>
          <div className={styles.campaignIcon}>
            <Heart />
          </div>
          <div className={styles.campaignInfo}>
            <h3>Valentinstag Special</h3>
            <p>14% Rabatt Belohnung für nur 140 Punkte</p>
            <div className={styles.campaignMeta}>
              <span><Calendar size={14} /> 14.02.2025</span>
              <span><Users size={14} /> Alle Mitglieder</span>
            </div>
          </div>
          <div className={styles.campaignStatus}>
            <span className={styles.draft}>Entwurf</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className={styles.settings}>
      <h2>Programm-Einstellungen</h2>
      
      <div className={styles.settingsSection}>
        <h3>Allgemeine Einstellungen</h3>
        <div className={styles.settingsGrid}>
          <div className={styles.settingItem}>
            <label>Programmname</label>
            <input type="text" defaultValue="EATECH Rewards" />
          </div>
          <div className={styles.settingItem}>
            <label>Punkte-Währung</label>
            <input type="text" defaultValue="Punkte" />
          </div>
          <div className={styles.settingItem}>
            <label>Punkte-Verfallszeit</label>
            <select>
              <option>Nie</option>
              <option>Nach 6 Monaten</option>
              <option>Nach 12 Monaten</option>
              <option>Nach 24 Monaten</option>
            </select>
          </div>
          <div className={styles.settingItem}>
            <label>Minimum Einlösung</label>
            <input type="number" defaultValue="100" />
          </div>
        </div>
      </div>

      <div className={styles.settingsSection}>
        <h3>Benachrichtigungen</h3>
        <div className={styles.notificationSettings}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" defaultChecked />
            <span>Willkommens-E-Mail für neue Mitglieder</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" defaultChecked />
            <span>Punkte-Update Benachrichtigungen</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" defaultChecked />
            <span>Stufen-Upgrade Benachrichtigungen</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" defaultChecked />
            <span>Geburtstags-Benachrichtigungen</span>
          </label>
        </div>
      </div>

      <div className={styles.settingsActions}>
        <button className={styles.saveButton}>
          <CheckCircle size={16} /> Einstellungen speichern
        </button>
      </div>
    </div>
  );

  // Member Modal
  const renderMemberModal = () => {
    if (!selectedMember) return null;
    
    const tier = LOYALTY_TIERS.find(t => t.id === selectedMember.tier);
    const nextTier = LOYALTY_TIERS.find(t => t.minPoints > selectedMember.lifetimePoints);

    return (
      <div className={styles.modal} onClick={() => setShowMemberModal(false)}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2>{selectedMember.name}</h2>
            <button onClick={() => setShowMemberModal(false)}>×</button>
          </div>
          
          <div className={styles.modalBody}>
            <div className={styles.memberDetail}>
              <div className={styles.memberStats}>
                <div className={styles.memberStatCard}>
                  <h4>Aktuelle Punkte</h4>
                  <div className={styles.pointsDisplay}>
                    <Star size={24} />
                    <span>{selectedMember.points.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className={styles.memberStatCard}>
                  <h4>Lifetime Punkte</h4>
                  <div className={styles.pointsDisplay}>
                    <Trophy size={24} />
                    <span>{selectedMember.lifetimePoints.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className={styles.memberStatCard}>
                  <h4>Aktuelle Stufe</h4>
                  <div 
                    className={styles.tierDisplay}
                    style={{ backgroundColor: tier.bgColor, color: tier.color }}
                  >
                    {React.createElement(tier.icon, { size: 20 })}
                    <span>{tier.name}</span>
                  </div>
                </div>
              </div>

              {nextTier && (
                <div className={styles.tierProgress}>
                  <p>Fortschritt zur nächsten Stufe ({nextTier.name})</p>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ 
                        width: `${((selectedMember.lifetimePoints - tier.minPoints) / (nextTier.minPoints - tier.minPoints)) * 100}%`,
                        backgroundColor: nextTier.color
                      }}
                    />
                  </div>
                  <p className={styles.progressText}>
                    Noch {nextTier.minPoints - selectedMember.lifetimePoints} Punkte bis {nextTier.name}
                  </p>
                </div>
              )}

              <div className={styles.memberActions}>
                <div className={styles.awardPoints}>
                  <h4>Punkte vergeben</h4>
                  <div className={styles.pointsForm}>
                    <input 
                      type="number" 
                      placeholder="Anzahl Punkte"
                      id="pointsAmount"
                    />
                    <input 
                      type="text" 
                      placeholder="Grund"
                      id="pointsReason"
                    />
                    <button 
                      className={styles.awardButton}
                      onClick={() => {
                        const amount = parseInt(document.getElementById('pointsAmount').value);
                        const reason = document.getElementById('pointsReason').value;
                        if (amount && reason) {
                          handleAwardPoints(selectedMember.id, amount, reason);
                          setShowMemberModal(false);
                        }
                      }}
                    >
                      <Plus size={16} /> Punkte vergeben
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (loading) {
    return (
      <div className={styles.loading}>
        <Award className={styles.spinner} />
        <p>Lade Treueprogramm-Daten...</p>
      </div>
    );
  }

  return (
    <div className={styles.loyaltyProgram}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Award size={32} />
          <h1>Treueprogramm</h1>
        </div>
        
        <div className={styles.headerActions}>
          <button className={styles.refreshButton} onClick={loadData}>
            <RefreshCw size={16} /> Aktualisieren
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        <button 
          className={activeTab === 'overview' ? styles.active : ''}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={16} /> Übersicht
        </button>
        <button 
          className={activeTab === 'rewards' ? styles.active : ''}
          onClick={() => setActiveTab('rewards')}
        >
          <Gift size={16} /> Belohnungen
        </button>
        <button 
          className={activeTab === 'members' ? styles.active : ''}
          onClick={() => setActiveTab('members')}
        >
          <Users size={16} /> Mitglieder
        </button>
        <button 
          className={activeTab === 'campaigns' ? styles.active : ''}
          onClick={() => setActiveTab('campaigns')}
        >
          <Target size={16} /> Kampagnen
        </button>
        <button 
          className={activeTab === 'settings' ? styles.active : ''}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} /> Einstellungen
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'rewards' && renderRewards()}
        {activeTab === 'members' && renderMembers()}
        {activeTab === 'campaigns' && renderCampaigns()}
        {activeTab === 'settings' && renderSettings()}
      </div>

      {showMemberModal && renderMemberModal()}
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default LoyaltyProgram;