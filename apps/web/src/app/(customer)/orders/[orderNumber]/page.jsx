/**
 * EATECH - Order Tracking Page
 * Version: 16.0.0
 * Description: Live-Tracking für Bestellungen mit Status-Updates
 * Author: EATECH Development Team
 * Created: 2025-07-05
 * File Path: /apps/web/src/app/(customer)/orders/[orderNumber]/page.jsx
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  Circle,
  MapPin,
  Phone,
  AlertCircle,
  Loader2,
  ChefHat,
  Truck,
  Home,
  Star,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import styles from './OrderTracking.module.css';

const OrderTrackingPage = () => {
  const params = useParams();
  const router = useRouter();
  const orderNumber = params.orderNumber;
  
  // Order State
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  
  // Status Steps
  const statusSteps = [
    { 
      id: 'confirmed', 
      label: 'Bestätigt', 
      icon: CheckCircle,
      time: '2 Min.'
    },
    { 
      id: 'preparing', 
      label: 'In Zubereitung', 
      icon: ChefHat,
      time: '15 Min.'
    },
    { 
      id: 'ready', 
      label: 'Bereit', 
      icon: Package,
      time: '25 Min.'
    },
    { 
      id: 'delivering', 
      label: 'Unterwegs', 
      icon: Truck,
      time: '35 Min.',
      onlyDelivery: true
    },
    { 
      id: 'delivered', 
      label: 'Geliefert', 
      icon: Home,
      time: '40 Min.'
    }
  ];
  
  // Mock order data - würde normalerweise von Firebase kommen
  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data
        const mockOrder = {
          orderNumber: orderNumber,
          status: 'preparing',
          deliveryType: 'delivery',
          placedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
          estimatedTime: 35,
          items: [
            { name: 'Cheese Burger', quantity: 2, price: 18.50 },
            { name: 'French Fries', quantity: 1, price: 8.50 },
            { name: 'Coca Cola', quantity: 2, price: 4.50 }
          ],
          subtotal: 54.00,
          deliveryFee: 5.00,
          total: 59.00,
          customer: {
            name: 'Max Muster',
            phone: '+41 79 123 45 67',
            address: 'Musterstrasse 123, 3000 Bern'
          },
          restaurant: {
            name: 'Burger Palace',
            phone: '+41 31 123 45 67',
            address: 'Marktgasse 5, 3011 Bern'
          },
          driver: {
            name: 'Peter Fahrer',
            phone: '+41 79 987 65 43',
            vehicle: 'Grüner E-Bike'
          }
        };
        
        setOrder(mockOrder);
        
        // Simuliere Status-Updates
        const statusSequence = ['confirmed', 'preparing', 'ready', 'delivering', 'delivered'];
        let currentIndex = statusSequence.indexOf(mockOrder.status);
        
        const interval = setInterval(() => {
          if (currentIndex < statusSequence.length - 1) {
            currentIndex++;
            setOrder(prev => ({ ...prev, status: statusSequence[currentIndex] }));
            
            // Zeige Rating nach Lieferung
            if (statusSequence[currentIndex] === 'delivered') {
              setTimeout(() => setShowRating(true), 2000);
            }
          } else {
            clearInterval(interval);
          }
        }, 10000); // Update alle 10 Sekunden
        
        return () => clearInterval(interval);
        
      } catch (err) {
        setError('Bestellung konnte nicht gefunden werden');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrder();
  }, [orderNumber]);
  
  // Format currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(price);
  };
  
  // Calculate time elapsed
  const getTimeElapsed = (placedAt) => {
    const minutes = Math.floor((Date.now() - new Date(placedAt)) / 60000);
    return `vor ${minutes} Min.`;
  };
  
  // Get current step index
  const getCurrentStepIndex = () => {
    const steps = order.deliveryType === 'delivery' 
      ? statusSteps 
      : statusSteps.filter(step => !step.onlyDelivery);
    
    return steps.findIndex(step => step.id === order.status);
  };
  
  // Handle rating submission
  const handleRatingSubmit = async () => {
    try {
      // Speichere Bewertung
      console.log('Rating:', rating, 'Feedback:', feedback);
      setShowRating(false);
      // Zeige Dankesnachricht
    } catch (error) {
      console.error('Rating submission failed:', error);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 size={48} className={styles.spinner} />
        <p>Lade Bestelldetails...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} />
        <h2>Bestellung nicht gefunden</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/menu')} className={styles.primaryButton}>
          Zurück zum Menü
        </button>
      </div>
    );
  }
  
  const filteredSteps = order.deliveryType === 'delivery' 
    ? statusSteps 
    : statusSteps.filter(step => !step.onlyDelivery);
  
  const currentStepIndex = getCurrentStepIndex();
  
  return (
    <div className={styles.trackingPage}>
      {/* Header */}
      <header className={styles.header}>
        <button 
          onClick={() => router.push('/menu')}
          className={styles.backButton}
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className={styles.headerInfo}>
          <h1>Bestellung #{order.orderNumber}</h1>
          <p>{getTimeElapsed(order.placedAt)}</p>
        </div>
        
        <button className={styles.refreshButton}>
          <RefreshCw size={20} />
        </button>
      </header>
      
      <main className={styles.main}>
        {/* Status Progress */}
        <section className={styles.statusSection}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${((currentStepIndex + 1) / filteredSteps.length) * 100}%` }}
            />
          </div>
          
          <div className={styles.statusSteps}>
            {filteredSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              return (
                <motion.div
                  key={step.id}
                  className={`${styles.statusStep} ${isActive ? styles.active : ''} ${isCurrent ? styles.current : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className={styles.stepIcon}>
                    {isActive ? <Icon size={24} /> : <Circle size={24} />}
                  </div>
                  <span className={styles.stepLabel}>{step.label}</span>
                  <span className={styles.stepTime}>{step.time}</span>
                </motion.div>
              );
            })}
          </div>
        </section>
        
        {/* Current Status Message */}
        <motion.section 
          className={styles.statusMessage}
          key={order.status}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {order.status === 'confirmed' && (
            <p>🎉 Deine Bestellung wurde bestätigt und wird jetzt zubereitet!</p>
          )}
          {order.status === 'preparing' && (
            <p>👨‍🍳 Der Koch bereitet gerade deine Bestellung zu...</p>
          )}
          {order.status === 'ready' && (
            <p>✅ Deine Bestellung ist fertig {order.deliveryType === 'pickup' ? 'zur Abholung' : 'und wird gleich geliefert'}!</p>
          )}
          {order.status === 'delivering' && (
            <p>🚴‍♂️ {order.driver.name} ist mit deiner Bestellung unterwegs!</p>
          )}
          {order.status === 'delivered' && (
            <p>🎊 Bestellung geliefert! Guten Appetit!</p>
          )}
        </motion.section>
        
        {/* Order Details */}
        <section className={styles.orderDetails}>
          <h2>Bestelldetails</h2>
          
          <div className={styles.itemsList}>
            {order.items.map((item, index) => (
              <div key={index} className={styles.orderItem}>
                <div>
                  <span className={styles.quantity}>{item.quantity}x</span>
                  <span>{item.name}</span>
                </div>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          
          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span>Zwischensumme</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className={styles.totalRow}>
                <span>Liefergebühr</span>
                <span>{formatPrice(order.deliveryFee)}</span>
              </div>
            )}
            <div className={styles.totalRow + ' ' + styles.final}>
              <span>Gesamt</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </section>
        
        {/* Contact Cards */}
        <section className={styles.contactSection}>
          {/* Restaurant */}
          <div className={styles.contactCard}>
            <div className={styles.contactIcon}>
              <Home size={24} />
            </div>
            <div className={styles.contactInfo}>
              <h3>{order.restaurant.name}</h3>
              <p>{order.restaurant.address}</p>
            </div>
            <a href={`tel:${order.restaurant.phone}`} className={styles.callButton}>
              <Phone size={20} />
            </a>
          </div>
          
          {/* Driver (nur bei Lieferung und wenn unterwegs) */}
          {order.deliveryType === 'delivery' && order.status === 'delivering' && (
            <motion.div 
              className={styles.contactCard}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className={styles.contactIcon}>
                <Truck size={24} />
              </div>
              <div className={styles.contactInfo}>
                <h3>{order.driver.name}</h3>
                <p>{order.driver.vehicle}</p>
              </div>
              <a href={`tel:${order.driver.phone}`} className={styles.callButton}>
                <Phone size={20} />
              </a>
            </motion.div>
          )}
          
          {/* Delivery Address */}
          {order.deliveryType === 'delivery' && (
            <div className={styles.contactCard}>
              <div className={styles.contactIcon}>
                <MapPin size={24} />
              </div>
              <div className={styles.contactInfo}>
                <h3>Lieferadresse</h3>
                <p>{order.customer.address}</p>
              </div>
            </div>
          )}
        </section>
      </main>
      
      {/* Rating Modal */}
      <AnimatePresence>
        {showRating && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.modalBackdrop}
              onClick={() => setShowRating(false)}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={styles.ratingModal}
            >
              <h2>Wie war deine Bestellung?</h2>
              <p>Dein Feedback hilft uns besser zu werden!</p>
              
              <div className={styles.starRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`${styles.star} ${star <= rating ? styles.filled : ''}`}
                  >
                    <Star size={32} />
                  </button>
                ))}
              </div>
              
              <textarea
                placeholder="Möchtest du uns noch etwas mitteilen? (optional)"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className={styles.feedbackInput}
                rows="3"
              />
              
              <div className={styles.modalActions}>
                <button 
                  onClick={() => setShowRating(false)}
                  className={styles.skipButton}
                >
                  Später
                </button>
                <button 
                  onClick={handleRatingSubmit}
                  className={styles.submitButton}
                  disabled={rating === 0}
                >
                  Bewertung abgeben
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderTrackingPage;