import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { ProjectInfo, EndpointInfo } from '../types';

export class OpenAPIAnalyzer {
  async analyze(projectPath: string): Promise<ProjectInfo> {
    const openApiFiles = await glob('**/{swagger,openapi}.{json,yaml,yml}', {
      cwd: projectPath,
      ignore: ['node_modules/**']
    });

    if (openApiFiles.length === 0) {
      throw new Error('No OpenAPI/Swagger files found');
    }

    const specFile = openApiFiles[0];
    const specPath = path.join(projectPath, specFile);
    const spec = await this.parseOpenAPISpec(specPath);

    const endpoints = this.extractEndpointsFromSpec(spec);

    return {
      name: spec.info?.title || path.basename(projectPath),
      type: 'openapi',
      rootPath: projectPath,
      version: spec.info?.version,
      description: spec.info?.description,
      baseUrl: this.extractBaseUrl(spec),
      endpoints
    };
  }

  private async parseOpenAPISpec(filePath: string): Promise<any> {
    const content = await fs.readFile(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.json') {
      return JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      // For now, we'll treat YAML as JSON - in production, you'd use a YAML parser
      throw new Error('YAML parsing not implemented. Please convert to JSON format.');
    }
    
    throw new Error(`Unsupported file format: ${ext}`);
  }

  private extractEndpointsFromSpec(spec: any): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    const paths = spec.paths || {};

    for (const [pathName, pathItem] of Object.entries(paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
      
      for (const method of methods) {
        const operation = (pathItem as any)[method];
        if (operation) {
          endpoints.push({
            path: pathName,
            method: method.toUpperCase(),
            description: operation.summary || operation.description,
            parameters: this.extractParameters(operation),
            responses: this.extractResponses(operation),
            tags: operation.tags
          });
        }
      }
    }

    return endpoints;
  }

  private extractParameters(operation: any): any[] {
    const parameters = operation.parameters || [];
    return parameters.map((param: any) => ({
      name: param.name,
      type: param.schema?.type || param.type || 'string',
      required: param.required || false,
      description: param.description,
      in: param.in
    }));
  }

  private extractResponses(operation: any): any[] {
    const responses = operation.responses || {};
    return Object.entries(responses).map(([statusCode, response]: [string, any]) => ({
      statusCode: parseInt(statusCode),
      description: response.description,
      schema: response.schema || response.content
    }));
  }

  private extractBaseUrl(spec: any): string | undefined {
    if (spec.servers && spec.servers.length > 0) {
      return spec.servers[0].url;
    }
    
    if (spec.host) {
      const scheme = spec.schemes?.[0] || 'https';
      const basePath = spec.basePath || '';
      return `${scheme}://${spec.host}${basePath}`;
    }
    
    return undefined;
  }
}