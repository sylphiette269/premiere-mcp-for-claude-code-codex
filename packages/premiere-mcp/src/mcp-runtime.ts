import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { PremiereBridge } from './bridge/index.js';
import {
  compactCatalogDescription,
  compactJsonSchema,
  resolveCatalogExposure,
  shouldKeepCompactToolDescription,
  type CatalogExposureOptions,
} from './catalog-profile.js';
import { PremiereProPrompts } from './prompts/index.js';
import { PremiereProResources } from './resources/index.js';
import { PremiereProTools } from './tools/index.js';
import {
  buildAgentError,
  classifyError,
} from './utils/errors.js';
import { Logger } from './utils/logger.js';

export const DISABLED_TOOLS: Record<string, { reason: string; fallback: string[] }> = {
  build_timeline_from_xml: {
    reason:
      'Known unstable path; motionStyle unsupported; XML import currently causes script_error. This tool is temporarily disabled.',
    fallback: ['plan_edit_from_request', 'plan_edit_assembly', 'assemble_product_spot'],
  },
};

export function buildDisabledToolPayload(toolName: string) {
  const disabled = DISABLED_TOOLS[toolName];
  if (!disabled) {
    return null;
  }

  return {
    ok: false,
    error_code: 'TOOL_DISABLED',
    message: disabled.reason,
    retryable: false,
    fallback: disabled.fallback,
    details: {
      toolName,
      suggestion: `Please use one of: ${disabled.fallback.join(', ')}`,
    },
  };
}

function isToolFailureResult(result: unknown): result is {
  ok?: boolean;
  success?: boolean;
  error?: unknown;
  message?: unknown;
} {
  if (!result || typeof result !== 'object') {
    return false;
  }

  const candidate = result as Record<string, unknown>;
  return candidate.ok === false || candidate.success === false;
}

export function normalizeToolFailure(
  toolName: string,
  result: {
    ok?: boolean;
    success?: boolean;
    error?: unknown;
    message?: unknown;
    [key: string]: unknown;
  },
) {
  const rawMessage =
    typeof result.error === 'string'
      ? result.error
      : typeof result.message === 'string'
        ? result.message
        : `Tool '${toolName}' reported a failure`;
  const codeKey = classifyError(rawMessage, toolName);

  return buildAgentError(codeKey, rawMessage, {
    source: 'tool-result',
    rawMessage,
    toolName,
    toolResult: result,
  });
}

const STATIC_SESSION_RESOURCE_URIS = new Set([
  'premiere://mcp/agent-guide',
]);

const COMPACT_PROMPT_DESCRIPTION_ALLOWLIST = new Set([
  'operate_premiere_mcp',
]);

function stableSessionCacheValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableSessionCacheValue(entry));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableSessionCacheValue(entry)]),
  );
}

function createSessionCacheKey(namespace: string, value?: unknown): string {
  if (value === undefined) {
    return namespace;
  }

  return `${namespace}:${JSON.stringify(stableSessionCacheValue(value))}`;
}

class SessionResponseCache {
  private readonly entries = new Map<string, Promise<unknown>>();

  getOrCreate<T>(key: string, factory: () => Promise<T> | T): Promise<T> {
    const existing = this.entries.get(key) as Promise<T> | undefined;
    if (existing) {
      return existing;
    }

    const pending = Promise.resolve()
      .then(factory)
      .catch((error) => {
        this.entries.delete(key);
        throw error;
      });

    this.entries.set(key, pending as Promise<unknown>);
    return pending;
  }

  clear(): void {
    this.entries.clear();
  }
}

export class PremiereMcpServer {
  private readonly server: Server;
  readonly bridge: PremiereBridge;
  readonly tools: PremiereProTools;
  readonly resources: PremiereProResources;
  readonly prompts: PremiereProPrompts;
  private readonly logger: Logger;
  private readonly catalogExposure: CatalogExposureOptions;
  private readonly sessionCache = new SessionResponseCache();

  constructor() {
    this.logger = new Logger('PremiereMcpServer');
    this.catalogExposure = resolveCatalogExposure({
      ...process.env,
      PREMIERE_MCP_CATALOG_PROFILE: process.env.PREMIERE_MCP_CATALOG_PROFILE ?? 'full',
      PREMIERE_MCP_SCHEMA_DETAIL: process.env.PREMIERE_MCP_SCHEMA_DETAIL ?? 'compact',
      PREMIERE_MCP_AGENT_GUIDE_MODE: process.env.PREMIERE_MCP_AGENT_GUIDE_MODE ?? 'compact',
    });
    this.server = new Server(
      {
        name: 'premiere-mcp',
        version: '0.2.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          logging: {},
        },
      },
    );
    this.bridge = new PremiereBridge();
    this.tools = new PremiereProTools(this.bridge);
    this.resources = new PremiereProResources(this.bridge, this.catalogExposure);
    this.prompts = new PremiereProPrompts(this.catalogExposure);

    this.setupHandlers();
  }

  private compactCatalogText(text: string): string {
    return this.catalogExposure.schemaDetail === 'compact'
      ? compactCatalogDescription(text, 48)
      : text;
  }

  private serializePayload(payload: unknown): string {
    return this.catalogExposure.schemaDetail === 'compact'
      ? JSON.stringify(payload)
      : JSON.stringify(payload, null, 2);
  }

  private buildListToolsResponse() {
    return {
      tools: this.tools.getAvailableTools().map((tool) => ({
        name: tool.name,
        description:
          this.catalogExposure.schemaDetail === 'compact'
          && !shouldKeepCompactToolDescription(tool.name)
            ? ''
            : this.compactCatalogText(tool.description),
        inputSchema: (() => {
          const schema = zodToJsonSchema(tool.inputSchema as never, {
            $refStrategy: 'none',
          }) as Record<string, unknown>;
          return this.catalogExposure.schemaDetail === 'compact'
            ? compactJsonSchema(schema) as Record<string, unknown>
            : schema;
        })(),
      })),
    };
  }

  async getListToolsResponse() {
    return this.sessionCache.getOrCreate(
      createSessionCacheKey('catalog:tools'),
      () => this.buildListToolsResponse(),
    );
  }

  private buildListResourcesResponse() {
    return {
      resources: this.resources.getAvailableResources().map((resource) => {
        if (this.catalogExposure.schemaDetail === 'compact') {
          const { description: _description, ...compactResource } = resource;
          return compactResource;
        }

        return {
          ...resource,
          description: this.compactCatalogText(resource.description),
        };
      }),
    };
  }

  async getListResourcesResponse() {
    return this.sessionCache.getOrCreate(
      createSessionCacheKey('catalog:resources'),
      () => this.buildListResourcesResponse(),
    );
  }

  private buildListPromptsResponse() {
    return {
      prompts: this.prompts.getAvailablePrompts().map((prompt) => ({
        ...prompt,
        description:
          this.catalogExposure.schemaDetail === 'compact'
          && !COMPACT_PROMPT_DESCRIPTION_ALLOWLIST.has(prompt.name)
            ? ''
            : this.compactCatalogText(prompt.description),
        arguments: prompt.arguments?.map((argument) => {
          if (this.catalogExposure.schemaDetail === 'compact') {
            const { description: _description, required, ...compactArgument } = argument;
            return required
              ? {
                  ...compactArgument,
                  required: true,
                }
              : compactArgument;
          }

          return {
            ...argument,
            description: this.compactCatalogText(argument.description),
          };
        }),
      })),
    };
  }

  async getListPromptsResponse() {
    return this.sessionCache.getOrCreate(
      createSessionCacheKey('catalog:prompts'),
      () => this.buildListPromptsResponse(),
    );
  }

  async getResourceReadResponse(uri: string) {
    const cacheKey = STATIC_SESSION_RESOURCE_URIS.has(uri)
      ? createSessionCacheKey(`resource:${uri}`)
      : createSessionCacheKey(`resource:${uri}`, { nonce: Date.now() });

    return this.sessionCache.getOrCreate(cacheKey, async () => {
      const content = await this.resources.readResource(uri);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: this.serializePayload(content),
          },
        ],
      };
    });
  }

  async getPromptResponse(name: string, args: Record<string, unknown>) {
    return this.sessionCache.getOrCreate(
      createSessionCacheKey(`prompt:${name}`, args),
      async () => {
        const prompt = await this.prompts.getPrompt(name, args ?? {});
        return {
          description: prompt.description,
          messages: prompt.messages.map((message) => ({
            ...message,
            role: message.role === 'system' ? 'assistant' : message.role,
          })),
        };
      },
    );
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return this.getListToolsResponse();
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (DISABLED_TOOLS[name]) {
        const payload = buildDisabledToolPayload(name)!;
        return {
          content: [
            {
              type: 'text' as const,
              text: this.serializePayload(payload),
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await this.tools.executeTool(name, args ?? {});
        if (isToolFailureResult(result)) {
          const normalizedError = normalizeToolFailure(name, result);
          return {
            content: [
              {
                type: 'text' as const,
                text: this.serializePayload(normalizedError),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: this.serializePayload(result),
            },
          ],
        };
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Tool execution failed: ${rawMessage}`);
        const codeKey = classifyError(rawMessage, name);
        const agentError = buildAgentError(codeKey, rawMessage, {
          source: 'mcp-runtime',
          rawMessage,
          toolName: name,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: this.serializePayload(agentError),
            },
          ],
          isError: true,
        };
      }
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () =>
      this.getListResourcesResponse(),
    );

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        return this.getResourceReadResponse(uri);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Resource read failed: ${message}`);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read resource '${uri}': ${message}`,
        );
      }
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () =>
      this.getListPromptsResponse(),
    );

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        return this.getPromptResponse(name, args ?? {});
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Prompt generation failed: ${message}`);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to generate prompt '${name}': ${message}`,
        );
      }
    });

    this.server.onerror = (error) => {
      this.logger.error('Server error:', error);
    };
  }

  async start(): Promise<void> {
    await this.bridge.initialize();
  }

  async connect(transport: { start?: () => Promise<void> } | any): Promise<void> {
    await this.server.connect(transport);
  }

  async stop(): Promise<void> {
    this.sessionCache.clear();
    await this.bridge.cleanup();
  }

  get rawServer(): Server {
    return this.server;
  }
}

export function createPremiereMcpServer(): PremiereMcpServer {
  return new PremiereMcpServer();
}
