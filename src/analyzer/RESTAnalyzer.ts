import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { ProjectInfo, EndpointInfo } from '../types';

export class RESTAnalyzer {
  async analyze(projectPath: string): Promise<ProjectInfo> {
    const endpoints = await this.scanForEndpoints(projectPath);

    return {
      name: path.basename(projectPath),
      type: 'rest-api',
      rootPath: projectPath,
      endpoints
    };
  }

  private async scanForEndpoints(projectPath: string): Promise<EndpointInfo[]> {
    const endpoints: EndpointInfo[] = [];
    
    // Enhanced patterns for more comprehensive REST API detection
    const patterns = [
      // JavaScript/TypeScript - Enhanced patterns
      '**/{api,routes,controllers,handlers,endpoints}/**/*.{js,ts,jsx,tsx}',
      '**/*{api,route,controller,handler,endpoint,server}*.{js,ts,jsx,tsx}',
      '**/pages/api/**/*.{js,ts,jsx,tsx}', // Next.js API routes
      '**/src/pages/api/**/*.{js,ts,jsx,tsx}', // Next.js API routes (src folder)
      
      // Python - Enhanced patterns
      '**/views.py', // Django
      '**/urls.py', // Django
      '**/urlpatterns.py', // Django
      '**/*{view,api,endpoint,resource}*.py',
      '**/app.py', // Flask main files
      '**/main.py', // FastAPI main files
      
      // Java/Kotlin - Enhanced patterns  
      '**/*{Controller,Resource,Service,Handler}.{java,kt}',
      '**/controller/**/*.{java,kt}',
      '**/resource/**/*.{java,kt}',
      '**/rest/**/*.{java,kt}',
      
      // Go
      '**/{handler,controller,api,route}*.go',
      '**/main.go',
      
      // PHP
      '**/{api,routes,controllers}/**/*.php',
      '**/routes.php',
      '**/web.php',
      
      // Ruby
      '**/routes.rb',
      '**/config/routes.rb',
      '**/*_controller.rb',
      
      // C#/.NET
      '**/*Controller.cs',
      '**/Controllers/**/*.cs',
      
      // Rust
      '**/main.rs',
      '**/lib.rs',
      '**/routes.rs'
    ];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: projectPath,
        ignore: ['node_modules/**', 'vendor/**', 'dist/**', 'build/**', 'target/**']
      });

      for (const file of files) {
        const filePath = path.join(projectPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const fileEndpoints = this.extractEndpointsFromFile(content, file);
        endpoints.push(...fileEndpoints);
      }
    }

    return this.deduplicateEndpoints(endpoints);
  }

  private extractEndpointsFromFile(content: string, filename: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    const ext = path.extname(filename);

    switch (ext) {
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
        endpoints.push(...this.extractJavaScriptEndpoints(content, filename));
        break;
      case '.py':
        endpoints.push(...this.extractPythonEndpoints(content, filename));
        break;
      case '.java':
      case '.kt':
        endpoints.push(...this.extractJavaEndpoints(content, filename));
        break;
      case '.go':
        endpoints.push(...this.extractGoEndpoints(content, filename));
        break;
      case '.php':
        endpoints.push(...this.extractPHPEndpoints(content, filename));
        break;
      case '.rb':
        endpoints.push(...this.extractRubyEndpoints(content, filename));
        break;
      case '.cs':
        endpoints.push(...this.extractCSharpEndpoints(content, filename));
        break;
      case '.rs':
        endpoints.push(...this.extractRustEndpoints(content, filename));
        break;
    }

    return endpoints;
  }

  private extractJavaScriptEndpoints(content: string, filename: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    
    // Enhanced patterns for various JavaScript frameworks
    const patterns = [
      // Express.js, Fastify, Koa with parameter extraction
      /(?:app|router|server)\.(?:get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      
      // NestJS decorators
      /@(?:Get|Post|Put|Patch|Delete|Options|Head)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      
      // Hapi.js route configuration
      /server\.route\s*\(\s*\{\s*method:\s*['"`]([^'"`]+)['"`][^}]*path:\s*['"`]([^'"`]+)['"`]/gs,
      
      // Next.js API routes (inferred from file path)
      /export\s+(?:default\s+)?(?:async\s+)?function\s+(?:handler|\w+)\s*\([^)]*req[^)]*\)/g
    ];

    patterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (index === 2) { // Hapi.js pattern
          const method = match[1].toUpperCase();
          const path = match[2];
          endpoints.push({
            path: path,
            method: method,
            description: `Hapi.js endpoint from ${filename}`,
            parameters: this.extractParametersFromPath(path)
          });
        } else if (index === 3) { // Next.js API route
          const apiPath = this.inferNextJsApiPath(filename);
          const methods = this.extractMethodsFromNextJsHandler(content);
          methods.forEach(method => {
            endpoints.push({
              path: apiPath,
              method: method,
              description: `Next.js API route from ${filename}`,
              parameters: this.extractParametersFromPath(apiPath)
            });
          });
        } else {
          const method = this.extractMethodFromMatch(match[0]);
          const path = match[1];
          endpoints.push({
            path: path,
            method: method || 'GET',
            description: `Endpoint from ${filename}`,
            parameters: this.extractParametersFromPath(path)
          });
        }
      }
    });

    return endpoints;
  }

  private extractPythonEndpoints(content: string, filename: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    
    // Enhanced patterns for Python frameworks
    const patterns = [
      // Flask routes
      /@app\.route\s*\(\s*['"`]([^'"`]+)['"`](?:,\s*methods\s*=\s*\[([^\]]+)\])?\)/g,
      
      // Django URL patterns
      /(?:path|url|re_path)\s*\(\s*r?['"`]([^'"`]+)['"`]/g,
      
      // FastAPI decorators
      /@(?:app\.)?(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      
      // Django REST Framework ViewSets
      /class\s+(\w+ViewSet|\w+View)\s*\([^)]*\):/g
    ];

    patterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (index === 0) { // Flask
          const path = match[1];
          const methodsStr = match[2];
          const methods = methodsStr ? methodsStr.replace(/['"\s]/g, '').split(',') : ['GET'];
          
          methods.forEach(method => {
            endpoints.push({
              path: path,
              method: method.trim().toUpperCase(),
              description: `Flask endpoint from ${filename}`,
              parameters: this.extractParametersFromPath(path)
            });
          });
        } else if (index === 1) { // Django
          const path = this.normalizeDjangoPath(match[1]);
          endpoints.push({
            path: path,
            method: 'GET',
            description: `Django endpoint from ${filename}`,
            parameters: this.extractParametersFromPath(path)
          });
        } else if (index === 2) { // FastAPI
          const method = match[1].toUpperCase();
          const path = match[2];
          endpoints.push({
            path: path,
            method: method,
            description: `FastAPI endpoint from ${filename}`,
            parameters: this.extractParametersFromPath(path)
          });
        } else if (index === 3) { // Django REST Framework
          const viewName = match[1];
          const basePath = `/${viewName.replace(/ViewSet|View/i, '').toLowerCase()}/`;
          
          // Generate standard CRUD endpoints for ViewSets
          const crudEndpoints = [
            { method: 'GET', path: basePath, description: 'List' },
            { method: 'POST', path: basePath, description: 'Create' },
            { method: 'GET', path: `${basePath}{id}/`, description: 'Retrieve' },
            { method: 'PUT', path: `${basePath}{id}/`, description: 'Update' },
            { method: 'PATCH', path: `${basePath}{id}/`, description: 'Partial Update' },
            { method: 'DELETE', path: `${basePath}{id}/`, description: 'Delete' }
          ];
          
          crudEndpoints.forEach(({ method, path, description }) => {
            endpoints.push({
              path: path,
              method: method,
              description: `DRF ${viewName} - ${description}`,
              parameters: this.extractParametersFromPath(path)
            });
          });
        }
      }
    });

    return endpoints;
  }

  private extractJavaEndpoints(content: string, filename: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    
    // Spring Boot annotations
    const patterns = [
      /@(?:RequestMapping|GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping)\s*\(\s*(?:value\s*=\s*)?['"`]([^'"`]+)['"`]/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = this.extractMethodFromAnnotation(match[0]);
        endpoints.push({
          path: match[1],
          method: method || 'GET',
          description: `Spring Boot endpoint from ${filename}`,
          parameters: this.extractParametersFromPath(match[1])
        });
      }
    });

    return endpoints;
  }

  private extractGoEndpoints(content: string, filename: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    
    // Go patterns (Gin, Echo, etc.)
    const patterns = [
      /(?:router|r|e)\.(?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(\s*['"`]([^'"`]+)['"`]/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = this.extractMethodFromMatch(match[0]);
        endpoints.push({
          path: match[1],
          method: method || 'GET',
          description: `Go endpoint from ${filename}`,
          parameters: this.extractParametersFromPath(match[1])
        });
      }
    });

    return endpoints;
  }

  private extractPHPEndpoints(content: string, filename: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    
    // Laravel, Slim patterns
    const patterns = [
      /Route::(?:get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = this.extractMethodFromMatch(match[0]);
        endpoints.push({
          path: match[1],
          method: method || 'GET',
          description: `PHP endpoint from ${filename}`,
          parameters: this.extractParametersFromPath(match[1])
        });
      }
    });

    return endpoints;
  }

  private extractRubyEndpoints(content: string, filename: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    
    // Rails patterns
    const patterns = [
      /(?:get|post|put|patch|delete|options|head)\s+['"`]([^'"`]+)['"`]/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = this.extractMethodFromMatch(match[0]);
        endpoints.push({
          path: match[1],
          method: method || 'GET',
          description: `Rails endpoint from ${filename}`,
          parameters: this.extractParametersFromPath(match[1])
        });
      }
    });

    return endpoints;
  }

  private extractCSharpEndpoints(content: string, filename: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    
    // ASP.NET Core patterns
    const patterns = [
      // Controller actions with Route and Http method attributes
      /\[Route\(\"([^\"]+)\"\)\][^{]*\[Http(Get|Post|Put|Patch|Delete)(?:\(\"([^\"]+)\"\))?\]/gs,
      
      // Minimal API patterns
      /app\.(Get|Post|Put|Patch|Delete)\(\"([^\"]+)\"/gi
    ];

    patterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (index === 0) { // Controller actions
          const basePath = match[1] || '';
          const method = match[2].toUpperCase();
          const actionPath = match[3] || '';
          const fullPath = basePath + actionPath;
          
          endpoints.push({
            path: fullPath.startsWith('/') ? fullPath : '/' + fullPath,
            method: method,
            description: `ASP.NET Core endpoint from ${filename}`,
            parameters: this.extractParametersFromPath(fullPath)
          });
        } else if (index === 1) { // Minimal API
          const method = match[1].toUpperCase();
          const path = match[2];
          
          endpoints.push({
            path: path,
            method: method,
            description: `Minimal API endpoint from ${filename}`,
            parameters: this.extractParametersFromPath(path)
          });
        }
      }
    });

    return endpoints;
  }

  private extractRustEndpoints(content: string, filename: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    
    // Rust web framework patterns (Actix, Warp, Rocket)
    const patterns = [
      // Rocket
      /#\[(get|post|put|patch|delete)\(\"([^\"]+)\"\)\]/gi,
      
      // Actix Web (simplified pattern)
      /web::(get|post|put|patch|delete)\(\)/gi
    ];

    patterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (index === 0) { // Rocket
          const method = match[1].toUpperCase();
          const path = match[2];
          
          endpoints.push({
            path: path,
            method: method,
            description: `Rocket endpoint from ${filename}`,
            parameters: this.extractParametersFromPath(path)
          });
        } else if (index === 1) { // Actix Web (basic detection)
          const method = match[1].toUpperCase();
          
          endpoints.push({
            path: '/api', // Default path for Actix detection
            method: method,
            description: `Actix Web endpoint from ${filename}`,
            parameters: []
          });
        }
      }
    });

    return endpoints;
  }

  // Helper methods
  private extractParametersFromPath(path: string): any[] {
    const parameters: any[] = [];
    
    // Extract path parameters (e.g., /users/{id}, /users/:id)
    const pathParamMatches = path.match(/[{:]([^}/:]+)[}]?/g);
    if (pathParamMatches) {
      pathParamMatches.forEach(match => {
        const paramName = match.replace(/[{}:]/g, '');
        parameters.push({
          name: paramName,
          in: 'path',
          type: 'string',
          required: true,
          description: `Path parameter: ${paramName}`
        });
      });
    }
    
    return parameters;
  }

  private inferNextJsApiPath(filename: string): string {
    // Convert Next.js file path to API path
    const apiMatch = filename.match(/(?:pages|src\/pages)\/api\/(.+)\.[jt]sx?$/);
    if (apiMatch) {
      let apiPath = '/api/' + apiMatch[1]
        .replace(/\[([^\]]+)\]/g, '{$1}') // [id] -> {id}
        .replace(/\/index$/, ''); // remove /index
      return apiPath === '/api/' ? '/api' : apiPath;
    }
    return '/api/unknown';
  }

  private extractMethodsFromNextJsHandler(functionBody: string): string[] {
    const methods: string[] = [];
    const methodChecks = functionBody.match(/req\.method\s*===?\s*['\"](GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)[\"']/gi);
    
    if (methodChecks) {
      methodChecks.forEach(check => {
        const methodMatch = check.match(/['\"](\\w+)['\"]/i);
        if (methodMatch) {
          methods.push(methodMatch[1].toUpperCase());
        }
      });
    }
    
    return methods.length > 0 ? methods : ['GET', 'POST'];
  }

  private normalizeDjangoPath(path: string): string {
    return path
      .replace(/\(\?P<([^>]+)>[^)]+\)/g, '{$1}') // (?P<id>\d+) -> {id}
      .replace(/\\d\+/g, '{id}') // \d+ -> {id}
      .replace(/\^|\$/g, '') // Remove ^ and $
      .replace(/\/+/g, '/'); // Normalize slashes
  }

  private extractMethodFromMatch(matchStr: string): string {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
    const upperMatch = matchStr.toUpperCase();
    
    for (const method of methods) {
      if (upperMatch.includes(method)) {
        return method;
      }
    }
    
    return 'GET';
  }

  private extractMethodFromAnnotation(annotation: string): string {
    const mapping = {
      'GetMapping': 'GET',
      'PostMapping': 'POST',
      'PutMapping': 'PUT',
      'PatchMapping': 'PATCH',
      'DeleteMapping': 'DELETE'
    };

    for (const [ann, method] of Object.entries(mapping)) {
      if (annotation.includes(ann)) {
        return method;
      }
    }

    return 'GET';
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