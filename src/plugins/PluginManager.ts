import * as fs from 'fs-extra';
import * as path from 'path';
import { AuditLogger } from '../security/AuditLogger';

/**
 * Plugin architecture for extensible MCP Agentify functionality
 * Supports analyzers, generators, templates, and hooks
 */
export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private hooks: Map<string, PluginHook[]> = new Map();
  private auditLogger: AuditLogger;

  private constructor() {
    this.auditLogger = AuditLogger.getInstance();
    this.initializeBuiltinPlugins();
  }

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * Load plugin from file or package
   */
  async loadPlugin(pluginPath: string): Promise<void> {
    try {
      const pluginModule = await import(pluginPath);
      const plugin: Plugin = pluginModule.default || pluginModule;

      if (!this.validatePlugin(plugin)) {
        throw new Error(`Invalid plugin: ${pluginPath}`);
      }

      // Initialize plugin
      if (plugin.initialize) {
        await plugin.initialize();
      }

      this.plugins.set(plugin.name, plugin);

      // Register hooks
      if (plugin.hooks) {
        for (const [hookName, hookFn] of Object.entries(plugin.hooks)) {
          this.registerHook(hookName, hookFn);
        }
      }

      this.auditLogger.logSystemEvent('STARTUP', {
        component: 'PLUGIN_LOADED',
        pluginName: plugin.name,
        version: plugin.version
      });

      console.log(`✅ Loaded plugin: ${plugin.name} v${plugin.version}`);

    } catch (error) {
      this.auditLogger.logError(error as Error, { pluginPath });
      throw new Error(`Failed to load plugin ${pluginPath}: ${error}`);
    }
  }

  /**
   * Load all plugins from directory
   */
  async loadPluginsFromDirectory(directory: string): Promise<void> {
    if (!await fs.pathExists(directory)) {
      return;
    }

    const pluginFiles = await fs.readdir(directory);
    
    for (const file of pluginFiles) {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        const pluginPath = path.join(directory, file);
        try {
          await this.loadPlugin(pluginPath);
        } catch (error) {
          console.warn(`⚠️  Failed to load plugin ${file}:`, error);
        }
      }
    }
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all plugins of specific type
   */
  getPluginsByType(type: PluginType): Plugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.type === type);
  }

  /**
   * Execute hook
   */
  async executeHook(hookName: string, context: any): Promise<any> {
    const hooks = this.hooks.get(hookName) || [];
    let result = context;

    for (const hook of hooks) {
      try {
        result = await hook(result);
      } catch (error) {
        this.auditLogger.logError(error as Error, { hookName });
        console.warn(`⚠️  Hook ${hookName} failed:`, error);
      }
    }

    return result;
  }

  /**
   * Register hook function
   */
  registerHook(hookName: string, hookFn: PluginHook): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName)!.push(hookFn);
  }

  /**
   * Unload plugin
   */
  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return;
    }

    // Call cleanup if available
    if (plugin.cleanup) {
      await plugin.cleanup();
    }

    // Remove hooks
    if (plugin.hooks) {
      for (const hookName of Object.keys(plugin.hooks)) {
        const hooks = this.hooks.get(hookName) || [];
        this.hooks.set(hookName, hooks.filter(h => h !== plugin.hooks![hookName]));
      }
    }

    this.plugins.delete(name);

    this.auditLogger.logSystemEvent('SHUTDOWN', {
      component: 'PLUGIN_UNLOADED',
      pluginName: name
    });
  }

  /**
   * List all loaded plugins
   */
  listPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      type: plugin.type,
      author: plugin.author
    }));
  }

  /**
   * Initialize built-in plugins
   */
  private initializeBuiltinPlugins(): void {
    // Enhanced REST Analyzer Plugin
    const restAnalyzerPlugin: Plugin = {
      name: 'enhanced-rest-analyzer',
      version: '1.0.0',
      description: 'Enhanced REST API analyzer with multi-language support',
      type: 'analyzer',
      author: 'MCP Agentify Team',
      
      async execute(context: any): Promise<any> {
        // Implementation would use the existing RESTAnalyzer
        return context;
      },

      hooks: {
        'before-analysis': async (context: any) => {
          console.log('🔍 Starting enhanced REST analysis...');
          return context;
        },
        'after-analysis': async (context: any) => {
          console.log(`✅ Found ${context.endpoints?.length || 0} endpoints`);
          return context;
        }
      }
    };

    // Template Engine Plugin
    const templateEnginePlugin: Plugin = {
      name: 'handlebars-template-engine',
      version: '1.0.0',
      description: 'Handlebars template engine for code generation',
      type: 'generator',
      author: 'MCP Agentify Team',

      async execute(context: any): Promise<any> {
        // Implementation would use the existing TemplateManager
        return context;
      }
    };

    // Security Enhancement Plugin
    const securityPlugin: Plugin = {
      name: 'enterprise-security',
      version: '1.0.0',
      description: 'Enterprise security features and compliance',
      type: 'enhancer',
      author: 'MCP Agentify Team',

      async execute(context: any): Promise<any> {
        return context;
      },

      hooks: {
        'before-generation': async (context: any) => {
          if (context.config?.security?.enabled) {
            console.log('🔒 Applying security enhancements...');
          }
          return context;
        }
      }
    };

    // Register built-in plugins
    this.plugins.set(restAnalyzerPlugin.name, restAnalyzerPlugin);
    this.plugins.set(templateEnginePlugin.name, templateEnginePlugin);
    this.plugins.set(securityPlugin.name, securityPlugin);

    // Register built-in hooks
    if (restAnalyzerPlugin.hooks) {
      for (const [hookName, hookFn] of Object.entries(restAnalyzerPlugin.hooks)) {
        this.registerHook(hookName, hookFn);
      }
    }
    if (securityPlugin.hooks) {
      for (const [hookName, hookFn] of Object.entries(securityPlugin.hooks)) {
        this.registerHook(hookName, hookFn);
      }
    }
  }

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: any): plugin is Plugin {
    return (
      typeof plugin === 'object' &&
      typeof plugin.name === 'string' &&
      typeof plugin.version === 'string' &&
      typeof plugin.type === 'string' &&
      typeof plugin.execute === 'function'
    );
  }

  /**
   * Create plugin template
   */
  async createPluginTemplate(name: string, type: PluginType, outputPath: string): Promise<void> {
    const template = this.generatePluginTemplate(name, type);
    const pluginPath = path.join(outputPath, `${name}.plugin.ts`);
    
    await fs.ensureDir(outputPath);
    await fs.writeFile(pluginPath, template);
    
    console.log(`✅ Plugin template created: ${pluginPath}`);
  }

  /**
   * Generate plugin template code
   */
  private generatePluginTemplate(name: string, type: PluginType): string {
    return `import { Plugin, PluginType } from '../plugins/PluginManager';

/**
 * ${name} Plugin
 * Description: Your plugin description here
 */
const ${name}Plugin: Plugin = {
  name: '${name}',
  version: '1.0.0',
  description: 'Description of your ${name} plugin',
  type: '${type}' as PluginType,
  author: 'Your Name',

  /**
   * Initialize plugin (optional)
   */
  async initialize(): Promise<void> {
    console.log('Initializing ${name} plugin...');
  },

  /**
   * Main plugin execution
   */
  async execute(context: any): Promise<any> {
    console.log('Executing ${name} plugin...');
    
    // Your plugin logic here
    
    return context;
  },

  /**
   * Plugin hooks (optional)
   */
  hooks: {
    'before-analysis': async (context: any) => {
      console.log('${name}: Before analysis hook');
      return context;
    },
    
    'after-analysis': async (context: any) => {
      console.log('${name}: After analysis hook');
      return context;
    },
    
    'before-generation': async (context: any) => {
      console.log('${name}: Before generation hook');
      return context;
    },
    
    'after-generation': async (context: any) => {
      console.log('${name}: After generation hook');
      return context;
    }
  },

  /**
   * Cleanup plugin (optional)
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up ${name} plugin...');
  }
};

export default ${name}Plugin;
`;
  }
}

// Plugin interfaces and types
export interface Plugin {
  name: string;
  version: string;
  description: string;
  type: PluginType;
  author?: string;
  initialize?(): Promise<void>;
  execute(context: any): Promise<any>;
  hooks?: Record<string, PluginHook>;
  cleanup?(): Promise<void>;
}

export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  type: PluginType;
  author?: string;
}

export type PluginType = 'analyzer' | 'generator' | 'enhancer' | 'transformer' | 'validator';

export type PluginHook = (context: any) => Promise<any>;

// Available hooks
export const PLUGIN_HOOKS = {
  BEFORE_ANALYSIS: 'before-analysis',
  AFTER_ANALYSIS: 'after-analysis',
  BEFORE_GENERATION: 'before-generation',
  AFTER_GENERATION: 'after-generation',
  BEFORE_VALIDATION: 'before-validation',
  AFTER_VALIDATION: 'after-validation',
  ON_ERROR: 'on-error',
  ON_SUCCESS: 'on-success'
} as const;