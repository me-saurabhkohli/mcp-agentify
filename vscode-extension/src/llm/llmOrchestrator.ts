import { ConfigurationManager } from '../config/configurationManager';
import { Logger } from '../utils/logger';

/**
 * LLM Orchestrator for AI-powered features
 * Supports OpenAI integration for intelligent suggestions and analysis
 */
export class LLMOrchestrator {
  private configManager: ConfigurationManager;
  private logger: Logger;
  private openaiClient: any;

  constructor(configManager: ConfigurationManager, logger: Logger) {
    this.configManager = configManager;
    this.logger = logger;
    this.initializeOpenAI();
  }

  /**
   * Check if LLM features are available
   */
  isAvailable(): boolean {
    return this.configManager.isFeatureEnabled('ai') && !!this.openaiClient;
  }

  /**
   * Generate project insights using AI
   */
  async generateProjectInsights(analysis: any): Promise<ProjectInsights> {
    if (!this.isAvailable()) {
      throw new Error('AI features not available. Please configure OpenAI API key.');
    }

    try {
      const prompt = this.buildProjectAnalysisPrompt(analysis);
      const response = await this.callOpenAI(prompt, {
        maxTokens: 1000,
        temperature: 0.3
      });

      return this.parseProjectInsights(response);
    } catch (error) {
      this.logger.error('Failed to generate project insights', error);
      throw error;
    }
  }

  /**
   * Get AI suggestions for code or configuration
   */
  async getSuggestions(text: string, context: SuggestionContext): Promise<AISuggestions> {
    if (!this.isAvailable()) {
      throw new Error('AI features not available. Please configure OpenAI API key.');
    }

    try {
      const prompt = this.buildSuggestionPrompt(text, context);
      const response = await this.callOpenAI(prompt, {
        maxTokens: 800,
        temperature: 0.4
      });

      return this.parseSuggestions(response);
    } catch (error) {
      this.logger.error('Failed to get AI suggestions', error);
      throw error;
    }
  }

  /**
   * Generate code using AI
   */
  async generateCode(request: CodeGenerationRequest): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('AI features not available. Please configure OpenAI API key.');
    }

    try {
      const prompt = this.buildCodeGenerationPrompt(request);
      const response = await this.callOpenAI(prompt, {
        maxTokens: 2000,
        temperature: 0.2
      });

      return this.extractCodeFromResponse(response);
    } catch (error) {
      this.logger.error('Failed to generate code', error);
      throw error;
    }
  }

  /**
   * Analyze errors and suggest fixes
   */
  async analyzeError(error: string, context?: string): Promise<ErrorAnalysis> {
    if (!this.isAvailable()) {
      throw new Error('AI features not available. Please configure OpenAI API key.');
    }

    try {
      const prompt = this.buildErrorAnalysisPrompt(error, context);
      const response = await this.callOpenAI(prompt, {
        maxTokens: 600,
        temperature: 0.3
      });

      return this.parseErrorAnalysis(response);
    } catch (error) {
      this.logger.error('Failed to analyze error', error);
      throw error;
    }
  }

  /**
   * Generate documentation
   */
  async generateDocumentation(code: string, type: 'api' | 'readme' | 'comments'): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('AI features not available. Please configure OpenAI API key.');
    }

    try {
      const prompt = this.buildDocumentationPrompt(code, type);
      const response = await this.callOpenAI(prompt, {
        maxTokens: 1500,
        temperature: 0.2
      });

      return response.trim();
    } catch (error) {
      this.logger.error('Failed to generate documentation', error);
      throw error;
    }
  }

  private initializeOpenAI(): void {
    try {
      const apiKey = this.configManager.get('openaiApiKey', '');
      if (!apiKey) {
        this.logger.debug('OpenAI API key not configured, AI features disabled');
        return;
      }

      // Note: In a real implementation, you would import and initialize the OpenAI client
      // For now, this is a placeholder
      this.openaiClient = {
        apiKey,
        // Mock client for development
        chat: {
          completions: {
            create: async (params: any) => {
              // Mock response - in real implementation, this would call OpenAI
              return {
                choices: [{
                  message: {
                    content: this.getMockResponse(params.messages)
                  }
                }]
              };
            }
          }
        }
      };

      this.logger.info('OpenAI client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI client', error);
      this.openaiClient = null;
    }
  }

  private async callOpenAI(prompt: string, options: {
    maxTokens: number;
    temperature: number;
  }): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert software developer assistant specializing in MCP (Model Context Protocol) and API development.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options.maxTokens,
      temperature: options.temperature
    });

    return response.choices[0].message.content;
  }

  private buildProjectAnalysisPrompt(analysis: any): string {
    return `
Analyze this project structure and provide insights:

Framework: ${analysis.framework || 'Unknown'}
Endpoints: ${analysis.endpoints?.length || 0}
Server Files: ${analysis.serverFiles?.length || 0}
Has Tests: ${analysis.hasTests ? 'Yes' : 'No'}

Endpoints:
${analysis.endpoints?.map((ep: any) => `${ep.method} ${ep.path} - ${ep.handler}`).join('\n') || 'None'}

Please provide:
1. Architecture assessment
2. Recommendations for improvement
3. MCP server generation suggestions
4. Security considerations
5. Testing recommendations

Format as JSON with sections: architecture, recommendations, mcp_suggestions, security, testing.
    `.trim();
  }

  private buildSuggestionPrompt(text: string, context: SuggestionContext): string {
    return `
Context: ${context.context}
Language: ${context.language}
File: ${context.fileName}

Code/Text to analyze:
${text}

Please provide suggestions for:
1. Code improvements
2. Best practices
3. Potential issues
4. MCP-related enhancements

Format as JSON with sections: improvements, best_practices, issues, mcp_enhancements.
    `.trim();
  }

  private buildCodeGenerationPrompt(request: CodeGenerationRequest): string {
    return `
Generate ${request.language} code for: ${request.description}

Requirements:
- Framework: ${request.framework}
- Type: ${request.type}
- Include error handling: ${request.includeErrorHandling ? 'Yes' : 'No'}
- Include tests: ${request.includeTests ? 'Yes' : 'No'}

Additional context: ${request.context || 'None'}

Please generate clean, well-documented code following best practices.
    `.trim();
  }

  private buildErrorAnalysisPrompt(error: string, context?: string): string {
    return `
Analyze this error and provide solutions:

Error:
${error}

Context: ${context || 'None provided'}

Please provide:
1. Root cause analysis
2. Possible solutions
3. Prevention strategies

Format as JSON with sections: cause, solutions, prevention.
    `.trim();
  }

  private buildDocumentationPrompt(code: string, type: 'api' | 'readme' | 'comments'): string {
    const instructions = {
      api: 'Generate comprehensive API documentation with examples',
      readme: 'Generate a detailed README file',
      comments: 'Add detailed comments to the code'
    };

    return `
${instructions[type]} for the following code:

${code}

Please provide clear, professional documentation following best practices.
    `.trim();
  }

  private parseProjectInsights(response: string): ProjectInsights {
    try {
      return JSON.parse(response);
    } catch {
      // Fallback parsing if JSON is malformed
      return {
        architecture: this.extractSection(response, 'architecture') || 'No architecture insights available',
        recommendations: this.extractSectionAsArray(response, 'recommendations') || ['No recommendations available'],
        mcp_suggestions: this.extractSection(response, 'mcp_suggestions') || 'No MCP suggestions available',
        security: this.extractSection(response, 'security') || 'No security insights available',
        testing: this.extractSection(response, 'testing') || 'No testing recommendations available'
      };
    }
  }

  private parseSuggestions(response: string): AISuggestions {
    try {
      return JSON.parse(response);
    } catch {
      return {
        improvements: [response],
        best_practices: [],
        issues: [],
        mcp_enhancements: []
      };
    }
  }

  private parseErrorAnalysis(response: string): ErrorAnalysis {
    try {
      return JSON.parse(response);
    } catch {
      return {
        cause: this.extractSection(response, 'cause') || 'Unknown cause',
        solutions: [response],
        prevention: []
      };
    }
  }

  private extractCodeFromResponse(response: string): string {
    // Extract code blocks from markdown
    const codeBlockMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1];
    }
    return response;
  }

  private extractSection(text: string, section: string): string | null {
    const regex = new RegExp(`${section}[:\\s]*(.*?)(?=\\n\\n|\\n[a-z_]+:|$)`, 'is');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  private extractSectionAsArray(text: string, section: string): string[] | null {
    const sectionText = this.extractSection(text, section);
    if (!sectionText) {
      return null;
    }

    // Try to parse as JSON array first
    try {
      const parsed = JSON.parse(sectionText);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // If not JSON, split by common delimiters
      const lines = sectionText.split(/[\n•\-\*]/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      return lines.length > 0 ? lines : [sectionText];
    }

    return [sectionText];
  }

  private getMockResponse(messages: any[]): string {
    // Mock responses for development
    const mockResponses = {
      project: JSON.stringify({
        architecture: "Well-structured API with clear separation of concerns",
        recommendations: ["Add input validation", "Implement rate limiting", "Add comprehensive logging"],
        mcp_suggestions: "Consider using MCP for tool integration and debugging capabilities",
        security: "Implement authentication and authorization",
        testing: "Add unit tests and integration tests"
      }),
      suggestions: JSON.stringify({
        improvements: ["Consider using async/await", "Add error handling"],
        best_practices: ["Follow naming conventions", "Add type annotations"],
        issues: ["Potential memory leak in loop"],
        mcp_enhancements: ["Add MCP tool integration"]
      }),
      error: JSON.stringify({
        cause: "Network connection timeout",
        solutions: ["Check network connectivity", "Increase timeout values"],
        prevention: ["Implement retry logic", "Add connection monitoring"]
      })
    };

    // Simple keyword matching for mock responses
    const lastMessage = messages[messages.length - 1]?.content || '';
    if (lastMessage.includes('project') || lastMessage.includes('analyze')) {
      return mockResponses.project;
    }
    if (lastMessage.includes('suggestions') || lastMessage.includes('improve')) {
      return mockResponses.suggestions;
    }
    if (lastMessage.includes('error') || lastMessage.includes('analyze')) {
      return mockResponses.error;
    }

    return "I can help you with MCP development, project analysis, and code improvements.";
  }
}

// Interfaces
export interface ProjectInsights {
  architecture: string;
  recommendations: string[];
  mcp_suggestions: string;
  security: string;
  testing: string;
}

export interface AISuggestions {
  improvements: string[];
  best_practices: string[];
  issues: string[];
  mcp_enhancements: string[];
}

export interface SuggestionContext {
  context: string;
  language: string;
  fileName: string;
}

export interface CodeGenerationRequest {
  description: string;
  language: string;
  framework: string;
  type: 'endpoint' | 'middleware' | 'utility' | 'test' | 'mcp-tool';
  includeErrorHandling: boolean;
  includeTests: boolean;
  context?: string;
}

export interface ErrorAnalysis {
  cause: string;
  solutions: string[];
  prevention: string[];
}