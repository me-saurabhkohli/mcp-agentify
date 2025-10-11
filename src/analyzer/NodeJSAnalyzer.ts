import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { ProjectInfo, EndpointInfo, Parameter } from '../types';

export class NodeJSAnalyzer {
  async analyze(projectPath: string): Promise<ProjectInfo> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    let packageInfo: any = {};
    
    if (await fs.pathExists(packageJsonPath)) {
      packageInfo = await fs.readJson(packageJsonPath);
    }

    const endpoints = await this.extractEndpoints(projectPath);

    return {
      name: packageInfo.name || path.basename(projectPath),
      type: 'nodejs',
      rootPath: projectPath,
      version: packageInfo.version,
      description: packageInfo.description,
      endpoints
    };
  }

  private async extractEndpoints(projectPath: string): Promise<EndpointInfo[]> {
    const endpoints: EndpointInfo[] = [];
    
    // Look for common route files
    const routeFiles = await glob('**/{routes,api,controllers}/**/*.{js,ts}', {
      cwd: projectPath,
      ignore: ['node_modules/**', 'dist/**', 'build/**']
    });

    // Also check main application files
    const appFiles = await glob('**/{app,index,server,main}.{js,ts}', {
      cwd: projectPath,
      ignore: ['node_modules/**', 'dist/**', 'build/**']
    });

    const allFiles = [...routeFiles, ...appFiles];

    for (const file of allFiles) {
      const filePath = path.join(projectPath, file);
      const content = await fs.readFile(filePath, 'utf8');
      const fileEndpoints = this.parseEndpointsFromFile(content, file);
      endpoints.push(...fileEndpoints);
    }

    return this.deduplicateEndpoints(endpoints);
  }

  private parseEndpointsFromFile(content: string, filename: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
    
    // Express.js patterns
    const expressPatterns = [
      // app.get('/path', handler)
      /(?:app|router)\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      // router.route('/path').get(handler).post(handler)
      /\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    ];

    // Fastify patterns
    const fastifyPatterns = [
      // fastify.get('/path', handler)
      /fastify\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      // server.register with routes
      /url\s*:\s*['"`]([^'"`]+)['"`]/g
    ];

    // Koa patterns
    const koaPatterns = [
      // router.get('/path', handler)
      /router\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/g
    ];

    const allPatterns = [...expressPatterns, ...fastifyPatterns, ...koaPatterns];

    for (const pattern of allPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1] || 'get';
        const path = match[2] || match[1];
        
        if (httpMethods.includes(method.toLowerCase())) {
          endpoints.push({
            path: this.normalizePath(path),
            method: method.toUpperCase(),
            description: `Endpoint from ${filename}`,
            parameters: this.extractParameters(path, content, match.index)
          });
        }
      }
    }

    return endpoints;
  }

  private extractParameters(path: string, content: string, position: number): Parameter[] {
    const parameters: Parameter[] = [];
    
    // Extract path parameters
    const pathParams = path.match(/:([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
    if (pathParams) {
      pathParams.forEach(param => {
        parameters.push({
          name: param.substring(1),
          type: 'string',
          required: true,
          in: 'path'
        });
      });
    }

    // Extract query parameters from nearby code
    const contextStart = Math.max(0, position - 500);
    const contextEnd = Math.min(content.length, position + 500);
    const context = content.substring(contextStart, contextEnd);
    
    const queryPatterns = [
      /req\\.query\\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /query\\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g
    ];

    queryPatterns.forEach(pattern => {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(context)) !== null) {
        if (!parameters.find(p => p.name === match![1])) {
          parameters.push({
            name: match[1],
            type: 'string',
            required: false,
            in: 'query'
          });
        }
      }
    });

    return parameters;
  }

  private normalizePath(path: string): string {
    // Convert Express-style params to OpenAPI style
    return path.replace(/:([a-zA-Z_$][a-zA-Z0-9_$]*)/g, '{$1}');
  }

  private deduplicateEndpoints(endpoints: EndpointInfo[]): EndpointInfo[] {
    const seen = new Set<string>();
    return endpoints.filter(endpoint => {
      const key = `${endpoint.method}:${endpoint.path}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}