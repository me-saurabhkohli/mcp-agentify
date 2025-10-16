/**
 * MCP Debug Template
 * Adds debugging capabilities to generated MCP servers
 */

export interface MCPDebugContext {
  tools: Record<string, any>;
  resources: Record<string, any>;
  serverInfo: any;
  capabilities: any;
  currentRequest?: any;
  currentResponse?: any;
}

/**
 * Debug-enabled MCP Server base class
 */
export class DebugMCPServer {
  private debugContext: MCPDebugContext;
  private breakpoints = new Map<string, number[]>();
  private isDebugging = false;
  private debugPort?: number;

  constructor() {
    this.debugContext = {
      tools: {},
      resources: {},
      serverInfo: {},
      capabilities: {},
    };

    // Enable debugging if environment variable is set
    if (process.env.MCP_DEBUG === 'true') {
      this.enableDebugging();
    }
  }

  /**
   * Enable debugging mode
   */
  private enableDebugging(): void {
    this.isDebugging = true;
    this.debugPort = parseInt(process.env.DEBUG_PORT || '9229');

    // Add debug capabilities
    this.setupDebugHandlers();
    
    console.log(`🐛 MCP Debug mode enabled on port ${this.debugPort}`);
  }

  /**
   * Setup debug event handlers
   */
  private setupDebugHandlers(): void {
    // Handle process signals for debugging
    process.on('SIGUSR1', () => {
      console.log('🔍 Debug: Received SIGUSR1 - Debug inspector starting');
    });

    // Global error handler with debug info
    process.on('uncaughtException', (error) => {
      console.error('🚨 Debug: Uncaught Exception', {
        error: error.message,
        stack: error.stack,
        context: this.debugContext
      });
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Debug: Unhandled Rejection', {
        reason,
        promise,
        context: this.debugContext
      });
    });
  }

  /**
   * Debug-enabled tool execution
   */
  protected async executeToolWithDebug(toolName: string, args: any): Promise<any> {
    const startTime = Date.now();
    
    console.log(`🔧 Debug: Executing tool ${toolName}`, {
      args,
      timestamp: new Date().toISOString()
    });

    // Update debug context
    this.debugContext.currentRequest = { toolName, args };

    try {
      // Check for breakpoints
      if (this.hasBreakpoint(toolName)) {
        console.log(`🛑 Debug: Breakpoint hit in tool ${toolName}`);
        this.debugBreakpoint(toolName, args);
      }

      // Execute the tool
      const result = await this.executeTool(toolName, args);
      
      // Update debug context with result
      this.debugContext.currentResponse = result;
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ Debug: Tool ${toolName} completed in ${executionTime}ms`, {
        result: typeof result === 'object' ? JSON.stringify(result, null, 2) : result
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Debug: Tool ${toolName} failed after ${executionTime}ms`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        args
      });
      throw error;
    }
  }

  /**
   * Execute tool (to be implemented by generated server)
   */
  protected async executeTool(toolName: string, args: any): Promise<any> {
    // This will be implemented by the generated MCP server
    throw new Error(`Tool ${toolName} not implemented`);
  }

  /**
   * Check if tool has breakpoint
   */
  private hasBreakpoint(toolName: string): boolean {
    return this.breakpoints.has(toolName);
  }

  /**
   * Handle debug breakpoint
   */
  private debugBreakpoint(toolName: string, args: any): void {
    // In a real implementation, this would integrate with the debug adapter
    // For now, we'll just log detailed information
    console.log(`🔍 Debug Breakpoint: ${toolName}`, {
      tool: toolName,
      arguments: args,
      context: this.debugContext,
      stack: new Error().stack
    });

    // Simulate debugger pause
    if (this.isDebugging) {
      console.log('⏸️  Debug: Execution paused. Use debug console to inspect variables.');
    }
  }

  /**
   * Set breakpoint on tool
   */
  public setBreakpoint(toolName: string, line?: number): void {
    if (!this.breakpoints.has(toolName)) {
      this.breakpoints.set(toolName, []);
    }
    
    const lines = this.breakpoints.get(toolName)!;
    if (line && !lines.includes(line)) {
      lines.push(line);
    }
    
    console.log(`🛑 Debug: Breakpoint set on tool ${toolName}${line ? ` at line ${line}` : ''}`);
  }

  /**
   * Remove breakpoint from tool
   */
  public removeBreakpoint(toolName: string, line?: number): void {
    if (!this.breakpoints.has(toolName)) return;
    
    if (line) {
      const lines = this.breakpoints.get(toolName)!;
      const index = lines.indexOf(line);
      if (index > -1) {
        lines.splice(index, 1);
      }
      if (lines.length === 0) {
        this.breakpoints.delete(toolName);
      }
    } else {
      this.breakpoints.delete(toolName);
    }
    
    console.log(`🔓 Debug: Breakpoint removed from tool ${toolName}${line ? ` at line ${line}` : ''}`);
  }

  /**
   * Get current debug context
   */
  public getDebugContext(): MCPDebugContext {
    return { ...this.debugContext };
  }

  /**
   * Update debug context
   */
  public updateDebugContext(updates: Partial<MCPDebugContext>): void {
    this.debugContext = { ...this.debugContext, ...updates };
  }

  /**
   * Log debug information
   */
  protected debugLog(message: string, data?: any): void {
    if (this.isDebugging) {
      console.log(`🐛 Debug: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  /**
   * Inspect tool definition
   */
  public inspectTool(toolName: string): any {
    const tool = this.debugContext.tools[toolName];
    if (!tool) {
      return { error: `Tool ${toolName} not found` };
    }

    return {
      name: toolName,
      definition: tool,
      breakpoints: this.breakpoints.get(toolName) || [],
      usage: `Call with: ${toolName}(args)`
    };
  }

  /**
   * List all available tools
   */
  public listTools(): string[] {
    return Object.keys(this.debugContext.tools);
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): any {
    return {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      toolCount: Object.keys(this.debugContext.tools).length,
      resourceCount: Object.keys(this.debugContext.resources).length
    };
  }
}

/**
 * Debug utility functions
 */
export const DebugUtils = {
  /**
   * Create debug-friendly error
   */
  createDebugError(message: string, context?: any): Error {
    const error = new Error(message);
    if (context && process.env.MCP_DEBUG === 'true') {
      (error as any).debugContext = context;
    }
    return error;
  },

  /**
   * Format debug output
   */
  formatDebugOutput(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return String(data);
    }
  },

  /**
   * Measure execution time
   */
  measureTime<T>(fn: () => Promise<T>, label: string): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const start = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - start;
        console.log(`⏱️  Debug: ${label} took ${duration}ms`);
        resolve(result);
      } catch (error) {
        const duration = Date.now() - start;
        console.error(`⏱️  Debug: ${label} failed after ${duration}ms`, error);
        reject(error);
      }
    });
  }
};