/**
 * EATECH QR Scanner Component
 * Handles QR code scanning for table identification
 * File Path: /apps/web/src/components/QRScanner/QRScanner.jsx
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import styled from 'styled-components';
import { Camera, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button, Card, Alert } from '@eatech/ui';
import QRCodeService from '@eatech/core/services/QRCodeService';
import { useSessionStorage } from '../../hooks/useSessionStorage';

// Styled Components
const ScannerContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const ScannerWrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ScannerBox = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;
  aspect-ratio: 1;
  
  #qr-reader {
    width: 100%;
    height: 100%;
    
    video {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover;
      border-radius: 20px;
    }
  }
`;

const ScannerOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 250px;
    height: 250px;
    border: 3px solid #ff6b6b;
    border-radius: 20px;
    animation: scan 2s ease-in-out infinite;
  }
  
  @keyframes scan {
    0%, 100% {
      transform: translate(-50%, -50%) scale(0.95);
      opacity: 0.5;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.05);
      opacity: 1;
    }
  }
`;

const Instructions = styled.div`
  text-align: center;
  color: white;
  margin-top: 24px;
  
  p {
    margin: 8px 0;
    font-size: 16px;
    opacity: 0.9;
  }
`;

const ManualEntry = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 20px;
  margin: 20px;
  border-radius: 12px;
  text-align: center;
`;

const StatusModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 32px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
  text-align: center;
  z-index: 10000;
`;

const StatusIcon = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.success ? '#d1fae5' : '#fee2e2'};
  color: ${props => props.success ? '#10b981' : '#ef4444'};
`;

// Component
const QRScanner = ({ onClose, onSuccess }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [manualTableNumber, setManualTableNumber] = useState('');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scannerRef = useRef(null);
  const [sessionData, setSessionData] = useSessionStorage('eatech_session', null);

  // Initialize scanner
  useEffect(() => {
    let html5QrCode;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode('qr-reader');
        
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          onScanSuccess,
          onScanError
        );

        setScanning(true);
      } catch (err) {
        console.error('Failed to start scanner:', err);
        setError('Kamera konnte nicht gestartet werden. Bitte erlauben Sie den Kamerazugriff.');
      }
    };

    // Check if we already have table info from URL
    const tableFromUrl = searchParams.get('table');
    const tenantFromUrl = searchParams.get('t');
    
    if (tableFromUrl && tenantFromUrl) {
      // Direct link scan
      handleQRCodeData(`${window.location.origin}/scan?t=${tenantFromUrl}&table=${tableFromUrl}`);
    } else {
      // Start camera scanner
      startScanner();
    }

    // Cleanup
    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, []);

  // Handle successful scan
  const onScanSuccess = (decodedText) => {
    handleQRCodeData(decodedText);
  };

  // Handle scan errors (mostly ignored)
  const onScanError = (errorMessage) => {
    // Ignore frequent scan errors
  };

  // Process QR code data
  const handleQRCodeData = async (qrData) => {
    try {
      setStatus({ loading: true, message: 'QR-Code wird verarbeitet...' });

      // Parse QR code URL
      const url = new URL(qrData);
      const params = new URLSearchParams(url.search);
      
      const tenantId = params.get('t');
      const tableId = params.get('table');
      const sessionId = params.get('s') || `session_${Date.now()}`;

      if (!tenantId || !tableId) {
        throw new Error('Ungültiger QR-Code');
      }

      // Validate QR code
      const validation = await QRCodeService.validateQRScan(tenantId, tableId, sessionId);
      
      if (!validation.valid) {
        throw new Error(validation.error || 'QR-Code konnte nicht validiert werden');
      }

      // Save session data
      const session = {
        tenantId,
        tableId,
        sessionId,
        tableName: validation.tableData.tableName,
        tableNumber: validation.tableData.tableNumber,
        startTime: Date.now()
      };
      
      setSessionData(session);

      // Track scan
      await QRCodeService.trackQRUsage(tenantId, tableId, {
        type: 'scan',
        sessionId,
        timestamp: Date.now()
      });

      // Success
      setStatus({
        success: true,
        message: `Willkommen am ${validation.tableData.tableName}!`
      });

      // Navigate to menu after short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(session);
        } else {
          navigate(`/menu?t=${tenantId}`);
        }
      }, 1500);

    } catch (error) {
      console.error('Error processing QR code:', error);
      setStatus({
        error: true,
        message: error.message || 'QR-Code konnte nicht verarbeitet werden'
      });
    }
  };

  // Handle manual table entry
  const handleManualEntry = async () => {
    if (!manualTableNumber) {
      setError('Bitte geben Sie eine Tischnummer ein');
      return;
    }

    // For demo purposes - in production this would validate against tenant
    const session = {
      tenantId: 'demo',
      tableId: `table_${manualTableNumber}`,
      sessionId: `session_${Date.now()}`,
      tableName: `Tisch ${manualTableNumber}`,
      tableNumber: manualTableNumber,
      startTime: Date.now(),
      manual: true
    };

    setSessionData(session);

    if (onSuccess) {
      onSuccess(session);
    } else {
      navigate('/menu?t=demo');
    }
  };

  return (
    <ScannerContainer>
      <Header>
        <Title>QR-Code scannen</Title>
        <CloseButton onClick={onClose}>
          <X size={24} color="white" />
        </CloseButton>
      </Header>

      <ScannerWrapper>
        {!status && (
          <ScannerBox>
            <div id="qr-reader"></div>
            <ScannerOverlay />
          </ScannerBox>
        )}

        {status && !status.loading && (
          <StatusModal>
            <StatusIcon success={status.success}>
              {status.success ? <CheckCircle size={40} /> : <AlertCircle size={40} />}
            </StatusIcon>
            <h3>{status.success ? 'Erfolgreich!' : 'Fehler'}</h3>
            <p>{status.message}</p>
            {status.error && (
              <Button
                variant="primary"
                onClick={() => {
                  setStatus(null);
                  setError(null);
                }}
                style={{ marginTop: 16 }}
              >
                Erneut versuchen
              </Button>
            )}
          </StatusModal>
        )}
      </ScannerWrapper>

      {!status && (
        <>
          <Instructions>
            <p>Richten Sie die Kamera auf den QR-Code auf Ihrem Tisch</p>
            <p>Der Code wird automatisch erkannt</p>
          </Instructions>

          <ManualEntry>
            <p style={{ color: 'white', marginBottom: 16 }}>
              Kein QR-Code? Tischnummer manuell eingeben:
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Tischnummer"
                value={manualTableNumber}
                onChange={(e) => setManualTableNumber(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 16
                }}
              />
              <Button onClick={handleManualEntry}>
                Bestätigen
              </Button>
            </div>
          </ManualEntry>
        </>
      )}

      {error && (
        <Alert
          variant="error"
          onClose={() => setError(null)}
          style={{ margin: 20 }}
        >
          {error}
        </Alert>
      )}
    </ScannerContainer>
  );
};

export default QRScanner;