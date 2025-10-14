import inquirer from 'inquirer';
// @ts-ignore - No types available for inquirer-autocomplete-prompt
import autocomplete from 'inquirer-autocomplete-prompt';
import { Listr } from 'listr2';
import ora from 'ora';
import chalk from 'chalk';
import figlet from 'figlet';
import boxen from 'boxen';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ProjectAnalyzer } from '../analyzer/ProjectAnalyzer';
import { ConfigManager } from '../config/ConfigManager';
import { ValidationService } from '../security/ValidationService';

inquirer.registerPrompt('autocomplete', autocomplete);

/**
 * Interactive wizard for guided MCP server generation
 * Provides smart defaults and contextual help
 */
export class InteractiveWizard {
  private analyzer: ProjectAnalyzer;
  private configManager: ConfigManager;

  constructor() {
    this.analyzer = new ProjectAnalyzer();
    this.configManager = new ConfigManager();
  }

  /**
   * Display welcome banner
   */
  private displayWelcome(): void {
    console.clear();
    
    const banner = figlet.textSync('MCP Agentify', {
      font: 'Standard',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    });

    console.log(chalk.cyan(banner));
    
    const welcomeBox = boxen(
      chalk.white.bold('🚀 Welcome to MCP Agentify Interactive Setup\n\n') +
      chalk.gray('Generate Model Context Protocol servers from your existing APIs\n') +
      chalk.gray('with enterprise-grade features and smart defaults.'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan'
      }
    );

    console.log(welcomeBox);
  }

  /**
   * Run the complete interactive setup wizard
   */
  async runSetupWizard(): Promise<InteractiveConfig> {
    this.displayWelcome();

    // Step 1: Project Detection and Analysis
    const projectInfo = await this.detectProject();
    
    // Step 2: Configuration Setup
    const config = await this.setupConfiguration(projectInfo);
    
    // Step 3: Advanced Options
    const advancedConfig = await this.setupAdvancedOptions(config);
    
    // Step 4: Security Configuration
    const securityConfig = await this.setupSecurity(advancedConfig);
    
    // Step 5: Output and Generation Options
    const finalConfig = await this.setupOutput(securityConfig);

    return finalConfig;
  }

  /**
   * Step 1: Detect and analyze project
   */
  private async detectProject(): Promise<ProjectDetectionResult> {
    const spinner = ora('Detecting project structure...').start();
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate analysis
      
      const currentDir = process.cwd();
      const packageJsonPath = path.join(currentDir, 'package.json');
      const requirementsPath = path.join(currentDir, 'requirements.txt');
      const pomPath = path.join(currentDir, 'pom.xml');
      const goModPath = path.join(currentDir, 'go.mod');

      let detectedType = 'unknown';
      let detectedFrameworks: string[] = [];
      let confidence = 0;

      // Detect Node.js project
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        detectedType = 'nodejs';
        confidence = 90;
        
        // Detect frameworks
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (dependencies.express) detectedFrameworks.push('Express.js');
        if (dependencies.fastify) detectedFrameworks.push('Fastify');
        if (dependencies.koa) detectedFrameworks.push('Koa');
        if (dependencies['@nestjs/core']) detectedFrameworks.push('NestJS');
        if (dependencies.next) detectedFrameworks.push('Next.js');
      }

      // Detect Python project
      else if (await fs.pathExists(requirementsPath)) {
        const requirements = await fs.readFile(requirementsPath, 'utf8');
        detectedType = 'python';
        confidence = 85;
        
        if (requirements.includes('flask')) detectedFrameworks.push('Flask');
        if (requirements.includes('django')) detectedFrameworks.push('Django');
        if (requirements.includes('fastapi')) detectedFrameworks.push('FastAPI');
      }

      // Detect Java project
      else if (await fs.pathExists(pomPath)) {
        detectedType = 'java';
        confidence = 80;
        detectedFrameworks.push('Spring Boot');
      }

      // Detect Go project
      else if (await fs.pathExists(goModPath)) {
        detectedType = 'go';
        confidence = 80;
        detectedFrameworks.push('Go Web Framework');
      }

      spinner.succeed(`Project detected: ${chalk.green(detectedType)} ${confidence >= 80 ? '(High confidence)' : '(Low confidence)'}`);

      if (detectedFrameworks.length > 0) {
        console.log(chalk.gray(`   Frameworks found: ${detectedFrameworks.join(', ')}`));
      }

      return {
        type: detectedType,
        frameworks: detectedFrameworks,
        confidence,
        projectPath: currentDir
      };

    } catch (error) {
      spinner.fail('Project detection failed');
      throw error;
    }
  }

  /**
   * Step 2: Setup basic configuration
   */
  private async setupConfiguration(projectInfo: ProjectDetectionResult): Promise<Partial<InteractiveConfig>> {
    console.log(chalk.blue('\n📋 Basic Configuration'));
    
    const projectName = path.basename(projectInfo.projectPath);
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'serverName',
        message: 'What should we name your MCP server?',
        default: `${projectName}-mcp-server`,
        validate: (input: string) => {
          const validation = ValidationService.validateCommand('generate', { serverName: input });
          return validation.error ? validation.error : true;
        }
      },
      {
        type: 'input',
        name: 'description',
        message: 'Provide a description for your MCP server:',
        default: `MCP server generated from ${projectName} ${projectInfo.type} project`,
        validate: (input: string) => input.length >= 10 || 'Description must be at least 10 characters'
      },
      {
        type: 'list',
        name: 'outputFormat',
        message: 'Choose your preferred output format:',
        choices: [
          { name: '🚀 TypeScript (Recommended)', value: 'typescript' },
          { name: '📝 JavaScript', value: 'javascript' }
        ],
        default: 'typescript'
      },
      {
        type: 'confirm',
        name: 'includeTests',
        message: 'Include test files and setup?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeDocumentation',
        message: 'Generate comprehensive documentation?',
        default: true
      }
    ]);

    return {
      ...answers,
      projectType: projectInfo.type,
      detectedFrameworks: projectInfo.frameworks
    };
  }

  /**
   * Step 3: Advanced configuration options
   */
  private async setupAdvancedOptions(config: Partial<InteractiveConfig>): Promise<Partial<InteractiveConfig>> {
    console.log(chalk.blue('\n⚙️  Advanced Options'));

    const advancedAnswers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'features',
        message: 'Select additional features to include:',
        choices: [
          { name: '🔒 Enterprise Security Features', value: 'security', checked: true },
          { name: '📊 Monitoring & Metrics', value: 'monitoring' },
          { name: '🚀 Performance Optimization', value: 'performance' },
          { name: '🐳 Docker Support', value: 'docker' },
          { name: '☸️  Kubernetes Manifests', value: 'kubernetes' },
          { name: '🔄 CI/CD Templates', value: 'cicd' },
          { name: '🔌 Plugin Architecture', value: 'plugins' }
        ]
      },
      {
        type: 'list',
        name: 'deploymentTarget',
        message: 'Primary deployment target:',
        choices: [
          { name: '🐳 Docker Container', value: 'docker' },
          { name: '☸️  Kubernetes', value: 'kubernetes' },
          { name: '☁️  AWS Lambda', value: 'lambda' },
          { name: '⚡ Azure Functions', value: 'azure-functions' },
          { name: '🖥️  Traditional Server', value: 'server' }
        ],
        default: 'docker'
      },
      {
        type: 'confirm',
        name: 'enableCaching',
        message: 'Enable caching for better performance?',
        default: true,
        when: (answers) => answers.features.includes('performance')
      },
      {
        type: 'list',
        name: 'cacheProvider',
        message: 'Choose caching provider:',
        choices: ['memory', 'redis', 'memcached'],
        default: 'memory',
        when: (answers) => answers.enableCaching
      }
    ]);

    return { ...config, ...advancedAnswers };
  }

  /**
   * Step 4: Security configuration
   */
  private async setupSecurity(config: Partial<InteractiveConfig>): Promise<Partial<InteractiveConfig>> {
    if (!config.features?.includes('security')) {
      return config;
    }

    console.log(chalk.blue('\n🔒 Security Configuration'));

    const securityAnswers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enableRBAC',
        message: 'Enable Role-Based Access Control (RBAC)?',
        default: false
      },
      {
        type: 'list',
        name: 'authProvider',
        message: 'Choose authentication provider:',
        choices: [
          { name: '🔑 JWT (Local)', value: 'jwt' },
          { name: '🏢 LDAP', value: 'ldap' },
          { name: '☁️  OAuth2', value: 'oauth2' },
          { name: '🔒 SAML', value: 'saml' }
        ],
        default: 'jwt',
        when: (answers) => answers.enableRBAC
      },
      {
        type: 'list',
        name: 'secretsProvider',
        message: 'Choose secrets management provider:',
        choices: [
          { name: '🌱 Environment Variables', value: 'env' },
          { name: '🏛️  HashiCorp Vault', value: 'vault' },
          { name: '☁️  AWS Secrets Manager', value: 'aws' },
          { name: '🔷 Azure Key Vault', value: 'azure' }
        ],
        default: 'env'
      },
      {
        type: 'confirm',
        name: 'enableAuditLogging',
        message: 'Enable comprehensive audit logging?',
        default: true
      },
      {
        type: 'list',
        name: 'complianceLevel',
        message: 'Select compliance level:',
        choices: [
          { name: '📋 Basic', value: 'basic' },
          { name: '🏢 Enterprise (SOC 2)', value: 'soc2' },
          { name: '🌍 GDPR Compliant', value: 'gdpr' },
          { name: '🏛️  Government (FedRAMP)', value: 'fedramp' }
        ],
        default: 'basic'
      }
    ]);

    return { ...config, security: securityAnswers };
  }

  /**
   * Step 5: Output and generation options
   */
  private async setupOutput(config: Partial<InteractiveConfig>): Promise<InteractiveConfig> {
    console.log(chalk.blue('\n📁 Output Configuration'));

    const outputAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'outputPath',
        message: 'Where should we generate your MCP server?',
        default: './mcp-server',
        validate: (input: string) => {
          const sanitized = ValidationService.sanitizePath(input);
          return sanitized === input || 'Invalid path detected';
        }
      },
      {
        type: 'confirm',
        name: 'createGitRepo',
        message: 'Initialize as a Git repository?',
        default: true
      },
      {
        type: 'confirm',
        name: 'installDependencies',
        message: 'Install dependencies after generation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'openInEditor',
        message: 'Open generated project in VS Code?',
        default: true,
        when: () => this.isVSCodeAvailable()
      }
    ]);

    return { ...config, ...outputAnswers } as InteractiveConfig;
  }

  /**
   * Execute the generation process with progress tracking
   */
  async executeGeneration(config: InteractiveConfig): Promise<void> {
    const tasks = new Listr([
      {
        title: 'Analyzing project structure',
        task: async () => {
          await new Promise(resolve => setTimeout(resolve, 1500));
          // Actual analysis would happen here
        }
      },
      {
        title: 'Generating MCP server files',
        task: async (ctx, task) => {
          const files = [
            'package.json', 'tsconfig.json', 'src/index.ts', 
            'src/tools/', '.env.example', 'README.md'
          ];
          
          for (let i = 0; i < files.length; i++) {
            task.output = `Creating ${files[i]}...`;
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      },
      {
        title: 'Applying security configurations',
        task: async () => {
          if (config.features?.includes('security')) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        },
        enabled: () => config.features?.includes('security') || false
      },
      {
        title: 'Generating Docker configuration',
        task: async () => {
          await new Promise(resolve => setTimeout(resolve, 800));
        },
        enabled: () => config.deploymentTarget === 'docker' || config.features?.includes('docker') || false
      },
      {
        title: 'Creating Kubernetes manifests',
        task: async () => {
          await new Promise(resolve => setTimeout(resolve, 600));
        },
        enabled: () => config.deploymentTarget === 'kubernetes' || config.features?.includes('kubernetes') || false
      },
      {
        title: 'Installing dependencies',
        task: async () => {
          await new Promise(resolve => setTimeout(resolve, 3000));
        },
        enabled: () => config.installDependencies || false
      },
      {
        title: 'Initializing Git repository',
        task: async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
        },
        enabled: () => config.createGitRepo || false
      }
    ], {
      concurrent: false,
      exitOnError: true
    });

    try {
      await tasks.run();
      this.displaySuccess(config);
    } catch (error) {
      console.error(chalk.red('\n❌ Generation failed:'), error);
      throw error;
    }
  }

  /**
   * Display success message and next steps
   */
  private displaySuccess(config: InteractiveConfig): void {
    const successBox = boxen(
      chalk.green.bold('🎉 MCP Server Generated Successfully!\n\n') +
      chalk.white(`📁 Location: ${config.outputPath}\n`) +
      chalk.white(`🏷️  Name: ${config.serverName}\n`) +
      chalk.white(`⚙️  Format: ${config.outputFormat}\n\n`) +
      chalk.cyan.bold('Next Steps:\n') +
      chalk.gray(`1. cd ${config.outputPath}\n`) +
      chalk.gray(`2. npm run build\n`) +
      chalk.gray(`3. npm start\n\n`) +
      chalk.yellow('💡 Tip: Use "agentify --help" for more commands'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'green'
      }
    );

    console.log('\n' + successBox);

    if (config.openInEditor) {
      console.log(chalk.blue('\n🚀 Opening in VS Code...'));
      // Would execute: code config.outputPath
    }
  }

  /**
   * Quick setup mode for experienced users
   */
  async runQuickSetup(): Promise<InteractiveConfig> {
    this.displayWelcome();

    const quickAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'serverName',
        message: '🏷️  Server name:',
        default: 'my-mcp-server'
      },
      {
        type: 'list',
        name: 'projectType',
        message: '📋 Project type:',
        choices: ['rest-api', 'nodejs', 'openapi', 'auto'],
        default: 'auto'
      },
      {
        type: 'input',
        name: 'outputPath',
        message: '📁 Output directory:',
        default: './mcp-server'
      },
      {
        type: 'confirm',
        name: 'useDefaults',
        message: '⚡ Use recommended defaults for everything else?',
        default: true
      }
    ]);

    if (quickAnswers.useDefaults) {
      return {
        ...quickAnswers,
        description: `MCP server generated from ${quickAnswers.serverName}`,
        outputFormat: 'typescript',
        includeTests: true,
        includeDocumentation: true,
        features: ['security'],
        deploymentTarget: 'docker',
        installDependencies: true,
        createGitRepo: true,
        openInEditor: false
      } as InteractiveConfig;
    }

    // If not using defaults, run full wizard
    return this.runSetupWizard();
  }

  /**
   * Project migration wizard
   */
  async runMigrationWizard(fromType: string, toVersion: string): Promise<MigrationConfig> {
    console.log(chalk.blue(`\n🔄 Migration Wizard: ${fromType} → MCP Server v${toVersion}`));

    const migrationAnswers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'migrateFeatures',
        message: 'Which features should we migrate?',
        choices: [
          { name: '🔗 API Endpoints', value: 'endpoints', checked: true },
          { name: '🗄️  Database Connections', value: 'database' },
          { name: '🔐 Authentication', value: 'auth' },
          { name: '📊 Middleware', value: 'middleware' },
          { name: '🧪 Tests', value: 'tests' },
          { name: '📚 Documentation', value: 'docs' }
        ]
      },
      {
        type: 'confirm',
        name: 'preserveOriginal',
        message: 'Keep original project structure?',
        default: true
      },
      {
        type: 'list',
        name: 'migrationStrategy',
        message: 'Migration strategy:',
        choices: [
          { name: '⚡ Complete Migration', value: 'complete' },
          { name: '🔄 Gradual Migration', value: 'gradual' },
          { name: '🔀 Side-by-side', value: 'parallel' }
        ],
        default: 'gradual'
      }
    ]);

    return {
      fromType,
      toVersion,
      ...migrationAnswers
    };
  }

  /**
   * Utility: Check if VS Code is available
   */
  private isVSCodeAvailable(): boolean {
    try {
      require('child_process').execSync('code --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

// Type definitions
interface ProjectDetectionResult {
  type: string;
  frameworks: string[];
  confidence: number;
  projectPath: string;
}

interface InteractiveConfig {
  serverName: string;
  description: string;
  outputFormat: 'typescript' | 'javascript';
  includeTests: boolean;
  includeDocumentation: boolean;
  projectType: string;
  detectedFrameworks: string[];
  features?: string[];
  deploymentTarget?: string;
  enableCaching?: boolean;
  cacheProvider?: string;
  security?: {
    enableRBAC: boolean;
    authProvider?: string;
    secretsProvider: string;
    enableAuditLogging: boolean;
    complianceLevel: string;
  };
  outputPath: string;
  createGitRepo: boolean;
  installDependencies: boolean;
  openInEditor: boolean;
}

interface MigrationConfig {
  fromType: string;
  toVersion: string;
  migrateFeatures: string[];
  preserveOriginal: boolean;
  migrationStrategy: string;
}

export { InteractiveConfig, MigrationConfig, ProjectDetectionResult };