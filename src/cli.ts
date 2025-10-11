#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { MCPGenerator } from './generator/MCPGenerator';
import { ProjectAnalyzer } from './analyzer/ProjectAnalyzer';
import { ConfigManager } from './config/ConfigManager';

const program = new Command();

program
  .name('agentify')
  .description('CLI tool to generate Model Context Protocol (MCP) servers from existing REST APIs or Node.js endpoints')
  .version('1.0.0');

program
  .command('generate')
  .alias('gen')
  .description('Generate MCP server from existing project')
  .option('-p, --project <path>', 'Path to the project directory', '.')
  .option('-o, --output <path>', 'Output directory for generated MCP server', './mcp-server')
  .option('-t, --type <type>', 'Project type (rest-api, nodejs, openapi)', 'auto')
  .option('-c, --config <path>', 'Configuration file path')
  .option('--dry-run', 'Show what would be generated without creating files')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Starting MCP server generation...'));
      
      const configManager = new ConfigManager();
      const config = await configManager.loadConfig(options.config);
      
      const analyzer = new ProjectAnalyzer();
      const projectInfo = await analyzer.analyze(options.project, options.type);
      
      const generator = new MCPGenerator(config);
      await generator.generate(projectInfo, options.output, options.dryRun);
      
      console.log(chalk.green('✅ MCP server generated successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Error generating MCP server:'), error);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze existing project for MCP generation')
  .option('-p, --project <path>', 'Path to the project directory', '.')
  .option('-t, --type <type>', 'Project type (rest-api, nodejs, openapi)', 'auto')
  .option('--json', 'Output analysis results as JSON')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Analyzing project...'));
      
      const analyzer = new ProjectAnalyzer();
      const projectInfo = await analyzer.analyze(options.project, options.type);
      
      if (options.json) {
        console.log(JSON.stringify(projectInfo, null, 2));
      } else {
        analyzer.printAnalysis(projectInfo);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error analyzing project:'), error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize Agentify MCP generator configuration')
  .option('-o, --output <path>', 'Configuration file output path', './agentify.config.json')
  .action(async (options) => {
    try {
      console.log(chalk.blue('⚙️  Initializing configuration...'));
      
      const configManager = new ConfigManager();
      await configManager.init(options.output);
      
      console.log(chalk.green(`✅ Configuration initialized at ${options.output}`));
    } catch (error) {
      console.error(chalk.red('❌ Error initializing configuration:'), error);
      process.exit(1);
    }
  });

program.parse();