import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

interface ProjectAnalysis {
  framework: string;
  endpoints: Endpoint[];
  serverFiles: string[];
  configFiles: string[];
  hasTests: boolean;
  packageManager: string;
}

interface Endpoint {
  method: string;
  path: string;
  handler: string;
  file: string;
  line: number;
  parameters?: Parameter[];
  description?: string;
}

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

interface GenerationConfig {
  outputPath: string;
  format: 'typescript' | 'javascript';
  includeTests: boolean;
  includeDocumentation: boolean;
  enableSecurity: boolean;
  plugins: string[];
}

export class MCPAgentifyExtension {
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private statusBar: vscode.StatusBarItem;
  private projectAnalysis: ProjectAnalysis | null = null;
  private webviewPanel: vscode.WebviewPanel | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel('MCP Agentify');
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
    this.setupStatusBar();
    this.registerCommands();
    this.registerProviders();
    this.setupWatchers();
    
    // Auto-analyze if enabled
    if (this.getConfiguration().get('autoAnalyze', true)) {
      this.autoAnalyzeWorkspace();
    }
  }

  private setupStatusBar(): void {
    this.statusBar.text = "$(rocket) MCP Agentify";
    this.statusBar.tooltip = "Click to open MCP Agentify panel";
    this.statusBar.command = 'mcp-agentify.openWebview';
    this.statusBar.show();
  }

  private registerCommands(): void {
    const commands = [
      vscode.commands.registerCommand('mcp-agentify.analyze', () => this.analyzeProject()),
      vscode.commands.registerCommand('mcp-agentify.generate', () => this.generateMCPServer()),
      vscode.commands.registerCommand('mcp-agentify.interactive', () => this.runInteractiveSetup()),
      vscode.commands.registerCommand('mcp-agentify.quickSetup', () => this.quickSetup()),
      vscode.commands.registerCommand('mcp-agentify.openWebview', () => this.openWebview()),
      vscode.commands.registerCommand('mcp-agentify.viewEndpoints', () => this.viewEndpoints()),
      vscode.commands.registerCommand('mcp-agentify.installCLI', () => this.installCLI()),
      vscode.commands.registerCommand('mcp-agentify.showDocumentation', () => this.showDocumentation()),
      vscode.commands.registerCommand('mcp-agentify.openSettings', () => this.openSettings())
    ];

    commands.forEach(command => this.context.subscriptions.push(command));
  }

  private registerProviders(): void {
    // Register tree data providers for sidebar views
    const projectOverviewProvider = new ProjectOverviewProvider(this);
    const endpointsProvider = new EndpointsProvider(this);
    const serversProvider = new GeneratedServersProvider();
    const pluginsProvider = new PluginsProvider();

    vscode.window.registerTreeDataProvider('mcp-agentify.projectOverview', projectOverviewProvider);
    vscode.window.registerTreeDataProvider('mcp-agentify.detectedEndpoints', endpointsProvider);
    vscode.window.registerTreeDataProvider('mcp-agentify.generatedServers', serversProvider);
    vscode.window.registerTreeDataProvider('mcp-agentify.plugins', pluginsProvider);

    // Register task provider
    const taskProvider = new MCPTaskProvider();
    vscode.tasks.registerTaskProvider('mcp-agentify', taskProvider);
  }

  private setupWatchers(): void {
    // Watch for file changes that might affect analysis
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{js,ts,py,java,go,json}');
    
    watcher.onDidChange((uri: vscode.Uri) => {
      if (this.shouldReanalyze(uri)) {
        this.debounceAnalyze();
      }
    });

    watcher.onDidCreate((uri: vscode.Uri) => {
      if (this.shouldReanalyze(uri)) {
        this.debounceAnalyze();
      }
    });

    this.context.subscriptions.push(watcher);
  }

  private shouldReanalyze(uri: vscode.Uri): boolean {
    const fileName = path.basename(uri.fsPath);
    const relevantFiles = ['package.json', 'requirements.txt', 'pom.xml', 'go.mod'];
    return relevantFiles.includes(fileName) || 
           uri.fsPath.includes('routes') || 
           uri.fsPath.includes('controllers') ||
           uri.fsPath.includes('handlers');
  }

  private debounceTimer: NodeJS.Timeout | undefined;
  private debounceAnalyze(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.analyzeProject(false);
    }, 2000);
  }

  private async autoAnalyzeWorkspace(): Promise<void> {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      setTimeout(() => {
        this.analyzeProject(false);
      }, 1000);
    }
  }

  public async analyzeProject(showProgress = true): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found. Please open a project folder.');
      return;
    }

    if (showProgress) {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Analyzing project...",
        cancellable: false
      }, async (progress: vscode.Progress<{ message?: string; increment?: number }>) => {
        await this.performAnalysis(workspaceFolder, progress);
      });
    } else {
      await this.performAnalysis(workspaceFolder);
    }
  }

  private async performAnalysis(
    workspaceFolder: vscode.WorkspaceFolder, 
    progress?: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<void> {
    try {
      this.outputChannel.appendLine('Starting project analysis...');
      progress?.report({ message: 'Detecting project structure...', increment: 20 });

      const cliPath = this.getConfiguration().get('cliPath', 'npx mcp-agentify');
      const result = await this.runCLICommand([cliPath, 'analyze', workspaceFolder.uri.fsPath, '--format', 'json']);

      progress?.report({ message: 'Processing analysis results...', increment: 60 });

      if (result.success && result.output) {
        try {
          this.projectAnalysis = JSON.parse(result.output);
          this.updateStatusBar();
          this.refreshTreeViews();
          
          if (this.webviewPanel) {
            this.updateWebview();
          }

          progress?.report({ message: 'Analysis complete!', increment: 100 });
          this.outputChannel.appendLine('Project analysis completed successfully');
          
          if (this.getConfiguration().get('showNotifications', true)) {
            const endpointCount = this.projectAnalysis?.endpoints?.length || 0;
            vscode.window.showInformationMessage(
              `Analysis complete! Found ${endpointCount} endpoint(s) in ${this.projectAnalysis?.framework || 'unknown'} project.`
            );
          }
        } catch (parseError) {
          this.handleError('Failed to parse analysis results', parseError);
        }
      } else {
        this.handleError('Analysis failed', new Error(result.error || 'Unknown error'));
      }
    } catch (error) {
      this.handleError('Analysis failed', error);
    }
  }

  public async generateMCPServer(): Promise<void> {
    if (!this.projectAnalysis) {
      const analyze = await vscode.window.showWarningMessage(
        'Project not analyzed yet. Would you like to analyze it first?',
        'Analyze', 'Cancel'
      );
      if (analyze === 'Analyze') {
        await this.analyzeProject();
        if (!this.projectAnalysis) return;
      } else {
        return;
      }
    }

    const config = await this.getGenerationConfig();
    if (!config) return;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Generating MCP server...",
      cancellable: false
    }, async (progress: vscode.Progress<{ message?: string; increment?: number }>) => {
      try {
        progress.report({ message: 'Preparing generation...', increment: 10 });

        const cliPath = this.getConfiguration().get('cliPath', 'npx mcp-agentify');
        const workspaceFolder = this.getWorkspaceFolder();
        
        if (!workspaceFolder) {
          throw new Error('No workspace folder found');
        }

        const args = [
          cliPath, 'generate',
          workspaceFolder.uri.fsPath,
          '--output', config.outputPath,
          '--format', config.format
        ];

        if (config.includeTests) args.push('--tests');
        if (config.includeDocumentation) args.push('--docs');
        if (config.enableSecurity) args.push('--security');
        if (config.plugins.length > 0) {
          args.push('--plugins', config.plugins.join(','));
        }

        progress.report({ message: 'Generating server code...', increment: 30 });

        const result = await this.runCLICommand(args);

        progress.report({ message: 'Finalizing...', increment: 80 });

        if (result.success) {
          progress.report({ message: 'Generation complete!', increment: 100 });
          
          const openFolder = await vscode.window.showInformationMessage(
            `MCP server generated successfully in ${config.outputPath}!`,
            'Open Folder', 'View Files'
          );

          if (openFolder === 'Open Folder') {
            const uri = vscode.Uri.file(path.resolve(workspaceFolder.uri.fsPath, config.outputPath));
            await vscode.commands.executeCommand('vscode.openFolder', uri);
          } else if (openFolder === 'View Files') {
            const uri = vscode.Uri.file(path.resolve(workspaceFolder.uri.fsPath, config.outputPath));
            await vscode.commands.executeCommand('revealFileInOS', uri);
          }

          this.refreshTreeViews();
        } else {
          throw new Error(result.error || 'Generation failed');
        }
      } catch (error) {
        this.handleError('Generation failed', error);
      }
    });
  }

  public async runInteractiveSetup(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found. Please open a project folder.');
      return;
    }

    const terminal = vscode.window.createTerminal('MCP Agentify Interactive');
    const cliPath = this.getConfiguration().get('cliPath', 'npx mcp-agentify');
    
    terminal.sendText(`cd "${workspaceFolder.uri.fsPath}"`);
    terminal.sendText(`${cliPath} interactive`);
    terminal.show();
  }

  public async quickSetup(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found. Please open a project folder.');
      return;
    }

    const outputPath = await vscode.window.showInputBox({
      prompt: 'Enter output directory for MCP server',
      value: this.getConfiguration().get('outputDirectory', './mcp-server'),
      validateInput: (value) => {
        if (!value || value.trim() === '') {
          return 'Output directory is required';
        }
        return null;
      }
    });

    if (!outputPath) return;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Quick setup in progress...",
      cancellable: false
    }, async (progress: vscode.Progress<{ message?: string; increment?: number }>) => {
      try {
        progress.report({ message: 'Analyzing project...', increment: 25 });
        await this.performAnalysis(workspaceFolder);

        progress.report({ message: 'Generating MCP server...', increment: 50 });
        
        const cliPath = this.getConfiguration().get('cliPath', 'npx mcp-agentify');
        const result = await this.runCLICommand([
          cliPath, 'generate',
          workspaceFolder.uri.fsPath,
          '--output', outputPath,
          '--format', this.getConfiguration().get('preferredFormat', 'typescript'),
          '--tests', '--docs'
        ]);

        progress.report({ message: 'Setup complete!', increment: 100 });

        if (result.success) {
          vscode.window.showInformationMessage(
            `Quick setup complete! MCP server generated in ${outputPath}`,
            'Open Folder'
          ).then((selection: string | undefined) => {
            if (selection === 'Open Folder') {
              const uri = vscode.Uri.file(path.resolve(workspaceFolder.uri.fsPath, outputPath));
              vscode.commands.executeCommand('vscode.openFolder', uri);
            }
          });
        } else {
          throw new Error(result.error || 'Quick setup failed');
        }
      } catch (error) {
        this.handleError('Quick setup failed', error);
      }
    });
  }

  public openWebview(): void {
    if (this.webviewPanel) {
      this.webviewPanel.reveal();
      return;
    }

    this.webviewPanel = vscode.window.createWebviewPanel(
      'mcpAgentify',
      'MCP Agentify',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri]
      }
    );

    this.updateWebview();

    this.webviewPanel.onDidDispose(() => {
      this.webviewPanel = undefined;
    });

    this.webviewPanel.webview.onDidReceiveMessage(
      (message: any) => this.handleWebviewMessage(message),
      undefined,
      this.context.subscriptions
    );
  }

  private updateWebview(): void {
    if (!this.webviewPanel) return;

    this.webviewPanel.webview.html = this.getWebviewContent();
  }

  private getWebviewContent(): string {
    const analysis = this.projectAnalysis;
    const endpointsHtml = analysis?.endpoints?.map(endpoint => `
      <div class="endpoint">
        <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
        <span class="path">${endpoint.path}</span>
        <div class="details">
          <small>${endpoint.file}:${endpoint.line}</small>
          ${endpoint.description ? `<p>${endpoint.description}</p>` : ''}
        </div>
      </div>
    `).join('') || '<p>No endpoints detected. Run analysis first.</p>';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MCP Agentify</title>
        <style>
          body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); }
          .header { display: flex; align-items: center; margin-bottom: 20px; }
          .header h1 { margin: 0 0 0 10px; }
          .icon { font-size: 24px; }
          .section { margin-bottom: 30px; }
          .section h2 { border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 10px; }
          .stats { display: flex; gap: 20px; margin-bottom: 20px; }
          .stat { background: var(--vscode-editor-background); padding: 15px; border-radius: 5px; flex: 1; }
          .stat h3 { margin: 0 0 5px 0; font-size: 24px; color: var(--vscode-charts-blue); }
          .stat p { margin: 0; opacity: 0.8; }
          .endpoint { background: var(--vscode-editor-background); margin: 10px 0; padding: 15px; border-radius: 5px; }
          .method { padding: 4px 8px; border-radius: 3px; color: white; font-weight: bold; margin-right: 10px; }
          .method.get { background: #61affe; }
          .method.post { background: #49cc90; }
          .method.put { background: #fca130; }
          .method.delete { background: #f93e3e; }
          .method.patch { background: #50e3c2; }
          .path { font-family: monospace; font-weight: bold; }
          .details { margin-top: 10px; opacity: 0.8; }
          .actions { display: flex; gap: 10px; margin-top: 20px; }
          .btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 10px 20px; border-radius: 3px; cursor: pointer; }
          .btn:hover { background: var(--vscode-button-hoverBackground); }
          .btn-secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
          .no-data { text-align: center; opacity: 0.6; padding: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <span class="icon">🚀</span>
          <h1>MCP Agentify</h1>
        </div>

        <div class="section">
          <h2>Project Overview</h2>
          ${analysis ? `
            <div class="stats">
              <div class="stat">
                <h3>${analysis.endpoints.length}</h3>
                <p>Endpoints Detected</p>
              </div>
              <div class="stat">
                <h3>${analysis.framework}</h3>
                <p>Framework</p>
              </div>
              <div class="stat">
                <h3>${analysis.serverFiles.length}</h3>
                <p>Server Files</p>
              </div>
              <div class="stat">
                <h3>${analysis.hasTests ? 'Yes' : 'No'}</h3>
                <p>Has Tests</p>
              </div>
            </div>
          ` : `
            <div class="no-data">
              <p>Project not analyzed yet</p>
              <button class="btn" onclick="analyze()">Analyze Project</button>
            </div>
          `}
        </div>

        <div class="section">
          <h2>Detected Endpoints</h2>
          ${endpointsHtml}
        </div>

        <div class="actions">
          <button class="btn" onclick="analyze()">Analyze Project</button>
          <button class="btn" onclick="generate()">Generate MCP Server</button>
          <button class="btn btn-secondary" onclick="interactive()">Interactive Setup</button>
          <button class="btn btn-secondary" onclick="quickSetup()">Quick Setup</button>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          
          function analyze() {
            vscode.postMessage({ command: 'analyze' });
          }
          
          function generate() {
            vscode.postMessage({ command: 'generate' });
          }
          
          function interactive() {
            vscode.postMessage({ command: 'interactive' });
          }
          
          function quickSetup() {
            vscode.postMessage({ command: 'quickSetup' });
          }
        </script>
      </body>
      </html>
    `;
  }

  private async handleWebviewMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'analyze':
        await this.analyzeProject();
        break;
      case 'generate':
        await this.generateMCPServer();
        break;
      case 'interactive':
        await this.runInteractiveSetup();
        break;
      case 'quickSetup':
        await this.quickSetup();
        break;
    }
  }

  public viewEndpoints(): void {
    if (!this.projectAnalysis || !this.projectAnalysis.endpoints.length) {
      vscode.window.showInformationMessage('No endpoints detected. Run analysis first.');
      return;
    }

    const quickPick = vscode.window.createQuickPick();
    quickPick.title = 'Detected API Endpoints';
    quickPick.items = this.projectAnalysis.endpoints.map(endpoint => ({
      label: `${endpoint.method} ${endpoint.path}`,
      description: endpoint.handler,
      detail: `${endpoint.file}:${endpoint.line}`,
      endpoint: endpoint
    }));

    quickPick.onDidChangeSelection((selection: readonly vscode.QuickPickItem[]) => {
      if (selection[0]) {
        const item = selection[0] as any;
        const uri = vscode.Uri.file(item.endpoint.file);
        vscode.window.showTextDocument(uri).then((editor: vscode.TextEditor) => {
          const position = new vscode.Position(item.endpoint.line - 1, 0);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        });
        quickPick.hide();
      }
    });

    quickPick.show();
  }

  public async installCLI(): Promise<void> {
    const choice = await vscode.window.showQuickPick([
      { label: 'Install globally with npm', value: 'npm-global' },
      { label: 'Install globally with yarn', value: 'yarn-global' },
      { label: 'Use with npx (no installation)', value: 'npx' },
      { label: 'Check current version', value: 'check' }
    ], { placeHolder: 'How would you like to install/use MCP Agentify CLI?' });

    if (!choice) return;

    const terminal = vscode.window.createTerminal('MCP Agentify Install');

    switch (choice.value) {
      case 'npm-global':
        terminal.sendText('npm install -g mcp-agentify');
        break;
      case 'yarn-global':
        terminal.sendText('yarn global add mcp-agentify');
        break;
      case 'npx':
        vscode.window.showInformationMessage('You can use MCP Agentify with: npx mcp-agentify');
        return;
      case 'check':
        terminal.sendText('npx mcp-agentify --version');
        break;
    }

    terminal.show();
  }

  public showDocumentation(): void {
    vscode.env.openExternal(vscode.Uri.parse('https://github.com/me-saurabhkohli/agentify#readme'));
  }

  public openSettings(): void {
    vscode.commands.executeCommand('workbench.action.openSettings', 'mcp-agentify');
  }

  private async getGenerationConfig(): Promise<GenerationConfig | null> {
    const config = this.getConfiguration();
    
    const outputPath = await vscode.window.showInputBox({
      prompt: 'Enter output directory for MCP server',
      value: config.get('outputDirectory', './mcp-server'),
      validateInput: (value: string) => {
        if (!value || value.trim() === '') {
          return 'Output directory is required';
        }
        return null;
      }
    });

    if (!outputPath) return null;

    const formatOptions = [
      { label: 'TypeScript', value: 'typescript' as const },
      { label: 'JavaScript', value: 'javascript' as const }
    ];

    const format = await vscode.window.showQuickPick(formatOptions, { 
      placeHolder: 'Choose output format'
    });

    if (!format) return null;

    const options = await vscode.window.showQuickPick([
      { label: 'Include tests', picked: config.get('includeTests', true) },
      { label: 'Include documentation', picked: config.get('includeDocumentation', true) },
      { label: 'Enable security features', picked: config.get('enableSecurity', false) }
    ], { 
      placeHolder: 'Select options',
      canPickMany: true
    });

    return {
      outputPath,
      format: format.value,
      includeTests: options?.some((o: vscode.QuickPickItem) => o.label === 'Include tests') ?? true,
      includeDocumentation: options?.some((o: vscode.QuickPickItem) => o.label === 'Include documentation') ?? true,
      enableSecurity: options?.some((o: vscode.QuickPickItem) => o.label === 'Enable security features') ?? false,
      plugins: [] // TODO: Add plugin selection
    };
  }

  private async runCLICommand(args: string[]): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      const childProcess = spawn(args[0], args.slice(1), {
        cwd: this.getWorkspaceFolder()?.uri.fsPath,
        shell: true
      });

      let output = '';
      let error = '';

      childProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        error += data.toString();
      });

      childProcess.on('close', (code: number | null) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          error: error.trim()
        });
      });

      childProcess.on('error', (err: Error) => {
        resolve({
          success: false,
          error: err.message
        });
      });
    });
  }

  private getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    return vscode.workspace.workspaceFolders?.[0];
  }

  private getConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('mcp-agentify');
  }

  private updateStatusBar(): void {
    if (this.projectAnalysis) {
      const endpointCount = this.projectAnalysis.endpoints.length;
      this.statusBar.text = `$(rocket) MCP Agentify (${endpointCount} endpoints)`;
    } else {
      this.statusBar.text = "$(rocket) MCP Agentify";
    }
  }

  private refreshTreeViews(): void {
    vscode.commands.executeCommand('mcp-agentify.projectOverview.refresh');
    vscode.commands.executeCommand('mcp-agentify.detectedEndpoints.refresh');
    vscode.commands.executeCommand('mcp-agentify.generatedServers.refresh');
  }

  private handleError(message: string, error: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.outputChannel.appendLine(`ERROR: ${message} - ${errorMessage}`);
    
    if (this.getConfiguration().get('debugMode', false)) {
      this.outputChannel.appendLine(`Stack trace: ${error instanceof Error ? error.stack : 'N/A'}`);
    }

    vscode.window.showErrorMessage(`${message}: ${errorMessage}`);
  }

  public getProjectAnalysis(): ProjectAnalysis | null {
    return this.projectAnalysis;
  }

  public dispose(): void {
    this.outputChannel.dispose();
    this.statusBar.dispose();
    this.webviewPanel?.dispose();
  }
}

// Tree Data Providers
class ProjectOverviewProvider implements vscode.TreeDataProvider<ProjectOverviewItem> {
  constructor(private extension: MCPAgentifyExtension) {}

  getTreeItem(element: ProjectOverviewItem): vscode.TreeItem {
    return element;
  }

  getChildren(): ProjectOverviewItem[] {
    const analysis = this.extension.getProjectAnalysis();
    if (!analysis) {
      return [new ProjectOverviewItem('No analysis available', 'Click to analyze project', 'info')];
    }

    return [
      new ProjectOverviewItem(`Framework: ${analysis.framework}`, '', 'folder'),
      new ProjectOverviewItem(`Endpoints: ${analysis.endpoints.length}`, '', 'list-unordered'),
      new ProjectOverviewItem(`Server Files: ${analysis.serverFiles.length}`, '', 'file-code'),
      new ProjectOverviewItem(`Has Tests: ${analysis.hasTests ? 'Yes' : 'No'}`, '', 'beaker'),
      new ProjectOverviewItem(`Package Manager: ${analysis.packageManager}`, '', 'package')
    ];
  }
}

class ProjectOverviewItem extends vscode.TreeItem {
  public iconPath: vscode.ThemeIcon;

  constructor(
    public readonly label: string,
    public readonly tooltip: string,
    iconName: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = tooltip;
    this.iconPath = new vscode.ThemeIcon(iconName);
  }
}

class EndpointsProvider implements vscode.TreeDataProvider<EndpointItem> {
  constructor(private extension: MCPAgentifyExtension) {}

  getTreeItem(element: EndpointItem): vscode.TreeItem {
    return element;
  }

  getChildren(): EndpointItem[] {
    const analysis = this.extension.getProjectAnalysis();
    if (!analysis?.endpoints) return [];

    return analysis.endpoints.map(endpoint => new EndpointItem(endpoint));
  }
}

class EndpointItem extends vscode.TreeItem {
  public description: string;
  public tooltip: string;
  public iconPath: vscode.ThemeIcon;
  public command: vscode.Command;

  constructor(public readonly endpoint: Endpoint) {
    super(`${endpoint.method} ${endpoint.path}`, vscode.TreeItemCollapsibleState.None);
    this.description = endpoint.handler;
    this.tooltip = `${endpoint.file}:${endpoint.line}`;
    this.command = {
      command: 'vscode.open',
      title: 'Open',
      arguments: [vscode.Uri.file(endpoint.file), { selection: new vscode.Range(endpoint.line - 1, 0, endpoint.line - 1, 0) }]
    };
    
    const methodColors: { [key: string]: string } = {
      'GET': 'testing-passed-icon',
      'POST': 'add',
      'PUT': 'edit',
      'DELETE': 'trash',
      'PATCH': 'diff-modified'
    };
    
    this.iconPath = new vscode.ThemeIcon(methodColors[endpoint.method] || 'circle-outline');
  }
}

class GeneratedServersProvider implements vscode.TreeDataProvider<GeneratedServerItem> {
  getTreeItem(element: GeneratedServerItem): vscode.TreeItem {
    return element;
  }

  getChildren(): GeneratedServerItem[] {
    // TODO: Scan for generated MCP servers
    return [];
  }
}

class GeneratedServerItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly path: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = path;
    this.iconPath = new vscode.ThemeIcon('server');
  }
}

class PluginsProvider implements vscode.TreeDataProvider<PluginItem> {
  getTreeItem(element: PluginItem): vscode.TreeItem {
    return element;
  }

  getChildren(): PluginItem[] {
    return [
      new PluginItem('REST API Analyzer', 'Analyzes REST API endpoints', true),
      new PluginItem('Template Engine', 'Generates code from templates', true),
      new PluginItem('Security Plugin', 'Adds security features', false),
      new PluginItem('Documentation Generator', 'Generates API documentation', true)
    ];
  }
}

class PluginItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly enabled: boolean
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.tooltip = `${description} (${enabled ? 'Enabled' : 'Disabled'})`;
    this.iconPath = new vscode.ThemeIcon(enabled ? 'extensions' : 'extensions-outline');
  }
}

class MCPTaskProvider implements vscode.TaskProvider {
  provideTasks(): vscode.Task[] {
    return [
      new vscode.Task(
        { type: 'mcp-agentify', command: 'analyze' },
        vscode.TaskScope.Workspace,
        'Analyze Project',
        'mcp-agentify',
        new vscode.ShellExecution('npx mcp-agentify analyze .')
      ),
      new vscode.Task(
        { type: 'mcp-agentify', command: 'generate' },
        vscode.TaskScope.Workspace,
        'Generate MCP Server',
        'mcp-agentify',
        new vscode.ShellExecution('npx mcp-agentify generate .')
      )
    ];
  }

  resolveTask(task: vscode.Task): vscode.Task | undefined {
    return task;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const extension = new MCPAgentifyExtension(context);
  context.subscriptions.push(extension);
}

export function deactivate(): void {
  // Cleanup if needed
}