import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import Handlebars from 'handlebars';
import { ProjectInfo, MCPConfig, GenerationOptions } from '../types';
import { TemplateManager } from './TemplateManager';

export class MCPGenerator {
  private templateManager: TemplateManager;

  constructor(private config: MCPConfig) {
    this.templateManager = new TemplateManager();
  }

  async generate(
    projectInfo: ProjectInfo,
    outputPath: string,
    dryRun: boolean = false
  ): Promise<void> {
    const options: GenerationOptions = {
      dryRun,
      outputPath: path.resolve(outputPath)
    };

    console.log(chalk.blue(`🏗️  Generating MCP server for ${projectInfo.name}...`));
    
    if (dryRun) {
      console.log(chalk.yellow('🔍 Dry run mode - no files will be created'));
    }

    // Create output directory structure
    await this.createDirectoryStructure(options);

    // Generate core MCP server files
    await this.generateServerFiles(projectInfo, options);

    // Generate tool implementations
    await this.generateToolFiles(projectInfo, options);

    // Generate configuration files
    await this.generateConfigFiles(projectInfo, options);

    // Generate tests if requested
    if (this.config.includeTests) {
      await this.generateTestFiles(projectInfo, options);
    }

    // Generate documentation if requested
    if (this.config.includeDocumentation) {
      await this.generateDocumentation(projectInfo, options);
    }

    if (!dryRun) {
      console.log(chalk.green(`✅ MCP server generated successfully at: ${outputPath}`));
      console.log(chalk.cyan('📦 Next steps:'));
      console.log(chalk.cyan('  1. cd ' + outputPath));
      console.log(chalk.cyan('  2. npm install'));
      console.log(chalk.cyan('  3. npm run build'));
      console.log(chalk.cyan('  4. npm start'));
    }
  }

  private async createDirectoryStructure(options: GenerationOptions): Promise<void> {
    const dirs = [
      'src',
      'src/tools',
      'src/types',
      'src/utils',
      'dist'
    ];

    if (this.config.includeTests) {
      dirs.push('tests', 'tests/tools');
    }

    if (this.config.includeDocumentation) {
      dirs.push('docs');
    }

    for (const dir of dirs) {
      const dirPath = path.join(options.outputPath, dir);
      if (!options.dryRun) {
        await fs.ensureDir(dirPath);
      } else {
        console.log(chalk.gray(`📁 Would create directory: ${dirPath}`));
      }
    }
  }

  private async generateServerFiles(
    projectInfo: ProjectInfo,
    options: GenerationOptions
  ): Promise<void> {
    // Generate main server file
    const serverTemplate = await this.templateManager.getTemplate('server.ts');
    const serverCode = serverTemplate({
      config: this.config,
      projectInfo,
      endpoints: projectInfo.endpoints
    });

    await this.writeFile(
      path.join(options.outputPath, 'src', 'index.ts'),
      serverCode,
      options
    );

    // Generate package.json
    const packageTemplate = await this.templateManager.getTemplate('package.json');
    const packageJson = packageTemplate({
      config: this.config,
      projectInfo
    });

    await this.writeFile(
      path.join(options.outputPath, 'package.json'),
      packageJson,
      options
    );

    // Generate TypeScript config
    if (this.config.outputFormat === 'typescript') {
      const tsconfigTemplate = await this.templateManager.getTemplate('tsconfig.json');
      const tsconfig = tsconfigTemplate({
        config: this.config
      });

      await this.writeFile(
        path.join(options.outputPath, 'tsconfig.json'),
        tsconfig,
        options
      );
    }
  }

  private async generateToolFiles(
    projectInfo: ProjectInfo,
    options: GenerationOptions
  ): Promise<void> {
    // Filter endpoints based on config
    const filteredEndpoints = projectInfo.endpoints.filter(endpoint => {
      const endpointKey = `${endpoint.method}:${endpoint.path}`;
      return !this.config.excludeEndpoints?.includes(endpointKey);
    });

    for (const endpoint of filteredEndpoints) {
      const toolTemplate = await this.templateManager.getTemplate('tool.ts');
      const toolCode = toolTemplate({
        endpoint,
        projectInfo,
        config: this.config
      });

      const toolName = this.generateToolName(endpoint);
      const toolFile = `${toolName}.ts`;

      await this.writeFile(
        path.join(options.outputPath, 'src', 'tools', toolFile),
        toolCode,
        options
      );
    }

    // Generate tools index file
    const toolsIndexTemplate = await this.templateManager.getTemplate('tools-index.ts');
    const toolsIndexCode = toolsIndexTemplate({
      endpoints: filteredEndpoints,
      config: this.config
    });

    await this.writeFile(
      path.join(options.outputPath, 'src', 'tools', 'index.ts'),
      toolsIndexCode,
      options
    );
  }

  private async generateConfigFiles(
    projectInfo: ProjectInfo,
    options: GenerationOptions
  ): Promise<void> {
    // Generate environment file
    const envContent = this.generateEnvFile(projectInfo);
    await this.writeFile(
      path.join(options.outputPath, '.env.example'),
      envContent,
      options
    );

    // Generate README
    const readmeTemplate = await this.templateManager.getTemplate('README.md');
    const readmeContent = readmeTemplate({
      config: this.config,
      projectInfo,
      endpoints: projectInfo.endpoints
    });

    await this.writeFile(
      path.join(options.outputPath, 'README.md'),
      readmeContent,
      options
    );
  }

  private async generateTestFiles(
    projectInfo: ProjectInfo,
    options: GenerationOptions
  ): Promise<void> {
    // Generate test setup
    const testSetupTemplate = await this.templateManager.getTemplate('test-setup.ts');
    const testSetupCode = testSetupTemplate({
      config: this.config,
      projectInfo
    });

    await this.writeFile(
      path.join(options.outputPath, 'tests', 'setup.ts'),
      testSetupCode,
      options
    );

    // Generate tool tests
    for (const endpoint of projectInfo.endpoints) {
      const testTemplate = await this.templateManager.getTemplate('tool-test.ts');
      const testCode = testTemplate({
        endpoint,
        config: this.config
      });

      const toolName = this.generateToolName(endpoint);
      const testFile = `${toolName}.test.ts`;

      await this.writeFile(
        path.join(options.outputPath, 'tests', 'tools', testFile),
        testCode,
        options
      );
    }
  }

  private async generateDocumentation(
    projectInfo: ProjectInfo,
    options: GenerationOptions
  ): Promise<void> {
    const docsTemplate = await this.templateManager.getTemplate('docs.md');
    const docsContent = docsTemplate({
      config: this.config,
      projectInfo,
      endpoints: projectInfo.endpoints
    });

    await this.writeFile(
      path.join(options.outputPath, 'docs', 'API.md'),
      docsContent,
      options
    );
  }

  private generateToolName(endpoint: any): string {
    // Split path and filter out empty parts
    const pathParts = endpoint.path.split('/').filter((part: string) => part && part !== '');
    // Remove parameter brackets and convert to PascalCase
    const cleanParts = pathParts.map((part: string) => {
      const cleanPart = part.replace(/[{}:]/g, '');
      return cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1).toLowerCase();
    });
    return `${endpoint.method.toLowerCase()}${cleanParts.join('')}`;
  }

  private generateEnvFile(projectInfo: ProjectInfo): string {
    let content = '# Environment Configuration\\n\\n';
    
    if (projectInfo.baseUrl) {
      content += `API_BASE_URL=${projectInfo.baseUrl}\\n`;
    }
    
    content += 'API_KEY=your_api_key_here\\n';
    content += 'PORT=3000\\n';
    content += 'LOG_LEVEL=info\\n';
    
    return content;
  }

  private async writeFile(
    filePath: string,
    content: string,
    options: GenerationOptions
  ): Promise<void> {
    if (options.dryRun) {
      console.log(chalk.gray(`📝 Would create file: ${path.relative(options.outputPath, filePath)}`));
      return;
    }

    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
    console.log(chalk.green(`✓ Created: ${path.relative(options.outputPath, filePath)}`));
  }
}