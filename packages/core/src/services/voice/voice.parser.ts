import {
  VoiceLanguage,
  ParsedOrder,
  ParsedOrderItem,
  OrderModification,
  VoiceMenuMapping
} from './voice.types';

class VoiceParser {
  // Swiss German number words
  private swissGermanNumbers: Record<string, number> = {
    // Basic numbers
    'eis': 1, 'ein': 1, 'eine': 1, 'ei': 1,
    'zwei': 2, 'zwöi': 2, 'zwo': 2, 'zwee': 2,
    'drü': 3, 'drei': 3, 'drii': 3,
    'vier': 4, 'vieri': 4,
    'füf': 5, 'fünf': 5, 'foif': 5,
    'sächs': 6, 'sechs': 6, 'säggs': 6,
    'sibe': 7, 'siebe': 7, 'sibä': 7,
    'acht': 8, 'achti': 8,
    'nün': 9, 'neun': 9, 'nüün': 9,
    'zäh': 10, 'zehn': 10, 'zää': 10,
    // Tens
    'zwänzg': 20, 'zwanzig': 20,
    'drissig': 30, 'driissg': 30,
    'vierzg': 40, 'vierzig': 40,
    'füfzg': 50, 'fünfzig': 50,
    // Common quantities
    'es paar': 2, 'es paar': 3, // "a couple"
    'vill': 5, 'viele': 5, // "many"
    'wenig': 1, 'chli': 1, // "little/few"
  };

  // Common food/drink terms in Swiss German
  private swissGermanFoodTerms: Record<string, string> = {
    // Beverages
    'kafi': 'kaffee',
    'kaffi': 'kaffee',
    'schoggi': 'schokolade',
    'schoki': 'schokolade',
    'bier': 'bier',
    'bierli': 'bier',
    'wii': 'wein',
    'wiili': 'wein',
    'wasser': 'wasser',
    'hahne': 'leitungswasser',
    'hahnewasser': 'leitungswasser',
    
    // Food items
    'rösti': 'rösti',
    'rööschti': 'rösti',
    'chäs': 'käse',
    'chääs': 'käse',
    'brot': 'brot',
    'brötli': 'brötchen',
    'gipfeli': 'croissant',
    'weggli': 'brötchen',
    'znüni': 'frühstück',
    'zmittag': 'mittagessen',
    'znacht': 'abendessen',
    'zvieri': 'zwischenmahlzeit',
    
    // Sizes
    'chli': 'klein',
    'chlii': 'klein',
    'gross': 'gross',
    'mittel': 'mittel',
    'normal': 'normal',
  };

  // Size mappings
  private sizeTerms: Record<string, string[]> = {
    small: ['klein', 'chli', 'chlii', 'small', 'piccolo', 'petit'],
    medium: ['mittel', 'medium', 'normal', 'medio', 'moyen'],
    large: ['gross', 'groß', 'large', 'grande', 'grand'],
  };

  // Modification keywords
  private modificationKeywords = {
    add: {
      [VoiceLanguage.DE_CH]: ['mit', 'dazu', 'dezue', 'extra', 'meh'],
      [VoiceLanguage.DE]: ['mit', 'dazu', 'extra', 'mehr'],
      [VoiceLanguage.FR]: ['avec', 'plus', 'extra'],
      [VoiceLanguage.IT]: ['con', 'più', 'extra'],
      [VoiceLanguage.EN]: ['with', 'add', 'extra', 'more'],
    },
    remove: {
      [VoiceLanguage.DE_CH]: ['ohni', 'kei', 'keine', 'weg', 'nöd'],
      [VoiceLanguage.DE]: ['ohne', 'kein', 'keine', 'weg', 'nicht'],
      [VoiceLanguage.FR]: ['sans', 'pas de', 'enlever'],
      [VoiceLanguage.IT]: ['senza', 'no', 'togliere'],
      [VoiceLanguage.EN]: ['without', 'no', 'remove'],
    },
    change: {
      [VoiceLanguage.DE_CH]: ['statt', 'anstatt', 'für'],
      [VoiceLanguage.DE]: ['statt', 'anstatt', 'anstelle'],
      [VoiceLanguage.FR]: ['au lieu de', 'remplacer'],
      [VoiceLanguage.IT]: ['invece di', 'sostituire'],
      [VoiceLanguage.EN]: ['instead of', 'replace', 'change'],
    },
  };

  /**
   * Parse order from voice transcript
   */
  parseOrder(transcript: string, language: VoiceLanguage): ParsedOrder {
    const normalizedTranscript = this.normalizeTranscript(transcript, language);
    
    const items = this.extractItems(normalizedTranscript, language);
    const modifications = this.extractModifications(normalizedTranscript, language);
    const specialRequests = this.extractSpecialRequests(normalizedTranscript, language);
    
    return {
      items,
      modifications,
      specialRequests,
    };
  }

  /**
   * Normalize transcript based on language
   */
  private normalizeTranscript(transcript: string, language: VoiceLanguage): string {
    let normalized = transcript.toLowerCase().trim();
    
    // Handle Swiss German specific normalizations
    if (language === VoiceLanguage.DE_CH) {
      // Replace common Swiss German variations
      Object.entries(this.swissGermanFoodTerms).forEach(([swiss, standard]) => {
        normalized = normalized.replace(new RegExp(`\\b${swiss}\\b`, 'gi'), standard);
      });
      
      // Handle double vowels
      normalized = normalized
        .replace(/öö/g, 'ö')
        .replace(/ää/g, 'ä')
        .replace(/üü/g, 'ü')
        .replace(/ee/g, 'e')
        .replace(/ii/g, 'i');
    }
    
    // Remove filler words
    const fillerWords = this.getFillerWords(language);
    fillerWords.forEach(filler => {
      normalized = normalized.replace(new RegExp(`\\b${filler}\\b`, 'gi'), '');
    });
    
    // Clean up extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }

  /**
   * Extract items from normalized transcript
   */
  private extractItems(transcript: string, language: VoiceLanguage): ParsedOrderItem[] {
    const items: ParsedOrderItem[] = [];
    const words = transcript.split(' ');
    
    // Extract quantities and items
    for (let i = 0; i < words.length; i++) {
      const quantity = this.parseQuantity(words[i], language);
      
      if (quantity > 0) {
        // Look for item name after quantity
        const itemWords: string[] = [];
        let j = i + 1;
        
        // Collect words until we hit a keyword or end
        while (j < words.length && !this.isKeyword(words[j], language)) {
          itemWords.push(words[j]);
          j++;
        }
        
        if (itemWords.length > 0) {
          const itemName = itemWords.join(' ');
          const size = this.extractSize(itemName);
          const cleanName = this.removeSize(itemName);
          
          items.push({
            name: cleanName,
            quantity,
            size,
            modifiers: [],
          });
          
          i = j - 1; // Skip processed words
        }
      }
    }
    
    // If no quantities found, try to extract items without quantities
    if (items.length === 0) {
      const potentialItems = this.extractItemsWithoutQuantities(transcript, language);
      items.push(...potentialItems);
    }
    
    return items;
  }

  /**
   * Extract items without explicit quantities
   */
  private extractItemsWithoutQuantities(
    transcript: string, 
    language: VoiceLanguage
  ): ParsedOrderItem[] {
    const items: ParsedOrderItem[] = [];
    
    // Common patterns for ordering without quantity
    const patterns = this.getOrderPatterns(language);
    
    patterns.forEach(pattern => {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        const itemName = match[1].trim();
        const size = this.extractSize(itemName);
        const cleanName = this.removeSize(itemName);
        
        items.push({
          name: cleanName,
          quantity: 1,
          size,
          modifiers: [],
        });
      }
    });
    
    return items;
  }

  /**
   * Parse quantity from word
   */
  private parseQuantity(word: string, language: VoiceLanguage): number {
    // Check if it's a digit
    const num = parseInt(word, 10);
    if (!isNaN(num)) {
      return num;
    }
    
    // Check Swiss German numbers
    if (language === VoiceLanguage.DE_CH) {
      const swissNum = this.swissGermanNumbers[word];
      if (swissNum) {
        return swissNum;
      }
    }
    
    // Check standard number words
    const numberWords = this.getNumberWords(language);
    return numberWords[word] || 0;
  }

  /**
   * Extract size from item name
   */
  private extractSize(itemName: string): string | undefined {
    const lowerName = itemName.toLowerCase();
    
    for (const [size, terms] of Object.entries(this.sizeTerms)) {
      for (const term of terms) {
        if (lowerName.includes(term)) {
          return size;
        }
      }
    }
    
    return undefined;
  }

  /**
   * Remove size from item name
   */
  private removeSize(itemName: string): string {
    let cleanName = itemName;
    
    Object.values(this.sizeTerms).flat().forEach(sizeTerm => {
      cleanName = cleanName.replace(new RegExp(`\\b${sizeTerm}\\b`, 'gi'), '').trim();
    });
    
    return cleanName;
  }

  /**
   * Extract modifications from transcript
   */
  private extractModifications(
    transcript: string, 
    language: VoiceLanguage
  ): OrderModification[] {
    const modifications: OrderModification[] = [];
    
    // Check for add modifications
    const addKeywords = this.modificationKeywords.add[language] || [];
    addKeywords.forEach(keyword => {
      const pattern = new RegExp(`${keyword}\\s+([\\wäöü\\s]+?)(?:\\s+(?:${this.getConjunctions(language).join('|')})|$)`, 'gi');
      const matches = transcript.matchAll(pattern);
      
      for (const match of matches) {
        if (match[1]) {
          modifications.push({
            type: 'add',
            item: 'current',
            modifier: match[1].trim(),
          });
        }
      }
    });
    
    // Check for remove modifications
    const removeKeywords = this.modificationKeywords.remove[language] || [];
    removeKeywords.forEach(keyword => {
      const pattern = new RegExp(`${keyword}\\s+([\\wäöü\\s]+?)(?:\\s+(?:${this.getConjunctions(language).join('|')})|$)`, 'gi');
      const matches = transcript.matchAll(pattern);
      
      for (const match of matches) {
        if (match[1]) {
          modifications.push({
            type: 'remove',
            item: 'current',
            modifier: match[1].trim(),
          });
        }
      }
    });
    
    return modifications;
  }

  /**
   * Extract special requests
   */
  private extractSpecialRequests(
    transcript: string, 
    language: VoiceLanguage
  ): string[] {
    const requests: string[] = [];
    
    // Keywords that indicate special requests
    const requestKeywords = {
      [VoiceLanguage.DE_CH]: ['bitte', 'gern', 'chönd', 'wär guet'],
      [VoiceLanguage.DE]: ['bitte', 'gerne', 'könnten', 'wäre gut'],
      [VoiceLanguage.FR]: ['s\'il vous plaît', 'pourriez-vous'],
      [VoiceLanguage.IT]: ['per favore', 'potrebbe'],
      [VoiceLanguage.EN]: ['please', 'could you', 'would like'],
    };
    
    const keywords = requestKeywords[language] || [];
    keywords.forEach(keyword => {
      const index = transcript.indexOf(keyword);
      if (index !== -1) {
        // Extract the rest of the sentence after the keyword
        const request = transcript.substring(index).split(/[.!?]/)[0];
        if (request.length > keyword.length + 5) {
          requests.push(request.trim());
        }
      }
    });
    
    return requests;
  }

  /**
   * Check if word is a keyword
   */
  private isKeyword(word: string, language: VoiceLanguage): boolean {
    const allKeywords = [
      ...Object.values(this.modificationKeywords.add[language] || []),
      ...Object.values(this.modificationKeywords.remove[language] || []),
      ...Object.values(this.modificationKeywords.change[language] || []),
      ...this.getConjunctions(language),
    ];
    
    return allKeywords.includes(word.toLowerCase());
  }

  /**
   * Get filler words by language
   */
  private getFillerWords(language: VoiceLanguage): string[] {
    const fillers = {
      [VoiceLanguage.DE_CH]: ['äh', 'ähm', 'also', 'halt', 'ebe', 'gäll', 'oder'],
      [VoiceLanguage.DE]: ['äh', 'ähm', 'also', 'halt', 'eben', 'oder'],
      [VoiceLanguage.FR]: ['euh', 'alors', 'donc', 'voilà'],
      [VoiceLanguage.IT]: ['ehm', 'allora', 'quindi', 'ecco'],
      [VoiceLanguage.EN]: ['uh', 'um', 'like', 'you know', 'well'],
    };
    
    return fillers[language] || [];
  }

  /**
   * Get conjunctions by language
   */
  private getConjunctions(language: VoiceLanguage): string[] {
    const conjunctions = {
      [VoiceLanguage.DE_CH]: ['und', 'oder', 'aber', 'mit'],
      [VoiceLanguage.DE]: ['und', 'oder', 'aber', 'mit'],
      [VoiceLanguage.FR]: ['et', 'ou', 'mais', 'avec'],
      [VoiceLanguage.IT]: ['e', 'o', 'ma', 'con'],
      [VoiceLanguage.EN]: ['and', 'or', 'but', 'with'],
    };
    
    return conjunctions[language] || [];
  }

  /**
   * Get order patterns by language
   */
  private getOrderPatterns(language: VoiceLanguage): RegExp[] {
    const patterns = {
      [VoiceLanguage.DE_CH]: [
        /ich hätt gern (?:e |es |en )?(.+)/i,
        /ich möcht (?:e |es |en )?(.+)/i,
        /ich nimm (?:e |es |en )?(.+)/i,
        /für mich (?:e |es |en )?(.+)/i,
        /bitte (?:e |es |en )?(.+)/i,
      ],
      [VoiceLanguage.DE]: [
        /ich hätte gern (?:ein |eine |einen )?(.+)/i,
        /ich möchte (?:ein |eine |einen )?(.+)/i,
        /ich nehme (?:ein |eine |einen )?(.+)/i,
        /für mich (?:ein |eine |einen )?(.+)/i,
        /bitte (?:ein |eine |einen )?(.+)/i,
      ],
      [VoiceLanguage.FR]: [
        /je voudrais (?:un |une |des )?(.+)/i,
        /je prends (?:un |une |des )?(.+)/i,
        /pour moi (?:un |une |des )?(.+)/i,
      ],
      [VoiceLanguage.IT]: [
        /vorrei (?:un |una |uno )?(.+)/i,
        /prendo (?:un |una |uno )?(.+)/i,
        /per me (?:un |una |uno )?(.+)/i,
      ],
      [VoiceLanguage.EN]: [
        /i(?:'d| would) like (?:a |an |some )?(.+)/i,
        /i(?:'ll| will) have (?:a |an |some )?(.+)/i,
        /can i get (?:a |an |some )?(.+)/i,
        /(?:a |an |some )?(.+) please/i,
      ],
    };
    
    return patterns[language] || [];
  }

  /**
   * Get number words by language
   */
  private getNumberWords(language: VoiceLanguage): Record<string, number> {
    const numbers = {
      [VoiceLanguage.DE]: {
        'ein': 1, 'eine': 1, 'einen': 1,
        'zwei': 2, 'drei': 3, 'vier': 4, 'fünf': 5,
        'sechs': 6, 'sieben': 7, 'acht': 8, 'neun': 9, 'zehn': 10,
      },
      [VoiceLanguage.FR]: {
        'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4,
        'cinq': 5, 'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
      },
      [VoiceLanguage.IT]: {
        'uno': 1, 'una': 1, 'due': 2, 'tre': 3, 'quattro': 4,
        'cinque': 5, 'sei': 6, 'sette': 7, 'otto': 8, 'nove': 9, 'dieci': 10,
      },
      [VoiceLanguage.EN]: {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      },
    };
    
    // Swiss German uses its own numbers
    if (language === VoiceLanguage.DE_CH) {
      return this.swissGermanNumbers;
    }
    
    return numbers[language] || {};
  }

  /**
   * Match items against menu
   */
  async matchMenuItems(
    items: ParsedOrderItem[],
    menuMappings: VoiceMenuMapping[]
  ): Promise<ParsedOrderItem[]> {
    return items.map(item => {
      const normalizedName = item.name.toLowerCase();
      
      // Find best match in menu mappings
      let bestMatch: VoiceMenuMapping | null = null;
      let bestScore = 0;
      
      menuMappings.forEach(mapping => {
        // Check exact match
        if (mapping.spokenNames.some(name => name.toLowerCase() === normalizedName)) {
          bestMatch = mapping;
          bestScore = 1;
          return;
        }
        
        // Check aliases
        if (mapping.aliases.some(alias => alias.toLowerCase() === normalizedName)) {
          bestMatch = mapping;
          bestScore = 0.9;
          return;
        }
        
        // Fuzzy matching
        const score = this.calculateSimilarity(normalizedName, mapping.spokenNames);
        if (score > bestScore && score > 0.7) {
          bestMatch = mapping;
          bestScore = score;
        }
      });
      
      if (bestMatch) {
        return {
          ...item,
          matched: true,
          confidence: bestScore,
          name: bestMatch.spokenNames[0], // Use primary name
        };
      }
      
      return {
        ...item,
        matched: false,
        confidence: 0,
      };
    });
  }

  /**
   * Calculate similarity between strings
   */
  private calculateSimilarity(str1: string, candidates: string[]): number {
    let maxScore = 0;
    
    candidates.forEach(candidate => {
      const score = this.levenshteinSimilarity(str1.toLowerCase(), candidate.toLowerCase());
      if (score > maxScore) {
        maxScore = score;
      }
    });
    
    return maxScore;
  }

  /**
   * Levenshtein distance-based similarity
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    
    return 1 - (distance / maxLength);
  }
}

// Export singleton instance
export const voiceParser = new VoiceParser();
