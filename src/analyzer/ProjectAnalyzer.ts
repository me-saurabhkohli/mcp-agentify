import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { ProjectInfo, EndpointInfo } from '../types';
import { NodeJSAnalyzer } from './NodeJSAnalyzer';
import { OpenAPIAnalyzer } from './OpenAPIAnalyzer';
import { RESTAnalyzer } from './RESTAnalyzer';

export class ProjectAnalyzer {
  private nodeAnalyzer = new NodeJSAnalyzer();
  private openApiAnalyzer = new OpenAPIAnalyzer();
  private restAnalyzer = new RESTAnalyzer();

  async analyze(projectPath: string, type: string = 'auto'): Promise<ProjectInfo> {
    const fullPath = path.resolve(projectPath);
    
    if (!await fs.pathExists(fullPath)) {
      throw new Error(`Project path does not exist: ${fullPath}`);
    }

    const detectedType = type === 'auto' ? await this.detectProjectType(fullPath) : type;
    
    console.log(chalk.cyan(`📁 Analyzing ${detectedType} project at: ${fullPath}`));

    switch (detectedType) {
      case 'openapi':
        return await this.openApiAnalyzer.analyze(fullPath);
      case 'nodejs':
        return await this.nodeAnalyzer.analyze(fullPath);
      case 'rest-api':
        return await this.restAnalyzer.analyze(fullPath);
      default:
        throw new Error(`Unsupported project type: ${detectedType}`);
    }
  }

  private async detectProjectType(projectPath: string): Promise<string> {
    // Check for OpenAPI/Swagger files
    const openApiFiles = await glob('**/{swagger,openapi}.{json,yaml,yml}', {
      cwd: projectPath,
      ignore: ['node_modules/**']
    });
    
    if (openApiFiles.length > 0) {
      return 'openapi';
    }

    // Check for Node.js project
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      return 'nodejs';
    }

    // Check for common REST API patterns
    const apiFiles = await glob('**/{api,routes,controllers}/**/*.{js,ts,py,java}', {
      cwd: projectPath,
      ignore: ['node_modules/**']
    });
    
    if (apiFiles.length > 0) {
      return 'rest-api';
    }

    // Default to nodejs if we find any code files
    const codeFiles = await glob('**/*.{js,ts}', {
      cwd: projectPath,
      ignore: ['node_modules/**']
    });
    
    return codeFiles.length > 0 ? 'nodejs' : 'rest-api';
  }

  printAnalysis(projectInfo: ProjectInfo): void {
    console.log(chalk.bold.blue('📊 Project Analysis Results'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.yellow('Name:'), projectInfo.name);
    console.log(chalk.yellow('Type:'), projectInfo.type);
    console.log(chalk.yellow('Path:'), projectInfo.rootPath);
    
    if (projectInfo.version) {
      console.log(chalk.yellow('Version:'), projectInfo.version);
    }
    
    if (projectInfo.description) {
      console.log(chalk.yellow('Description:'), projectInfo.description);
    }
    
    if (projectInfo.baseUrl) {
      console.log(chalk.yellow('Base URL:'), projectInfo.baseUrl);
    }

    console.log(chalk.yellow('Endpoints:'), projectInfo.endpoints.length);
    
    if (projectInfo.endpoints.length > 0) {
      console.log(chalk.bold.green('\\n🚀 Discovered Endpoints:'));
      projectInfo.endpoints.forEach((endpoint, index) => {
        console.log(chalk.cyan(`${index + 1}. ${endpoint.method.toUpperCase()} ${endpoint.path}`));
        if (endpoint.description) {
          console.log(chalk.gray(`   ${endpoint.description}`));
        }
      });
    }
  }
}