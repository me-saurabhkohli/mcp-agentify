import { Logger } from '../utils/logger';
import { LLMOrchestrator } from '../llm/llmOrchestrator';

/**
 * Enhanced project analyzer with AI-powered insights
 */
export class ProjectAnalyzer {
  private logger: Logger;
  private llmOrchestrator: LLMOrchestrator;
  private lastAnalysis: ProjectAnalysis | null = null;

  constructor(logger: Logger, llmOrchestrator: LLMOrchestrator) {
    this.logger = logger;
    this.llmOrchestrator = llmOrchestrator;
  }

  /**
   * Analyze project with enhanced capabilities
   */
  async analyzeProject(
    projectPath: string,
    options?: {
      onProgress?: (message: string, increment: number) => void;
      token?: { isCancellationRequested: boolean };
    }
  ): Promise<ProjectAnalysis> {
    const startTime = Date.now();
    
    try {
      options?.onProgress?.('Detecting project structure...', 10);
      
      if (options?.token?.isCancellationRequested) {
        throw new Error('Analysis cancelled');
      }

      // Basic project detection
      const framework = await this.detectFramework(projectPath);
      options?.onProgress?.('Scanning for endpoints...', 30);

      if (options?.token?.isCancellationRequested) {
        throw new Error('Analysis cancelled');
      }

      // Endpoint detection
      const endpoints = await this.detectEndpoints(projectPath, framework);
      options?.onProgress?.('Analyzing server files...', 50);

      if (options?.token?.isCancellationRequested) {
        throw new Error('Analysis cancelled');
      }

      // Server file analysis
      const serverFiles = await this.findServerFiles(projectPath, framework);
      const configFiles = await this.findConfigFiles(projectPath);
      
      options?.onProgress?.('Checking test configuration...', 70);

      if (options?.token?.isCancellationRequested) {
        throw new Error('Analysis cancelled');
      }

      // Test and package manager detection
      const hasTests = await this.detectTests(projectPath);
      const packageManager = await this.detectPackageManager(projectPath);

      options?.onProgress?.('Finalizing analysis...', 90);

      const analysis: ProjectAnalysis = {
        framework,
        endpoints,
        serverFiles,
        configFiles,
        hasTests,
        packageManager,
        projectPath,
        analyzedAt: new Date().toISOString(),
        metadata: {
          analysisVersion: '2.0',
          duration: Date.now() - startTime,
          endpointCount: endpoints.length,
          fileCount: serverFiles.length
        }
      };

      this.lastAnalysis = analysis;
      options?.onProgress?.('Analysis complete', 100);

      this.logger.info('Project analysis completed', {
        framework,
        endpointCount: endpoints.length,
        duration: Date.now() - startTime
      });

      return analysis;

    } catch (error) {
      this.logger.error('Project analysis failed', error);
      throw error;
    }
  }

  /**
   * Get the last analysis result
   */
  getLastAnalysis(): ProjectAnalysis | null {
    return this.lastAnalysis;
  }

  /**
   * Re-analyze specific aspects of the project
   */
  async reanalyzeEndpoints(projectPath: string): Promise<Endpoint[]> {
    if (!this.lastAnalysis) {
      throw new Error('No previous analysis available. Run full analysis first.');
    }

    const endpoints = await this.detectEndpoints(projectPath, this.lastAnalysis.framework);
    this.lastAnalysis.endpoints = endpoints;
    this.lastAnalysis.analyzedAt = new Date().toISOString();
    
    return endpoints;
  }

  private async detectFramework(projectPath: string): Promise<string> {
    const fs = require('fs');
    const path = require('path');

    try {
      // Check package.json for framework indicators
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

        // Framework detection logic
        if (dependencies.express) return 'Express.js';
        if (dependencies.fastify) return 'Fastify';
        if (dependencies.koa) return 'Koa.js';
        if (dependencies['@nestjs/core']) return 'NestJS';
        if (dependencies.hapi) return 'Hapi.js';
        if (dependencies.next) return 'Next.js';
        if (dependencies.nuxt) return 'Nuxt.js';
        if (dependencies.react && dependencies['react-scripts']) return 'Create React App';
        if (dependencies.vue) return 'Vue.js';
        if (dependencies.angular || dependencies['@angular/core']) return 'Angular';
      }

      // Check for Python frameworks
      const requirementsPath = path.join(projectPath, 'requirements.txt');
      if (fs.existsSync(requirementsPath)) {
        const requirements = fs.readFileSync(requirementsPath, 'utf8');
        if (requirements.includes('flask')) return 'Flask';
        if (requirements.includes('django')) return 'Django';
        if (requirements.includes('fastapi')) return 'FastAPI';
        if (requirements.includes('tornado')) return 'Tornado';
      }

      // Check for Go frameworks
      const goModPath = path.join(projectPath, 'go.mod');
      if (fs.existsSync(goModPath)) {
        const goMod = fs.readFileSync(goModPath, 'utf8');
        if (goMod.includes('gin-gonic/gin')) return 'Gin (Go)';
        if (goMod.includes('gorilla/mux')) return 'Gorilla Mux (Go)';
        if (goMod.includes('echo')) return 'Echo (Go)';
        return 'Go';
      }

      // Check for Java frameworks
      const pomPath = path.join(projectPath, 'pom.xml');
      if (fs.existsSync(pomPath)) {
        const pom = fs.readFileSync(pomPath, 'utf8');
        if (pom.includes('spring-boot')) return 'Spring Boot';
        if (pom.includes('spring-web')) return 'Spring Web';
        return 'Java';
      }

      // Default to Node.js if package.json exists
      if (fs.existsSync(packageJsonPath)) {
        return 'Node.js';
      }

      return 'Unknown';
    } catch (error) {
      this.logger.error('Failed to detect framework', error);
      return 'Unknown';
    }
  }

  private async detectEndpoints(projectPath: string, framework: string): Promise<Endpoint[]> {
    const endpoints: Endpoint[] = [];

    try {
      const patterns = this.getEndpointPatterns(framework);
      const files = await this.findFilesWithPatterns(projectPath, patterns.filePatterns);

      for (const file of files) {
        const fileEndpoints = await this.extractEndpointsFromFile(file, patterns.codePatterns);
        endpoints.push(...fileEndpoints);
      }

      return endpoints;
    } catch (error) {
      this.logger.error('Failed to detect endpoints', error);
      return [];
    }
  }

  private getEndpointPatterns(framework: string): { filePatterns: string[]; codePatterns: RegExp[] } {
    const patterns: Record<string, { filePatterns: string[]; codePatterns: RegExp[] }> = {
      'Express.js': {
        filePatterns: ['**/*.js', '**/*.ts'],
        codePatterns: [
          /app\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/g,
          /router\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/g,
        ]
      },
      'Fastify': {
        filePatterns: ['**/*.js', '**/*.ts'],
        codePatterns: [
          /fastify\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
        ]
      },
      'NestJS': {
        filePatterns: ['**/*.controller.ts', '**/*.controller.js'],
        codePatterns: [
          /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/g,
        ]
      },
      'Flask': {
        filePatterns: ['**/*.py'],
        codePatterns: [
          /@app\.route\s*\(\s*['"`]([^'"`]+)['"`].*?methods\s*=\s*\[['"`](\w+)['"`]\]/g,
        ]
      },
      'Django': {
        filePatterns: ['**/urls.py', '**/views.py'],
        codePatterns: [
          /path\s*\(\s*['"`]([^'"`]+)['"`]/g,
        ]
      },
      'Spring Boot': {
        filePatterns: ['**/*.java'],
        codePatterns: [
          /@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/g,
        ]
      }
    };

    return patterns[framework] || patterns['Express.js'];
  }

  private async findFilesWithPatterns(projectPath: string, patterns: string[]): Promise<string[]> {
    const glob = require('glob');
    const path = require('path');
    const files: string[] = [];

    for (const pattern of patterns) {
      try {
        const matches = glob.sync(pattern, {
          cwd: projectPath,
          ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
        });
        
        files.push(...matches.map((file: string) => path.join(projectPath, file)));
      } catch (error) {
        this.logger.warn(`Failed to match pattern ${pattern}`, error);
      }
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private async extractEndpointsFromFile(filePath: string, patterns: RegExp[]): Promise<Endpoint[]> {
    const fs = require('fs');
    const path = require('path');
    const endpoints: Endpoint[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (const pattern of patterns) {
        pattern.lastIndex = 0; // Reset regex
        let match;

        while ((match = pattern.exec(content)) !== null) {
          const method = match[1]?.toUpperCase() || 'GET';
          const routePath = match[2] || match[1];
          
          // Find line number
          const lineNumber = this.findLineNumber(content, match.index);
          
          // Extract handler information
          const handler = this.extractHandlerName(content, match.index);

          endpoints.push({
            method,
            path: routePath,
            handler,
            file: filePath,
            line: lineNumber,
            description: this.generateEndpointDescription(method, routePath)
          });
        }
      }

      return endpoints;
    } catch (error) {
      this.logger.warn(`Failed to extract endpoints from ${filePath}`, error);
      return [];
    }
  }

  private findLineNumber(content: string, index: number): number {
    const beforeMatch = content.substring(0, index);
    return beforeMatch.split('\n').length;
  }

  private extractHandlerName(content: string, matchIndex: number): string {
    // Simple handler extraction - could be enhanced
    const beforeMatch = content.substring(0, matchIndex);
    const afterMatch = content.substring(matchIndex);
    
    // Look for function names or arrow functions
    const handlerMatch = afterMatch.match(/,\s*(async\s+)?(\w+|function\s+\w+|\([^)]*\)\s*=?>)/);
    if (handlerMatch) {
      return handlerMatch[2].replace(/^function\s+/, '').replace(/\([^)]*\)\s*=>.*/, 'arrow function');
    }

    return 'anonymous';
  }

  private generateEndpointDescription(method: string, path: string): string {
    const descriptions: Record<string, string> = {
      GET: 'Retrieves data',
      POST: 'Creates new resource',
      PUT: 'Updates existing resource',
      PATCH: 'Partially updates resource',
      DELETE: 'Removes resource'
    };

    return `${descriptions[method] || 'Handles request'} for ${path}`;
  }

  private async findServerFiles(projectPath: string, framework: string): Promise<string[]> {
    const commonPatterns = [
      'server.js', 'server.ts', 'app.js', 'app.ts', 'index.js', 'index.ts',
      'main.js', 'main.ts', 'start.js', 'start.ts'
    ];

    const frameworkPatterns: Record<string, string[]> = {
      'Express.js': ['app.js', 'app.ts', 'server.js', 'server.ts'],
      'NestJS': ['main.ts', 'app.module.ts'],
      'Flask': ['app.py', 'main.py', 'server.py'],
      'Django': ['manage.py', 'wsgi.py', 'settings.py'],
      'Spring Boot': ['*Application.java', '*Main.java']
    };

    const patterns = frameworkPatterns[framework] || commonPatterns;
    return this.findFilesWithPatterns(projectPath, patterns);
  }

  private async findConfigFiles(projectPath: string): Promise<string[]> {
    const configPatterns = [
      'package.json', 'requirements.txt', 'pom.xml', 'go.mod',
      'tsconfig.json', 'webpack.config.*', '.env*', 'config.*'
    ];

    return this.findFilesWithPatterns(projectPath, configPatterns);
  }

  private async detectTests(projectPath: string): Promise<boolean> {
    const testPatterns = [
      '**/test/**', '**/tests/**', '**/*.test.js', '**/*.test.ts',
      '**/*.spec.js', '**/*.spec.ts', '**/spec/**'
    ];

    const testFiles = await this.findFilesWithPatterns(projectPath, testPatterns);
    return testFiles.length > 0;
  }

  private async detectPackageManager(projectPath: string): Promise<string> {
    const fs = require('fs');
    const path = require('path');

    if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(projectPath, 'package-lock.json'))) return 'npm';
    if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) return 'pip';
    if (fs.existsSync(path.join(projectPath, 'go.mod'))) return 'go';
    if (fs.existsSync(path.join(projectPath, 'pom.xml'))) return 'maven';
    if (fs.existsSync(path.join(projectPath, 'build.gradle'))) return 'gradle';

    return 'unknown';
  }
}

// Enhanced interfaces
export interface ProjectAnalysis {
  framework: string;
  endpoints: Endpoint[];
  serverFiles: string[];
  configFiles: string[];
  hasTests: boolean;
  packageManager: string;
  projectPath: string;
  analyzedAt: string;
  metadata: {
    analysisVersion: string;
    duration: number;
    endpointCount: number;
    fileCount: number;
  };
}

export interface Endpoint {
  method: string;
  path: string;
  handler: string;
  file: string;
  line: number;
  parameters?: Parameter[];
  description?: string;
}

export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}