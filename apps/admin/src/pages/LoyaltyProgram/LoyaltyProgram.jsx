/**
 * EATECH - Loyalty Program Management
 * Version: 5.1.0
 * Description: Comprehensive Loyalty Program mit gamification und Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/pages/LoyaltyProgram/LoyaltyProgram.jsx
 * 
 * Features: Tier management, rewards catalog, gamification, analytics
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, update, remove } from 'firebase/database';
import { 
  Star, Gift, Trophy, Crown,
  TrendingUp, Users, Target, Zap,
  Plus, Edit2, Trash2, Eye,
  Download, Upload, Settings, Award,
  BarChart3, PieChart, Calendar, Clock,
  Search, Filter, RefreshCw, Share2
} from 'lucide-react';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import styles from './LoyaltyProgram.module.css';

// Lazy loaded components
const TierManager = lazy(() => import('./components/TierManager'));
const RewardsEditor = lazy(() => import('./components/RewardsEditor'));
const MembersList = lazy(() => import('./components/MembersList'));
const CampaignBuilder = lazy(() => import('./components/CampaignBuilder'));
const GamificationPanel = lazy(() => import('./components/GamificationPanel'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const RewardsCatalog = lazy(() => import('./components/RewardsCatalog'));
const PointsCalculator = lazy(() => import('./components/PointsCalculator'));

// Lazy loaded services
const LoyaltyService = lazy(() => import('../../services/LoyaltyService'));
const RewardsService = lazy(() => import('../../services/RewardsService'));
const CampaignService = lazy(() => import('../../services/CampaignService'));
const AnalyticsService = lazy(() => import('../../services/AnalyticsService'));

const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
  </div>
);

const LOYALTY_TIERS = {
  bronze: {
    id: 'bronze',
    name: 'Bronze',
    minPoints: 0,
    color: '#CD7F32',
    bgColor: '#FED7AA',
    icon: Star,
    benefits: {
      pointMultiplier: 1,
      birthdayBonus: 50,
      freeDelivery: false,
      exclusiveOffers: false
    }
  },
  silver: {
    id: 'silver',
    name: 'Silber',
    minPoints: 500,
    color: '#C0C0C0',
    bgColor: '#F1F5F9',
    icon: Award,
    benefits: {
      pointMultiplier: 1.2,
      birthdayBonus: 100,
      freeDelivery: true,
      exclusiveOffers: false
    }
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    minPoints: 1500,
    color: '#FFD700',
    bgColor: '#FEF3C7',
    icon: Trophy,
    benefits: {
      pointMultiplier: 1.5,
      birthdayBonus: 200,
      freeDelivery: true,
      exclusiveOffers: true
    }
  },
  platinum: {
    id: 'platinum',
    name: 'Platin',
    minPoints: 5000,
    color: '#E5E4E2',
    bgColor: '#F8FAFC',
    icon: Crown,
    benefits: {
      pointMultiplier: 2,
      birthdayBonus: 500,
      freeDelivery: true,
      exclusiveOffers: true
    }
  }
};

const REWARD_CATEGORIES = {
  food: { name: 'Essen', icon: Gift, color: '#10B981' },
  discount: { name: 'Rabatte', icon: Target, color: '#3B82F6' },
  exclusive: { name: 'Exklusiv', icon: Crown, color: '#8B5CF6' },
  experience: { name: 'Erlebnisse', icon: Star, color: '#F59E0B' }
};

const POINT_RULES = [
  { action: 'order', points: 10, description: '10 Punkte pro 10 CHF Bestellung' },
  { action: 'review', points: 50, description: '50 Punkte für Bewertungen' },
  { action: 'referral', points: 200, description: '200 Punkte für Empfehlungen' },
  { action: 'birthday', points: 'tier', description: 'Geburtstags-Bonus je nach Tier' },
  { action: 'social_share', points: 25, description: '25 Punkte für Social Media Shares' }
];

const LoyaltyProgram = () => {
  const [members, setMembers] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedReward, setSelectedReward] = useState(null);
  const [showTierManager, setShowTierManager] = useState(false);
  const [showRewardsEditor, setShowRewardsEditor] = useState(false);
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [showGamification, setShowGamification] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const tenantId = 'demo-restaurant';

  // ============================================================================
  // FIREBASE DATA LOADING
  // ============================================================================
  useEffect(() => {
    const loadLoyaltyData = async () => {
      setLoading(true);
      try {
        // Load loyalty members
        const membersRef = ref(database, `tenants/${tenantId}/loyaltyMembers`);
        onValue(membersRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const membersArray = Object.entries(data).map(([id, member]) => ({
              id,
              ...member,
              tier: calculateTier(member.points || 0)
            }));
            setMembers(membersArray);
          } else {
            setMembers([]);
          }
        });

        // Load rewards
        const rewardsRef = ref(database, `tenants/${tenantId}/loyaltyRewards`);
        onValue(rewardsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const rewardsArray = Object.entries(data).map(([id, reward]) => ({
              id,
              ...reward
            }));
            setRewards(rewardsArray);
          } else {
            setRewards([]);
          }
        });

        // Load campaigns
        const campaignsRef = ref(database, `tenants/${tenantId}/loyaltyCampaigns`);
        onValue(campaignsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const campaignsArray = Object.entries(data).map(([id, campaign]) => ({
              id,
              ...campaign
            }));
            setCampaigns(campaignsArray);
          } else {
            setCampaigns([]);
          }
        });

        // Calculate statistics
        calculateStatistics();

      } catch (error) {
        console.error('Error loading loyalty data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLoyaltyData();
  }, [tenantId]);

  // ============================================================================
  // STATISTICS CALCULATION
  // ============================================================================
  const calculateStatistics = useCallback(() => {
    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.lastActivity && 
      new Date(m.lastActivity) > subDays(new Date(), 30)
    ).length;
    
    const tierDistribution = Object.keys(LOYALTY_TIERS).reduce((acc, tier) => {
      acc[tier] = members.filter(m => m.tier === tier).length;
      return acc;
    }, {});

    const totalPointsIssued = members.reduce((sum, m) => sum + (m.totalPointsEarned || 0), 0);
    const totalPointsRedeemed = members.reduce((sum, m) => sum + (m.totalPointsRedeemed || 0), 0);
    
    const popularRewards = rewards
      .map(reward => ({
        ...reward,
        redeemed: members.reduce((sum, m) => 
          sum + (m.redemptions?.filter(r => r.rewardId === reward.id).length || 0), 0
        )
      }))
      .sort((a, b) => b.redeemed - a.redeemed)
      .slice(0, 5);

    const avgPointsPerMember = totalMembers > 0 ? totalPointsIssued / totalMembers : 0;
    const redemptionRate = totalPointsIssued > 0 ? (totalPointsRedeemed / totalPointsIssued) * 100 : 0;

    setStatistics({
      totalMembers,
      activeMembers,
      tierDistribution,
      totalPointsIssued,
      totalPointsRedeemed,
      popularRewards,
      avgPointsPerMember,
      redemptionRate
    });
  }, [members, rewards]);

  useEffect(() => {
    if (members.length > 0) {
      calculateStatistics();
    }
  }, [members, rewards, calculateStatistics]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  const calculateTier = useCallback((points) => {
    const tierEntries = Object.entries(LOYALTY_TIERS).sort((a, b) => b[1].minPoints - a[1].minPoints);
    
    for (const [tierId, tier] of tierEntries) {
      if (points >= tier.minPoints) {
        return tierId;
      }
    }
    
    return 'bronze';
  }, []);

  const getTierInfo = useCallback((tierId) => {
    return LOYALTY_TIERS[tierId] || LOYALTY_TIERS.bronze;
  }, []);

  // ============================================================================
  // FILTERED DATA
  // ============================================================================
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           member.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTier = filterTier === 'all' || member.tier === filterTier;
      
      return matchesSearch && matchesTier;
    });
  }, [members, searchTerm, filterTier]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleCreateReward = useCallback(async (rewardData) => {
    try {
      const rewardsRef = ref(database, `tenants/${tenantId}/loyaltyRewards`);
      await push(rewardsRef, {
        ...rewardData,
        createdAt: new Date().toISOString(),
        isActive: true
      });
      setShowRewardsEditor(false);
    } catch (error) {
      console.error('Error creating reward:', error);
    }
  }, [tenantId]);

  const handleUpdateReward = useCallback(async (rewardId, rewardData) => {
    try {
      const rewardRef = ref(database, `tenants/${tenantId}/loyaltyRewards/${rewardId}`);
      await update(rewardRef, {
        ...rewardData,
        updatedAt: new Date().toISOString()
      });
      setSelectedReward(null);
      setShowRewardsEditor(false);
    } catch (error) {
      console.error('Error updating reward:', error);
    }
  }, [tenantId]);

  const handleDeleteReward = useCallback(async (rewardId) => {
    if (window.confirm('Belohnung wirklich löschen?')) {
      try {
        const rewardRef = ref(database, `tenants/${tenantId}/loyaltyRewards/${rewardId}`);
        await remove(rewardRef);
      } catch (error) {
        console.error('Error deleting reward:', error);
      }
    }
  }, [tenantId]);

  const handleCreateCampaign = useCallback(async (campaignData) => {
    try {
      const campaignsRef = ref(database, `tenants/${tenantId}/loyaltyCampaigns`);
      await push(campaignsRef, {
        ...campaignData,
        createdAt: new Date().toISOString(),
        status: 'active'
      });
      setShowCampaignBuilder(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  }, [tenantId]);

  const handleAwardPoints = useCallback(async (memberId, points, reason) => {
    try {
      const memberRef = ref(database, `tenants/${tenantId}/loyaltyMembers/${memberId}`);
      const member = members.find(m => m.id === memberId);
      
      if (member) {
        const newPoints = (member.points || 0) + points;
        const newTier = calculateTier(newPoints);
        
        await update(memberRef, {
          points: newPoints,
          tier: newTier,
          totalPointsEarned: (member.totalPointsEarned || 0) + points,
          lastActivity: new Date().toISOString(),
          pointsHistory: [
            ...(member.pointsHistory || []),
            {
              points,
              reason,
              timestamp: new Date().toISOString(),
              type: 'earned'
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  }, [tenantId, members, calculateTier]);

  const handleRedeemReward = useCallback(async (memberId, rewardId) => {
    try {
      const member = members.find(m => m.id === memberId);
      const reward = rewards.find(r => r.id === rewardId);
      
      if (member && reward && member.points >= reward.pointsCost) {
        const memberRef = ref(database, `tenants/${tenantId}/loyaltyMembers/${memberId}`);
        const newPoints = member.points - reward.pointsCost;
        
        await update(memberRef, {
          points: newPoints,
          totalPointsRedeemed: (member.totalPointsRedeemed || 0) + reward.pointsCost,
          lastActivity: new Date().toISOString(),
          redemptions: [
            ...(member.redemptions || []),
            {
              rewardId,
              rewardName: reward.name,
              pointsCost: reward.pointsCost,
              timestamp: new Date().toISOString()
            }
          ],
          pointsHistory: [
            ...(member.pointsHistory || []),
            {
              points: -reward.pointsCost,
              reason: `Eingelöst: ${reward.name}`,
              timestamp: new Date().toISOString(),
              type: 'redeemed'
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
    }
  }, [tenantId, members, rewards]);

  const handleExportMembers = useCallback(() => {
    const csvData = filteredMembers.map(member => ({
      Name: member.name,
      Email: member.email,
      Punkte: member.points || 0,
      Tier: LOYALTY_TIERS[member.tier]?.name || member.tier,
      'Letzte Aktivität': member.lastActivity ? format(parseISO(member.lastActivity), 'dd.MM.yyyy') : '-',
      'Verdiente Punkte': member.totalPointsEarned || 0,
      'Eingelöste Punkte': member.totalPointsRedeemed || 0
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loyalty-members-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredMembers]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderStatsCards = () => {
    return (
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{statistics.totalMembers || 0}</h3>
            <p>Mitglieder</p>
            <span className={styles.statDetail}>
              {statistics.activeMembers || 0} aktiv
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Star size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{(statistics.totalPointsIssued || 0).toLocaleString()}</h3>
            <p>Punkte vergeben</p>
            <span className={styles.statDetail}>
              Ø {Math.round(statistics.avgPointsPerMember || 0)} pro Mitglied
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Gift size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{(statistics.totalPointsRedeemed || 0).toLocaleString()}</h3>
            <p>Punkte eingelöst</p>
            <span className={styles.statDetail}>
              {(statistics.redemptionRate || 0).toFixed(1)}% Rate
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Trophy size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{rewards.length}</h3>
            <p>Aktive Belohnungen</p>
            <span className={styles.statDetail}>
              {campaigns.length} Kampagnen
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderTierDistribution = () => {
    return (
      <div className={styles.section}>
        <h2>Tier-Verteilung</h2>
        <div className={styles.tierCards}>
          {Object.entries(LOYALTY_TIERS).map(([tierId, tier]) => {
            const count = statistics.tierDistribution?.[tierId] || 0;
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
    );
  };

  const renderPopularRewards = () => {
    return (
      <div className={styles.section}>
        <h2>Beliebteste Belohnungen</h2>
        <div className={styles.popularRewards}>
          {statistics.popularRewards?.map((reward, index) => (
            <div key={reward.id} className={styles.popularReward}>
              <div className={styles.popularRank}>{index + 1}</div>
              <div className={styles.popularIcon} style={{ backgroundColor: REWARD_CATEGORIES[reward.category]?.color + '20' }}>
                {React.createElement(REWARD_CATEGORIES[reward.category]?.icon || Gift, { 
                  size: 20, 
                  color: REWARD_CATEGORIES[reward.category]?.color 
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
          )) || []}
        </div>
      </div>
    );
  };

  const renderPointRules = () => {
    return (
      <div className={styles.section}>
        <h2>Punkte-Regeln</h2>
        <div className={styles.pointRules}>
          {POINT_RULES.map(rule => (
            <div key={rule.action} className={styles.pointRule}>
              <div className={styles.ruleIcon}>
                <Zap size={16} />
              </div>
              <div className={styles.ruleContent}>
                <div className={styles.rulePoints}>
                  {rule.points === 'tier' ? 'Tier-abhängig' : `${rule.points} Punkte`}
                </div>
                <div className={styles.ruleDescription}>{rule.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderViewTabs = () => (
    <div className={styles.viewTabs}>
      {[
        { id: 'overview', name: 'Übersicht', icon: BarChart3 },
        { id: 'members', name: 'Mitglieder', icon: Users },
        { id: 'rewards', name: 'Belohnungen', icon: Gift },
        { id: 'campaigns', name: 'Kampagnen', icon: Target },
        { id: 'analytics', name: 'Analytics', icon: TrendingUp }
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveView(tab.id)}
          className={`${styles.viewTab} ${activeView === tab.id ? styles.active : ''}`}
        >
          {React.createElement(tab.icon, { size: 16 })}
          <span>{tab.name}</span>
        </button>
      ))}
    </div>
  );

  const renderControls = () => (
    <div className={styles.controls}>
      <div className={styles.searchAndFilter}>
        <div className={styles.searchBox}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Mitglieder suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className={styles.tierFilter}
        >
          <option value="all">Alle Tiers</option>
          {Object.entries(LOYALTY_TIERS).map(([id, tier]) => (
            <option key={id} value={id}>{tier.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.actionButtons}>
        <button
          onClick={() => setShowTierManager(true)}
          className={styles.secondaryButton}
        >
          <Crown size={16} />
          Tiers verwalten
        </button>
        
        <button
          onClick={() => setShowRewardsEditor(true)}
          className={styles.secondaryButton}
        >
          <Gift size={16} />
          Neue Belohnung
        </button>
        
        <button
          onClick={() => setShowCampaignBuilder(true)}
          className={styles.secondaryButton}
        >
          <Target size={16} />
          Neue Kampagne
        </button>
        
        <button
          onClick={handleExportMembers}
          className={styles.secondaryButton}
        >
          <Download size={16} />
          Export
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.loyaltyProgram}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Loyalty Program</h1>
          <p>Verwalten Sie Ihr Kundenbindungsprogramm</p>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowGamification(true)}
            className={styles.secondaryButton}
          >
            <Trophy size={20} />
            Gamification
          </button>
          <button
            onClick={() => setShowAnalytics(true)}
            className={styles.primaryButton}
          >
            <BarChart3 size={20} />
            Analytics
          </button>
        </div>
      </div>

      {/* Stats */}
      {renderStatsCards()}

      {/* View Tabs */}
      {renderViewTabs()}

      {/* Controls */}
      {activeView === 'members' && renderControls()}

      {/* Content */}
      <div className={styles.content}>
        {activeView === 'overview' && (
          <div className={styles.overviewContent}>
            {renderTierDistribution()}
            {renderPopularRewards()}
            {renderPointRules()}
          </div>
        )}

        {activeView === 'members' && (
          <Suspense fallback={<LoadingSpinner />}>
            <MembersList
              members={filteredMembers}
              onAwardPoints={handleAwardPoints}
              onMemberSelect={setSelectedMember}
              tiers={LOYALTY_TIERS}
            />
          </Suspense>
        )}

        {activeView === 'rewards' && (
          <Suspense fallback={<LoadingSpinner />}>
            <RewardsCatalog
              rewards={rewards}
              categories={REWARD_CATEGORIES}
              onEdit={(reward) => {
                setSelectedReward(reward);
                setShowRewardsEditor(true);
              }}
              onDelete={handleDeleteReward}
              onRedeem={handleRedeemReward}
            />
          </Suspense>
        )}
      </div>

      {/* Lazy Loaded Modals */}
      {showTierManager && (
        <Suspense fallback={<LoadingSpinner />}>
          <TierManager
            tiers={LOYALTY_TIERS}
            members={members}
            onClose={() => setShowTierManager(false)}
          />
        </Suspense>
      )}

      {showRewardsEditor && (
        <Suspense fallback={<LoadingSpinner />}>
          <RewardsEditor
            reward={selectedReward}
            categories={REWARD_CATEGORIES}
            onSave={selectedReward ? handleUpdateReward : handleCreateReward}
            onClose={() => {
              setShowRewardsEditor(false);
              setSelectedReward(null);
            }}
          />
        </Suspense>
      )}

      {showCampaignBuilder && (
        <Suspense fallback={<LoadingSpinner />}>
          <CampaignBuilder
            rewards={rewards}
            tiers={LOYALTY_TIERS}
            onSave={handleCreateCampaign}
            onClose={() => setShowCampaignBuilder(false)}
          />
        </Suspense>
      )}

      {showGamification && (
        <Suspense fallback={<LoadingSpinner />}>
          <GamificationPanel
            members={members}
            statistics={statistics}
            onClose={() => setShowGamification(false)}
          />
        </Suspense>
      )}

      {showAnalytics && (
        <Suspense fallback={<LoadingSpinner />}>
          <AnalyticsDashboard
            members={members}
            rewards={rewards}
            campaigns={campaigns}
            statistics={statistics}
            onClose={() => setShowAnalytics(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default LoyaltyProgram;