/**
 * Twilio webhook handlers
 * Processes SMS, voice calls, and WhatsApp messages
 */

import { Request, Response } from 'express';
import twilio from 'twilio';
import { db } from '@eatech/core';
import { VoiceOrder, SMSOrder, WhatsAppOrder } from '@eatech/types';
import { logger, parseSwissPhoneNumber } from '@eatech/utils';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Webhook validation
const validateTwilioRequest = twilio.webhook({
  validate: process.env.NODE_ENV === 'production',
});

// Swiss number patterns
const SWISS_MOBILE_PATTERN = /^(?:\+41|0041|0)?7[6-9]\d{7}$/;
const SWISS_LANDLINE_PATTERN = /^(?:\+41|0041|0)?[2-9]\d{8}$/;

export async function handleSMSWebhook(req: Request, res: Response) {
  try {
    const { From, To, Body, MessageSid, FromCountry, FromCity } = req.body;
    
    logger.info('SMS received', {
      from: From,
      to: To,
      messageSid: MessageSid,
      country: FromCountry,
      city: FromCity,
    });

    // Parse Swiss phone number
    const phoneNumber = parseSwissPhoneNumber(From);
    
    // Check if this is an order-related message
    const isOrder = await detectOrderIntent(Body);
    
    if (isOrder) {
      // Process as order
      const order = await processSMSOrder(phoneNumber, Body, MessageSid);
      
      // Send confirmation
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message(
        getOrderConfirmationMessage(order, 'sms'),
        {
          language: detectLanguage(Body),
        }
      );
      
      res.type('text/xml');
      res.send(twiml.toString());
    } else {
      // Handle general inquiry
      const response = await handleGeneralInquiry(Body, phoneNumber);
      
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message(response);
      
      res.type('text/xml');
      res.send(twiml.toString());
    }

    // Store SMS for analytics
    await db.storeSMS({
      from: phoneNumber,
      to: To,
      body: Body,
      messageSid: MessageSid,
      type: isOrder ? 'order' : 'inquiry',
      country: FromCountry,
      city: FromCity,
      createdAt: new Date(),
    });

  } catch (error) {
    logger.error('SMS webhook error:', error);
    
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
}

export async function handleVoiceWebhook(req: Request, res: Response) {
  try {
    const { From, To, CallSid, CallStatus, Direction } = req.body;
    
    logger.info('Voice call received', {
      from: From,
      to: To,
      callSid: CallSid,
      status: CallStatus,
      direction: Direction,
    });

    const twiml = new twilio.twiml.VoiceResponse();

    if (CallStatus === 'ringing' || CallStatus === 'in-progress') {
      // Determine language based on caller's number or location
      const language = await detectCallerLanguage(From);
      
      // Greeting
      twiml.say(
        {
          voice: getVoiceForLanguage(language),
          language: getTwilioLanguageCode(language),
        },
        getGreeting(language)
      );

      // Gather menu selection
      const gather = twiml.gather({
        numDigits: 1,
        action: '/webhooks/twilio/voice/menu',
        method: 'POST',
        timeout: 5,
        language: getTwilioLanguageCode(language),
      });

      gather.say(
        {
          voice: getVoiceForLanguage(language),
          language: getTwilioLanguageCode(language),
        },
        getMainMenu(language)
      );

      // No input - repeat
      twiml.redirect('/webhooks/twilio/voice');
    }

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    logger.error('Voice webhook error:', error);
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('We apologize, but an error has occurred. Please try again later.');
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
}

export async function handleVoiceMenuWebhook(req: Request, res: Response) {
  try {
    const { Digits, From, CallSid } = req.body;
    const language = await detectCallerLanguage(From);
    
    const twiml = new twilio.twiml.VoiceResponse();

    switch (Digits) {
      case '1': // Place order
        twiml.say(
          {
            voice: getVoiceForLanguage(language),
            language: getTwilioLanguageCode(language),
          },
          getOrderInstructions(language)
        );

        // Record the order
        twiml.record({
          action: '/webhooks/twilio/voice/order',
          method: 'POST',
          maxLength: 120,
          transcribe: true,
          transcribeCallback: '/webhooks/twilio/voice/transcription',
          language: getTwilioLanguageCode(language),
          playBeep: true,
          timeout: 3,
        });
        break;

      case '2': // Check order status
        const gather = twiml.gather({
          action: '/webhooks/twilio/voice/order-status',
          method: 'POST',
          finishOnKey: '#',
          timeout: 10,
        });

        gather.say(
          {
            voice: getVoiceForLanguage(language),
            language: getTwilioLanguageCode(language),
          },
          getOrderStatusInstructions(language)
        );
        break;

      case '3': // Restaurant information
        twiml.say(
          {
            voice: getVoiceForLanguage(language),
            language: getTwilioLanguageCode(language),
          },
          await getRestaurantInfo(language)
        );
        twiml.redirect('/webhooks/twilio/voice');
        break;

      case '9': // Speak to representative
        // Transfer to restaurant phone
        const restaurant = await getRestaurantFromPhoneNumber(req.body.To);
        if (restaurant?.phoneNumber) {
          twiml.dial(restaurant.phoneNumber);
        } else {
          twiml.say(
            {
              voice: getVoiceForLanguage(language),
              language: getTwilioLanguageCode(language),
            },
            getNoRepresentativeMessage(language)
          );
        }
        break;

      default:
        twiml.say(
          {
            voice: getVoiceForLanguage(language),
            language: getTwilioLanguageCode(language),
          },
          getInvalidSelectionMessage(language)
        );
        twiml.redirect('/webhooks/twilio/voice');
    }

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    logger.error('Voice menu webhook error:', error);
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred. Please try again.');
    twiml.redirect('/webhooks/twilio/voice');
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
}

export async function handleVoiceTranscriptionWebhook(req: Request, res: Response) {
  try {
    const { 
      TranscriptionText, 
      CallSid, 
      RecordingSid, 
      RecordingUrl,
      From 
    } = req.body;
    
    logger.info('Voice transcription received', {
      callSid: CallSid,
      recordingSid: RecordingSid,
      transcriptionLength: TranscriptionText?.length,
    });

    if (!TranscriptionText) {
      logger.warn('Empty transcription received');
      return res.status(200).send('OK');
    }

    // Process voice order
    const phoneNumber = parseSwissPhoneNumber(From);
    const order = await processVoiceOrder(
      phoneNumber,
      TranscriptionText,
      CallSid,
      RecordingSid,
      RecordingUrl
    );

    // Send SMS confirmation
    if (phoneNumber) {
      await sendOrderConfirmationSMS(phoneNumber, order);
    }

    res.status(200).send('OK');

  } catch (error) {
    logger.error('Voice transcription webhook error:', error);
    res.status(500).send('Error processing transcription');
  }
}

export async function handleWhatsAppWebhook(req: Request, res: Response) {
  try {
    const { 
      From, 
      To, 
      Body, 
      MessageSid,
      ProfileName,
      MediaUrl0,
      MediaContentType0
    } = req.body;
    
    logger.info('WhatsApp message received', {
      from: From,
      profileName: ProfileName,
      hasMedia: !!MediaUrl0,
      mediaType: MediaContentType0,
    });

    const phoneNumber = parseSwissPhoneNumber(From.replace('whatsapp:', ''));
    
    // Check for media (e.g., menu photo)
    if (MediaUrl0) {
      await handleWhatsAppMedia(
        phoneNumber,
        MediaUrl0,
        MediaContentType0,
        MessageSid
      );
    }

    // Process message
    const isOrder = await detectOrderIntent(Body);
    
    if (isOrder) {
      const order = await processWhatsAppOrder(
        phoneNumber,
        Body,
        MessageSid,
        ProfileName
      );
      
      // Send rich confirmation with buttons
      await sendWhatsAppOrderConfirmation(From, order);
    } else {
      // Interactive response
      await sendWhatsAppInteractiveMenu(From);
    }

    res.status(200).send('OK');

  } catch (error) {
    logger.error('WhatsApp webhook error:', error);
    res.status(500).send('Error processing WhatsApp message');
  }
}

// Helper functions

async function detectOrderIntent(message: string): Promise<boolean> {
  const orderKeywords = [
    // German
    'bestellen', 'bestelle', 'möchte', 'hätte gerne', 'bitte',
    // French  
    'commander', 'commande', 'voudrais', 'j\'aimerais',
    // Italian
    'ordinare', 'ordine', 'vorrei', 'desidero',
    // English
    'order', 'would like', 'want', 'please',
  ];

  const lowerMessage = message.toLowerCase();
  return orderKeywords.some(keyword => lowerMessage.includes(keyword));
}

async function processSMSOrder(
  phoneNumber: string,
  message: string,
  messageSid: string
): Promise<SMSOrder> {
  // Parse order from message
  const parsedOrder = await parseOrderFromText(message);
  
  // Find customer
  const customer = await db.findCustomerByPhone(phoneNumber);
  
  // Create order
  const order = await db.createOrder({
    ...parsedOrder,
    customerId: customer?.id,
    customerPhone: phoneNumber,
    source: 'sms',
    messageSid,
    status: 'pending',
  });

  return order;
}

async function processVoiceOrder(
  phoneNumber: string,
  transcription: string,
  callSid: string,
  recordingSid: string,
  recordingUrl: string
): Promise<VoiceOrder> {
  // Parse order from transcription
  const parsedOrder = await parseOrderFromText(transcription);
  
  // Find customer
  const customer = await db.findCustomerByPhone(phoneNumber);
  
  // Create order
  const order = await db.createOrder({
    ...parsedOrder,
    customerId: customer?.id,
    customerPhone: phoneNumber,
    source: 'voice',
    callSid,
    recordingSid,
    recordingUrl,
    transcription,
    status: 'pending',
  });

  return order;
}

async function processWhatsAppOrder(
  phoneNumber: string,
  message: string,
  messageSid: string,
  profileName?: string
): Promise<WhatsAppOrder> {
  // Parse order from message
  const parsedOrder = await parseOrderFromText(message);
  
  // Find or create customer
  let customer = await db.findCustomerByPhone(phoneNumber);
  
  if (!customer && profileName) {
    customer = await db.createCustomer({
      phone: phoneNumber,
      name: profileName,
      source: 'whatsapp',
    });
  }
  
  // Create order
  const order = await db.createOrder({
    ...parsedOrder,
    customerId: customer?.id,
    customerPhone: phoneNumber,
    customerName: profileName,
    source: 'whatsapp',
    messageSid,
    status: 'pending',
  });

  return order;
}

async function parseOrderFromText(text: string): Promise<any> {
  // This would use NLP to parse the order
  // For now, simple keyword matching
  
  const items = [];
  const lowerText = text.toLowerCase();
  
  // Menu item detection (simplified)
  const menuItems = await db.getMenuItems();
  
  for (const item of menuItems) {
    if (lowerText.includes(item.name.toLowerCase())) {
      items.push({
        productId: item.id,
        name: item.name,
        quantity: 1, // Would parse quantity from text
        price: item.price,
      });
    }
  }

  return {
    items,
    specialInstructions: text,
    type: detectOrderType(text),
  };
}

function detectOrderType(text: string): 'delivery' | 'pickup' | 'dine-in' {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('deliver') || lowerText.includes('livr')) {
    return 'delivery';
  }
  if (lowerText.includes('pickup') || lowerText.includes('abhol')) {
    return 'pickup';
  }
  
  return 'dine-in';
}

function detectLanguage(text: string): 'de' | 'fr' | 'it' | 'en' {
  // Simple language detection based on keywords
  const germanWords = ['ich', 'möchte', 'bitte', 'danke', 'und'];
  const frenchWords = ['je', 'voudrais', 'merci', 'et', 'avec'];
  const italianWords = ['io', 'vorrei', 'grazie', 'e', 'con'];
  
  const lowerText = text.toLowerCase();
  
  const germanCount = germanWords.filter(w => lowerText.includes(w)).length;
  const frenchCount = frenchWords.filter(w => lowerText.includes(w)).length;
  const italianCount = italianWords.filter(w => lowerText.includes(w)).length;
  
  if (frenchCount > germanCount && frenchCount > italianCount) return 'fr';
  if (italianCount > germanCount && italianCount > frenchCount) return 'it';
  
  return 'de'; // Default to German for Switzerland
}

async function detectCallerLanguage(phoneNumber: string): Promise<string> {
  // Detect language based on phone number prefix or customer preferences
  const customer = await db.findCustomerByPhone(phoneNumber);
  
  if (customer?.language) {
    return customer.language;
  }
  
  // Swiss area codes to language mapping
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  if (cleanNumber.startsWith('4121') || cleanNumber.startsWith('4122')) {
    return 'fr'; // Geneva, Lausanne
  }
  if (cleanNumber.startsWith('4191')) {
    return 'it'; // Ticino
  }
  
  return 'de'; // Default to German
}

function getVoiceForLanguage(language: string): string {
  const voices = {
    de: 'alice',
    fr: 'alice',
    it: 'alice',
    en: 'Polly.Joanna',
  };
  
  return voices[language] || voices.de;
}

function getTwilioLanguageCode(language: string): string {
  const codes = {
    de: 'de-DE',
    fr: 'fr-FR',
    it: 'it-IT',
    en: 'en-US',
  };
  
  return codes[language] || codes.de;
}

// Message templates

function getGreeting(language: string): string {
  const greetings = {
    de: 'Willkommen bei EATECH. Wie können wir Ihnen helfen?',
    fr: 'Bienvenue chez EATECH. Comment pouvons-nous vous aider?',
    it: 'Benvenuti a EATECH. Come possiamo aiutarla?',
    en: 'Welcome to EATECH. How can we help you?',
  };
  
  return greetings[language] || greetings.de;
}

function getMainMenu(language: string): string {
  const menus = {
    de: 'Drücken Sie 1 für eine Bestellung, 2 für den Bestellstatus, 3 für Restaurantinformationen, oder 9 um mit einem Mitarbeiter zu sprechen.',
    fr: 'Appuyez sur 1 pour commander, 2 pour le statut de commande, 3 pour les informations du restaurant, ou 9 pour parler à un agent.',
    it: 'Premi 1 per ordinare, 2 per lo stato dell\'ordine, 3 per informazioni sul ristorante, o 9 per parlare con un operatore.',
    en: 'Press 1 to place an order, 2 for order status, 3 for restaurant information, or 9 to speak with a representative.',
  };
  
  return menus[language] || menus.de;
}

function getOrderInstructions(language: string): string {
  const instructions = {
    de: 'Bitte sagen Sie Ihre Bestellung nach dem Signalton. Sie haben 2 Minuten Zeit.',
    fr: 'Veuillez indiquer votre commande après le signal sonore. Vous avez 2 minutes.',
    it: 'Si prega di indicare il suo ordine dopo il segnale acustico. Ha 2 minuti.',
    en: 'Please state your order after the beep. You have 2 minutes.',
  };
  
  return instructions[language] || instructions.de;
}

function getOrderConfirmationMessage(order: any, channel: string): string {
  return `Vielen Dank für Ihre Bestellung! Bestellnummer: ${order.orderNumber}. Sie erhalten in Kürze eine Bestätigung.`;
}

async function sendOrderConfirmationSMS(phoneNumber: string, order: any) {
  try {
    await twilioClient.messages.create({
      body: getOrderConfirmationMessage(order, 'sms'),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
  } catch (error) {
    logger.error('Failed to send order confirmation SMS:', error);
  }
}

async function sendWhatsAppOrderConfirmation(to: string, order: any) {
  try {
    await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to,
      body: `🎉 *Bestellung bestätigt!*\n\nBestellnummer: ${order.orderNumber}\nGeschätzte Zeit: 30-45 Minuten\n\nVielen Dank für Ihre Bestellung!`,
      persistentAction: [
        'track_order',
        'contact_restaurant',
      ],
    });
  } catch (error) {
    logger.error('Failed to send WhatsApp confirmation:', error);
  }
}

async function sendWhatsAppInteractiveMenu(to: string) {
  try {
    await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to,
      body: 'Willkommen bei EATECH! 🍽️\n\nWie können wir Ihnen helfen?',
      persistentAction: [
        'view_menu',
        'place_order',
        'track_order',
        'contact_us',
      ],
    });
  } catch (error) {
    logger.error('Failed to send WhatsApp interactive menu:', error);
  }
}

async function handleWhatsAppMedia(
  phoneNumber: string,
  mediaUrl: string,
  contentType: string,
  messageSid: string
) {
  // Handle media uploads (e.g., photos of handwritten orders)
  logger.info('WhatsApp media received', {
    phoneNumber,
    contentType,
    messageSid,
  });
  
  // Download and process media
  // Could use OCR for handwritten orders
}

async function getRestaurantFromPhoneNumber(phoneNumber: string): Promise<any> {
  // Look up restaurant by Twilio phone number
  return db.findRestaurantByPhone(phoneNumber);
}

async function getRestaurantInfo(language: string): Promise<string> {
  // Get restaurant information
  const info = {
    de: 'Restaurant EATECH, Bahnhofstrasse 1, 8001 Zürich. Öffnungszeiten: Täglich 11:00 - 22:00 Uhr.',
    fr: 'Restaurant EATECH, Bahnhofstrasse 1, 8001 Zurich. Heures d\'ouverture: Tous les jours 11h00 - 22h00.',
    it: 'Ristorante EATECH, Bahnhofstrasse 1, 8001 Zurigo. Orari: Tutti i giorni 11:00 - 22:00.',
    en: 'Restaurant EATECH, Bahnhofstrasse 1, 8001 Zurich. Hours: Daily 11:00 AM - 10:00 PM.',
  };
  
  return info[language] || info.de;
}

function getOrderStatusInstructions(language: string): string {
  const instructions = {
    de: 'Bitte geben Sie Ihre Bestellnummer ein, gefolgt von der Raute-Taste.',
    fr: 'Veuillez entrer votre numéro de commande, suivi du dièse.',
    it: 'Inserisca il numero d\'ordine, seguito dal cancelletto.',
    en: 'Please enter your order number, followed by the pound key.',
  };
  
  return instructions[language] || instructions.de;
}

function getInvalidSelectionMessage(language: string): string {
  const messages = {
    de: 'Ungültige Auswahl. Bitte versuchen Sie es erneut.',
    fr: 'Sélection invalide. Veuillez réessayer.',
    it: 'Selezione non valida. Si prega di riprovare.',
    en: 'Invalid selection. Please try again.',
  };
  
  return messages[language] || messages.de;
}

function getNoRepresentativeMessage(language: string): string {
  const messages = {
    de: 'Leider ist momentan kein Mitarbeiter verfügbar. Bitte versuchen Sie es später erneut.',
    fr: 'Aucun agent n\'est disponible pour le moment. Veuillez réessayer plus tard.',
    it: 'Nessun operatore disponibile al momento. Si prega di riprovare più tardi.',
    en: 'No representative is available at the moment. Please try again later.',
  };
  
  return messages[language] || messages.de;
}

async function handleGeneralInquiry(message: string, phoneNumber: string): Promise<string> {
  // Handle non-order inquiries
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('öffnung') || lowerMessage.includes('hour')) {
    return await getRestaurantInfo(detectLanguage(message));
  }
  
  if (lowerMessage.includes('menu') || lowerMessage.includes('karte')) {
    return 'Unsere aktuelle Speisekarte finden Sie unter: https://eatech.ch/menu';
  }
  
  return 'Vielen Dank für Ihre Nachricht. Für Bestellungen antworten Sie mit "Bestellen" oder rufen Sie uns an.';
}

// Twilio webhook endpoints configuration
export function getTwilioWebhookEndpoints() {
  const baseUrl = process.env.API_BASE_URL || 'https://api.eatech.ch';
  
  return {
    sms: `${baseUrl}/webhooks/twilio/sms`,
    voice: `${baseUrl}/webhooks/twilio/voice`,
    voiceMenu: `${baseUrl}/webhooks/twilio/voice/menu`,
    voiceTranscription: `${baseUrl}/webhooks/twilio/voice/transcription`,
    whatsapp: `${baseUrl}/webhooks/twilio/whatsapp`,
  };
}

// Webhook configuration helper
export async function configureTwilioWebhooks() {
  const endpoints = getTwilioWebhookEndpoints();
  
  // Update phone number webhooks
  const phoneNumbers = await twilioClient.incomingPhoneNumbers.list();
  
  for (const number of phoneNumbers) {
    await number.update({
      smsUrl: endpoints.sms,
      smsMethod: 'POST',
      voiceUrl: endpoints.voice,
      voiceMethod: 'POST',
    });
  }
  
  logger.info('Twilio webhooks configured');
}
