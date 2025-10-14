import updateNotifier from 'update-notifier';
import chalk from 'chalk';
import boxen from 'boxen';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Update management service for MCP Agentify
 * Handles version checking, notifications, and automatic updates
 */
export class UpdateManager {
  private static instance: UpdateManager;
  private packageInfo: any;
  private notifier: any;

  private constructor() {
    this.loadPackageInfo();
    this.initializeNotifier();
  }

  static getInstance(): UpdateManager {
    if (!UpdateManager.instance) {
      UpdateManager.instance = new UpdateManager();
    }
    return UpdateManager.instance;
  }

  /**
   * Load package information
   */
  private async loadPackageInfo(): Promise<void> {
    try {
      const packagePath = path.join(__dirname, '../../package.json');
      this.packageInfo = await fs.readJson(packagePath);
    } catch (error) {
      console.warn('Could not load package.json for update checking');
      this.packageInfo = { name: 'mcp-agentify', version: '1.0.0' };
    }
  }

  /**
   * Initialize update notifier
   */
  private initializeNotifier(): void {
    this.notifier = updateNotifier({
      pkg: this.packageInfo,
      updateCheckInterval: 1000 * 60 * 60 * 24, // Check daily
      shouldNotifyInNpmScript: false
    });
  }

  /**
   * Check for updates and show notification
   */
  async checkForUpdates(options: UpdateCheckOptions = {}): Promise<UpdateInfo | null> {
    const { silent = false, force = false } = options;

    try {
      if (force) {
        await this.notifier.fetchInfo();
      }

      const updateInfo = this.notifier.update;
      
      if (updateInfo) {
        const info: UpdateInfo = {
          current: updateInfo.current,
          latest: updateInfo.latest,
          type: updateInfo.type,
          name: this.packageInfo.name,
          updateAvailable: true
        };

        if (!silent) {
          this.displayUpdateNotification(info);
        }

        return info;
      }

      return null;
    } catch (error) {
      if (!silent) {
        console.warn(chalk.yellow('⚠️  Could not check for updates:'), error);
      }
      return null;
    }
  }

  /**
   * Display update notification
   */
  private displayUpdateNotification(updateInfo: UpdateInfo): void {
    const isImportant = updateInfo.type === 'major';
    const borderColor = isImportant ? 'red' : 'yellow';
    const icon = isImportant ? '🚨' : '💡';

    const message = [
      `${icon} Update available: ${chalk.dim(updateInfo.name)}`,
      `${chalk.red(updateInfo.current)} → ${chalk.green(updateInfo.latest)}`,
      '',
      chalk.cyan('Run the following to update:'),
      `${chalk.gray('npm install -g')} ${chalk.white(updateInfo.name)}`,
      '',
      chalk.gray('Or use npx for latest:'),
      `${chalk.gray('npx')} ${chalk.white(updateInfo.name)}@latest`
    ].join('\n');

    const notification = boxen(message, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: borderColor as any,
      align: 'center'
    });

    console.log(notification);

    // Show changelog if available
    if (updateInfo.type === 'major') {
      console.log(chalk.yellow('\n📋 Major update available! Check the changelog for breaking changes.'));
      console.log(chalk.gray(`   https://github.com/me-saurabhkohli/agentify/releases/tag/v${updateInfo.latest}`));
    }
  }

  /**
   * Get current version
   */
  getCurrentVersion(): string {
    return this.packageInfo?.version || '1.0.0';
  }

  /**
   * Get latest version from registry
   */
  async getLatestVersion(): Promise<string | null> {
    try {
      const response = await fetch(`https://registry.npmjs.org/${this.packageInfo.name}/latest`);
      const data = await response.json();
      return data.version;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if update is available
   */
  async isUpdateAvailable(): Promise<boolean> {
    const updateInfo = await this.checkForUpdates({ silent: true });
    return updateInfo?.updateAvailable || false;
  }

  /**
   * Get update notification message for CLI
   */
  getUpdateMessage(): string | null {
    const updateInfo = this.notifier.update;
    
    if (updateInfo) {
      return chalk.yellow(
        `💡 Update available: ${updateInfo.current} → ${updateInfo.latest}\n` +
        `   Run: npm install -g ${this.packageInfo.name}`
      );
    }
    
    return null;
  }

  /**
   * Force check for updates
   */
  async forceUpdateCheck(): Promise<UpdateInfo | null> {
    return this.checkForUpdates({ force: true });
  }

  /**
   * Disable update notifications
   */
  disableNotifications(): void {
    process.env.NO_UPDATE_NOTIFIER = '1';
  }

  /**
   * Enable update notifications
   */
  enableNotifications(): void {
    delete process.env.NO_UPDATE_NOTIFIER;
  }

  /**
   * Check if notifications are enabled
   */
  areNotificationsEnabled(): boolean {
    return !process.env.NO_UPDATE_NOTIFIER;
  }

  /**
   * Get release notes for version
   */
  async getReleaseNotes(version: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/me-saurabhkohli/agentify/releases/tags/v${version}`
      );
      
      if (!response.ok) {
        return null;
      }
      
      const release = await response.json();
      return release.body || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get changelog between versions
   */
  async getChangelog(fromVersion: string, toVersion: string): Promise<ChangelogEntry[]> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/me-saurabhkohli/agentify/releases`
      );
      
      if (!response.ok) {
        return [];
      }
      
      const releases = await response.json();
      const changelog: ChangelogEntry[] = [];
      
      for (const release of releases) {
        const version = release.tag_name.replace('v', '');
        
        if (this.isVersionBetween(version, fromVersion, toVersion)) {
          changelog.push({
            version,
            date: new Date(release.published_at),
            title: release.name,
            body: release.body,
            url: release.html_url,
            prerelease: release.prerelease
          });
        }
      }
      
      return changelog.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
      return [];
    }
  }

  /**
   * Display detailed changelog
   */
  async displayChangelog(fromVersion?: string): Promise<void> {
    const currentVersion = this.getCurrentVersion();
    const latestVersion = await this.getLatestVersion();
    
    if (!latestVersion) {
      console.log(chalk.red('❌ Could not fetch latest version'));
      return;
    }
    
    const startVersion = fromVersion || currentVersion;
    const changelog = await this.getChangelog(startVersion, latestVersion);
    
    if (changelog.length === 0) {
      console.log(chalk.green('✅ You are up to date!'));
      return;
    }
    
    console.log(chalk.blue.bold('\n📋 Changelog:\n'));
    
    for (const entry of changelog) {
      const versionColor = entry.prerelease ? chalk.yellow : chalk.green;
      const title = entry.title || `Version ${entry.version}`;
      
      console.log(versionColor.bold(`🏷️  ${title}`));
      console.log(chalk.gray(`   Released: ${entry.date.toLocaleDateString()}`));
      
      if (entry.body) {
        const formattedBody = entry.body
          .split('\n')
          .filter(line => line.trim())
          .map(line => `   ${line}`)
          .join('\n');
        
        console.log(chalk.white(formattedBody));
      }
      
      console.log(chalk.gray(`   More info: ${entry.url}\n`));
    }
  }

  /**
   * Check if version is between two versions
   */
  private isVersionBetween(version: string, from: string, to: string): boolean {
    // Simple version comparison (would use semver in production)
    const versionParts = version.split('.').map(Number);
    const fromParts = from.split('.').map(Number);
    const toParts = to.split('.').map(Number);
    
    const versionNum = versionParts[0] * 10000 + versionParts[1] * 100 + versionParts[2];
    const fromNum = fromParts[0] * 10000 + fromParts[1] * 100 + fromParts[2];
    const toNum = toParts[0] * 10000 + toParts[1] * 100 + toParts[2];
    
    return versionNum > fromNum && versionNum <= toNum;
  }

  /**
   * Show comprehensive update information
   */
  async showUpdateInfo(): Promise<void> {
    console.log(chalk.blue.bold('📦 MCP Agentify Update Information\n'));
    
    const currentVersion = this.getCurrentVersion();
    const latestVersion = await this.getLatestVersion();
    const isUpdateAvailable = await this.isUpdateAvailable();
    
    console.log(`Current version: ${chalk.yellow(currentVersion)}`);
    console.log(`Latest version:  ${chalk.green(latestVersion || 'Unknown')}`);
    console.log(`Update available: ${isUpdateAvailable ? chalk.red('Yes') : chalk.green('No')}`);
    console.log(`Notifications: ${this.areNotificationsEnabled() ? chalk.green('Enabled') : chalk.red('Disabled')}\n`);
    
    if (isUpdateAvailable && latestVersion) {
      console.log(chalk.cyan.bold('Update Commands:'));
      console.log(`  npm install -g mcp-agentify@${latestVersion}`);
      console.log(`  npm install -g mcp-agentify@latest\n`);
      
      console.log(chalk.cyan.bold('Or use without installing:'));
      console.log(`  npx mcp-agentify@latest\n`);
      
      // Show release notes for latest version
      const releaseNotes = await this.getReleaseNotes(latestVersion);
      if (releaseNotes) {
        console.log(chalk.cyan.bold('Latest Release Notes:'));
        console.log(chalk.gray(releaseNotes.substring(0, 500) + (releaseNotes.length > 500 ? '...' : '')));
      }
    }
  }
}

// Type definitions
interface UpdateCheckOptions {
  silent?: boolean;
  force?: boolean;
}

interface UpdateInfo {
  current: string;
  latest: string;
  type: 'major' | 'minor' | 'patch';
  name: string;
  updateAvailable: boolean;
}

interface ChangelogEntry {
  version: string;
  date: Date;
  title: string;
  body: string;
  url: string;
  prerelease: boolean;
}

export { UpdateCheckOptions, UpdateInfo, ChangelogEntry };