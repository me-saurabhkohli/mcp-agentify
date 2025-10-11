export interface EndpointInfo {
  path: string;
  method: string;
  description?: string;
  parameters?: Parameter[];
  responses?: ResponseInfo[];
  tags?: string[];
}

export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  in?: 'query' | 'path' | 'header' | 'body';
}

export interface ResponseInfo {
  statusCode: number;
  description?: string;
  schema?: any;
}

export interface ProjectInfo {
  name: string;
  type: 'rest-api' | 'nodejs' | 'openapi';
  rootPath: string;
  endpoints: EndpointInfo[];
  baseUrl?: string;
  version?: string;
  description?: string;
}

export interface MCPConfig {
  serverName: string;
  description: string;
  version: string;
  outputFormat: 'typescript' | 'javascript';
  includeTests: boolean;
  includeDocumentation: boolean;
  customTemplates?: string;
  excludeEndpoints?: string[];
  transformRules?: TransformRule[];
}

export interface TransformRule {
  pattern: string;
  replacement: string;
  type: 'endpoint' | 'parameter' | 'response';
}

export interface GenerationOptions {
  dryRun?: boolean;
  verbose?: boolean;
  outputPath: string;
}