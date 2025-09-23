// AI Prediktivno održavanje servis
// Analizira istoriju servisa i predviđa buduće potrebe za održavanjem

import { 
  MaintenancePatterns, 
  PredictiveInsights, 
  AiAnalysisResults,
  Service,
  Appliance,
  Client 
} from "@shared/schema";

export interface ServiceAnalysisData {
  serviceId: number;
  applianceId: number;
  clientId: number;
  serviceDate: Date;
  issueType: string;
  resolutionTime: number; // u danima
  cost: number;
  partsUsed: string[];
  seasonalFactor: 'zima' | 'proleće' | 'leto' | 'jesen';
  applianceAge: number; // u mesecima
}

export interface PredictiveAnalysisResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  predictedMaintenanceDate: Date;
  predictedFailures: string[];
  recommendedActions: string[];
  estimatedCost: number;
  confidenceLevel: number; // 0-100
  factors: {
    ageInfluence: number;
    usagePattern: string;
    seasonalRisk: number;
    historicalFrequency: number;
    partFailurePattern: number;
  };
}

export class AIPredictiveMaintenanceService {
  
  /**
   * Analizira istoriju servisa za određenu kategoriju uređaja i kreira pattern
   */
  async analyzeMaintenancePatterns(
    applianceCategoryId: number,
    manufacturerId?: number,
    serviceHistory: ServiceAnalysisData[] = []
  ): Promise<MaintenancePatterns> {
    
    console.log(`[AI PREDICTIVE] Analiziram obrasce održavanja za kategoriju ${applianceCategoryId}`);
    
    // Filtriranje podataka po kategoriji i proizvođaču
    const relevantServices = serviceHistory.filter(service => 
      service.applianceId && (!manufacturerId || service.applianceId)
    );

    // Računanje prosečnog intervala servisa
    const serviceIntervals = this.calculateServiceIntervals(relevantServices);
    const averageServiceInterval = serviceIntervals.length > 0 
      ? Math.round(serviceIntervals.reduce((a, b) => a + b, 0) / serviceIntervals.length)
      : 365; // defaultno jednom godišnje

    // Analiza čestih kvarova
    const commonFailurePoints = this.analyzeCommonFailures(relevantServices);

    // Analiza sezonskih faktora
    const seasonalFactors = this.analyzeSeasonalFactors(relevantServices);

    // Analiza obrazaca korišćenja
    const usagePatterns = this.analyzeUsagePatterns(relevantServices);

    // Računanje confidence score na osnovu količine podataka
    const confidenceScore = this.calculateConfidenceScore(relevantServices.length);

    return {
      id: 0, // biće dodelj database
      applianceCategoryId,
      manufacturerId: manufacturerId || null,
      averageServiceInterval,
      commonFailurePoints,
      seasonalFactors: JSON.stringify(seasonalFactors),
      usagePatterns: JSON.stringify(usagePatterns),
      analysisData: JSON.stringify({
        totalServices: relevantServices.length,
        avgCost: relevantServices.reduce((sum, s) => sum + s.cost, 0) / relevantServices.length,
        avgResolutionTime: relevantServices.reduce((sum, s) => sum + s.resolutionTime, 0) / relevantServices.length,
        dataRange: {
          from: relevantServices.length > 0 ? Math.min(...relevantServices.map(s => s.serviceDate.getTime())) : null,
          to: relevantServices.length > 0 ? Math.max(...relevantServices.map(s => s.serviceDate.getTime())) : null
        }
      }),
      confidenceScore: confidenceScore.toString(),
      lastAnalysis: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Generiše prediktivne uvide za određeni uređaj
   */
  async generatePredictiveInsights(
    applianceId: number,
    clientId: number,
    serviceHistory: ServiceAnalysisData[],
    maintenancePatterns?: MaintenancePatterns
  ): Promise<PredictiveAnalysisResult> {
    
    console.log(`[AI PREDICTIVE] Generiram prediktivne uvide za uređaj ${applianceId}`);

    // Filtriranje istorije za specifični uređaj
    const applianceServices = serviceHistory.filter(s => s.applianceId === applianceId);
    
    if (applianceServices.length === 0) {
      // Nema dovoljno podataka - koristimo pattern analize
      return this.generateBasicPrediction(applianceId, clientId, maintenancePatterns);
    }

    // Analiza faktora rizika
    const lastService = applianceServices.sort((a, b) => 
      b.serviceDate.getTime() - a.serviceDate.getTime()
    )[0];

    const daysSinceLastService = Math.floor(
      (Date.now() - lastService.serviceDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Računanje rizika na osnovu godina uređaja
    const ageInfluence = this.calculateAgeRiskFactor(lastService.applianceAge);
    
    // Analiza sezonskih faktora
    const currentSeason = this.getCurrentSeason();
    const seasonalRisk = this.calculateSeasonalRisk(currentSeason, applianceServices);
    
    // Analiza frekvencije servisa
    const historicalFrequency = this.calculateServiceFrequency(applianceServices);
    
    // Analiza pattern-a kvarova delova
    const partFailurePattern = this.analyzePartFailureRisk(applianceServices);

    // Kombinovani risk score
    const riskScore = Math.min(100, Math.max(0, 
      (ageInfluence * 0.3) + 
      (seasonalRisk * 0.2) + 
      (historicalFrequency * 0.3) + 
      (partFailurePattern * 0.2)
    ));

    const riskLevel = this.determineRiskLevel(riskScore);

    // Predviđanje datuma sledećeg održavanja
    const averageInterval = maintenancePatterns?.averageServiceInterval || 
      this.calculateAverageInterval(applianceServices) || 365;
    
    const adjustedInterval = this.adjustIntervalByRisk(averageInterval, riskScore);
    const predictedMaintenanceDate = new Date(
      lastService.serviceDate.getTime() + (adjustedInterval * 24 * 60 * 60 * 1000)
    );

    // Generiše preporuke na osnovu analize
    const predictedFailures = this.predictLikelyFailures(applianceServices, maintenancePatterns);
    const recommendedActions = this.generateRecommendations(riskLevel, predictedFailures);
    const estimatedCost = this.estimateCost(predictedFailures, applianceServices);

    return {
      riskLevel,
      riskScore: Math.round(riskScore),
      predictedMaintenanceDate,
      predictedFailures,
      recommendedActions,
      estimatedCost,
      confidenceLevel: this.calculatePredictionConfidence(applianceServices.length, daysSinceLastService),
      factors: {
        ageInfluence: Math.round(ageInfluence),
        usagePattern: this.determineUsagePattern(applianceServices),
        seasonalRisk: Math.round(seasonalRisk),
        historicalFrequency: Math.round(historicalFrequency),
        partFailurePattern: Math.round(partFailurePattern)
      }
    };
  }

  /**
   * Generiše AI uvide i čuva ih u bazu
   */
  async processAIAnalysis(
    analysisType: 'predictive_maintenance' | 'failure_analysis' | 'cost_optimization',
    applianceId: number,
    clientId: number,
    inputData: any
  ): Promise<AiAnalysisResults> {
    
    const startTime = Date.now();
    
    try {
      console.log(`[AI ANALYSIS] Pokretam ${analysisType} analizu za uređaj ${applianceId}`);

      let analysisResult;
      let insights: string[] = [];
      let recommendations: string[] = [];

      switch (analysisType) {
        case 'predictive_maintenance':
          analysisResult = await this.runPredictiveMaintenanceAnalysis(applianceId, clientId, inputData);
          insights = this.generateMaintenanceInsights(analysisResult);
          recommendations = analysisResult.recommendedActions;
          break;
          
        case 'failure_analysis':
          analysisResult = await this.runFailureAnalysis(applianceId, inputData);
          insights = this.generateFailureInsights(analysisResult);
          recommendations = this.generateFailureRecommendations(analysisResult);
          break;
          
        case 'cost_optimization':
          analysisResult = await this.runCostOptimizationAnalysis(applianceId, inputData);
          insights = this.generateCostInsights(analysisResult);
          recommendations = this.generateCostRecommendations(analysisResult);
          break;
      }

      const processingTime = Date.now() - startTime;

      return {
        id: 0, // biće dodeljeno od baze
        analysisType,
        applianceId,
        clientId,
        analysisInput: JSON.stringify(inputData),
        analysisOutput: JSON.stringify(analysisResult),
        insights,
        recommendations,
        accuracy: this.calculateAnalysisAccuracy(analysisResult),
        processingTime,
        dataPoints: inputData.serviceHistory?.length || 0,
        modelVersion: "1.0.0",
        isSuccessful: true,
        errorMessage: null,
        createdAt: new Date(),
      };

    } catch (error) {
      console.error(`[AI ANALYSIS] Greška u ${analysisType} analizi:`, error);
      
      return {
        id: 0,
        analysisType,
        applianceId,
        clientId,
        analysisInput: JSON.stringify(inputData),
        analysisOutput: null,
        insights: [],
        recommendations: [],
        accuracy: null,
        processingTime: Date.now() - startTime,
        dataPoints: 0,
        modelVersion: "1.0.0",
        isSuccessful: false,
        errorMessage: error instanceof Error ? error.message : "Nepoznata greška",
        createdAt: new Date(),
      };
    }
  }

  // PRIVATNE HELPER METODE

  private calculateServiceIntervals(services: ServiceAnalysisData[]): number[] {
    if (services.length < 2) return [];
    
    const sortedServices = services.sort((a, b) => a.serviceDate.getTime() - b.serviceDate.getTime());
    const intervals: number[] = [];
    
    for (let i = 1; i < sortedServices.length; i++) {
      const interval = Math.floor(
        (sortedServices[i].serviceDate.getTime() - sortedServices[i-1].serviceDate.getTime()) 
        / (1000 * 60 * 60 * 24)
      );
      intervals.push(interval);
    }
    
    return intervals;
  }

  private analyzeCommonFailures(services: ServiceAnalysisData[]): string[] {
    const failureCount: Record<string, number> = {};
    
    services.forEach(service => {
      service.partsUsed.forEach(part => {
        failureCount[part] = (failureCount[part] || 0) + 1;
      });
    });

    return Object.entries(failureCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([part]) => part);
  }

  private analyzeSeasonalFactors(services: ServiceAnalysisData[]): any {
    const seasonalCounts: Record<string, number> = {
      zima: 0, proleće: 0, leto: 0, jesen: 0
    };

    services.forEach(service => {
      seasonalCounts[service.seasonalFactor]++;
    });

    const total = services.length;
    return Object.fromEntries(
      Object.entries(seasonalCounts).map(([season, count]) => [
        season, 
        total > 0 ? Math.round((count / total) * 100) : 0
      ])
    );
  }

  private analyzeUsagePatterns(services: ServiceAnalysisData[]): any {
    return {
      averageResolutionTime: services.reduce((sum, s) => sum + s.resolutionTime, 0) / services.length || 0,
      complexityScore: services.filter(s => s.resolutionTime > 3).length / services.length * 100 || 0,
      emergencyRate: services.filter(s => s.resolutionTime < 1).length / services.length * 100 || 0
    };
  }

  private calculateConfidenceScore(dataPoints: number): number {
    if (dataPoints === 0) return 10;
    if (dataPoints < 5) return 30;
    if (dataPoints < 10) return 50;
    if (dataPoints < 20) return 70;
    if (dataPoints < 50) return 85;
    return 95;
  }

  private generateBasicPrediction(
    applianceId: number, 
    clientId: number, 
    patterns?: MaintenancePatterns
  ): PredictiveAnalysisResult {
    
    const defaultInterval = patterns?.averageServiceInterval || 365;
    const predictedDate = new Date(Date.now() + defaultInterval * 24 * 60 * 60 * 1000);
    
    return {
      riskLevel: 'medium',
      riskScore: 50,
      predictedMaintenanceDate: predictedDate,
      predictedFailures: patterns?.commonFailurePoints || ['Redovno održavanje'],
      recommendedActions: ['Zakazati pregled uređaja', 'Proveriti osnovne funkcionalnosti'],
      estimatedCost: 300, // EUR
      confidenceLevel: 30,
      factors: {
        ageInfluence: 30,
        usagePattern: 'standardno',
        seasonalRisk: 20,
        historicalFrequency: 40,
        partFailurePattern: 25
      }
    };
  }

  private calculateAgeRiskFactor(ageInMonths: number): number {
    if (ageInMonths < 12) return 10; // Novo, mali rizik
    if (ageInMonths < 36) return 25; // Mlado, umeren rizik
    if (ageInMonths < 60) return 50; // Zrelo, srednji rizik
    if (ageInMonths < 120) return 75; // Staro, visok rizik
    return 90; // Vrlo staro, kritičan rizik
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 12 || month <= 2) return 'zima';
    if (month >= 3 && month <= 5) return 'proleće';
    if (month >= 6 && month <= 8) return 'leto';
    return 'jesen';
  }

  private calculateSeasonalRisk(currentSeason: string, services: ServiceAnalysisData[]): number {
    const seasonServices = services.filter(s => s.seasonalFactor === currentSeason);
    const seasonalRate = seasonServices.length / services.length;
    return seasonalRate * 100;
  }

  private calculateServiceFrequency(services: ServiceAnalysisData[]): number {
    if (services.length < 2) return 30;
    
    const intervals = this.calculateServiceIntervals(services);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Što kraći interval, veći rizik
    if (avgInterval < 90) return 90;
    if (avgInterval < 180) return 70;
    if (avgInterval < 365) return 50;
    return 30;
  }

  private analyzePartFailureRisk(services: ServiceAnalysisData[]): number {
    const recentServices = services.slice(-3); // poslednja 3 servisa
    const criticalParts = ['motor', 'pumpa', 'termosta'];
    
    const criticalFailures = recentServices.filter(service =>
      service.partsUsed.some(part => 
        criticalParts.some(critical => part.toLowerCase().includes(critical))
      )
    );

    return (criticalFailures.length / Math.max(recentServices.length, 1)) * 100;
  }

  private determineRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore < 25) return 'low';
    if (riskScore < 50) return 'medium';
    if (riskScore < 75) return 'high';
    return 'critical';
  }

  private calculateAverageInterval(services: ServiceAnalysisData[]): number | null {
    const intervals = this.calculateServiceIntervals(services);
    return intervals.length > 0 
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
      : null;
  }

  private adjustIntervalByRisk(baseInterval: number, riskScore: number): number {
    const riskFactor = 1 - (riskScore / 200); // Visok rizik = kraći interval
    return Math.max(30, Math.floor(baseInterval * riskFactor)); // minimum 30 dana
  }

  private predictLikelyFailures(
    services: ServiceAnalysisData[], 
    patterns?: MaintenancePatterns
  ): string[] {
    const recentFailures = services.slice(-5).flatMap(s => s.partsUsed);
    const commonFailures = patterns?.commonFailurePoints || [];
    
    // Kombinuje nedavne kvarove sa čestim pattern-ima
    const allFailures = [...recentFailures, ...commonFailures];
    const failureCounts: Record<string, number> = {};
    
    allFailures.forEach(failure => {
      failureCounts[failure] = (failureCounts[failure] || 0) + 1;
    });

    return Object.entries(failureCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([failure]) => failure);
  }

  private generateRecommendations(
    riskLevel: string, 
    predictedFailures: string[]
  ): string[] {
    const recommendations: string[] = [];

    switch (riskLevel) {
      case 'critical':
        recommendations.push('HITNO: Zakazati pregled uređaja u narednih 7 dana');
        recommendations.push('Pripremiti rezervne delove');
        break;
      case 'high':
        recommendations.push('Zakazati pregled u naredne 2 nedelje');
        recommendations.push('Proveriti stanje ključnih komponenti');
        break;
      case 'medium':
        recommendations.push('Zakazati rutinski pregled u narednom mesecu');
        break;
      case 'low':
        recommendations.push('Nastaviti sa redovnim održavanjem');
        break;
    }

    if (predictedFailures.length > 0) {
      recommendations.push(`Posebno obratiti pažnju na: ${predictedFailures.join(', ')}`);
    }

    return recommendations;
  }

  private estimateCost(
    predictedFailures: string[], 
    services: ServiceAnalysisData[]
  ): number {
    if (services.length === 0) return 3000; // default

    const avgCost = services.reduce((sum, s) => sum + s.cost, 0) / services.length;
    const complexityMultiplier = predictedFailures.length > 2 ? 1.5 : 1.2;
    
    return Math.round(avgCost * complexityMultiplier);
  }

  private calculatePredictionConfidence(dataPoints: number, daysSinceLastService: number): number {
    let confidence = this.calculateConfidenceScore(dataPoints);
    
    // Smanji confidence ako je prošlo mnogo vremena od poslednjeg servisa
    if (daysSinceLastService > 365) {
      confidence *= 0.7;
    } else if (daysSinceLastService > 180) {
      confidence *= 0.85;
    }

    return Math.round(Math.max(10, confidence));
  }

  private determineUsagePattern(services: ServiceAnalysisData[]): string {
    const avgResolutionTime = services.reduce((sum, s) => sum + s.resolutionTime, 0) / services.length;
    
    if (avgResolutionTime < 1) return 'intenzivno';
    if (avgResolutionTime < 3) return 'standardno';
    return 'redak';
  }

  // AI Analysis metode
  private async runPredictiveMaintenanceAnalysis(applianceId: number, clientId: number, inputData: any): Promise<any> {
    // Simulacija AI analize - u realnoj implementaciji bi se koristio pravi AI model
    return {
      prediction: 'generated by AI model',
      confidence: 85,
      factors: inputData.serviceHistory?.length || 0
    };
  }

  private async runFailureAnalysis(applianceId: number, inputData: any): Promise<any> {
    return {
      failureType: 'predicted',
      likelihood: 0.7,
      timeframe: '3-6 meseci'
    };
  }

  private async runCostOptimizationAnalysis(applianceId: number, inputData: any): Promise<any> {
    return {
      optimization: 'maintenance scheduling',
      savings: 15,
      recommendations: ['redovno održavanje', 'preventivne mere']
    };
  }

  private generateMaintenanceInsights(result: any): string[] {
    return [
      'AI analiza predviđa potrebu za održavanje na osnovu istorijskih podataka',
      `Confidence level: ${result.confidence}%`,
      'Preporučuje se proaktivno održavanje'
    ];
  }

  private generateFailureInsights(result: any): string[] {
    return [
      `Detektovan mogući kvar tipa: ${result.failureType}`,
      `Verovatnoća: ${(result.likelihood * 100).toFixed(0)}%`,
      `Vremenski okvir: ${result.timeframe}`
    ];
  }

  private generateCostInsights(result: any): string[] {
    return [
      `Optimizacija troškova: ${result.optimization}`,
      `Potencijalna ušteda: ${result.savings}%`,
      'AI preporučuje preventivne mere'
    ];
  }

  private generateFailureRecommendations(result: any): string[] {
    return [
      'Hitno zakazati tehnički pregled',
      'Pripremiti rezervne delove',
      'Razmotriti preventivnu zamenu'
    ];
  }

  private generateCostRecommendations(result: any): string[] {
    return result.recommendations || [];
  }

  private calculateAnalysisAccuracy(result: any): string {
    return result.confidence?.toString() || "75";
  }
}

// Singleton instance
export const aiPredictiveMaintenanceService = new AIPredictiveMaintenanceService();