export type CatalogProfile = 'full' | 'slim';
export type SchemaDetail = 'full' | 'compact';

type EnvLike = Partial<Record<string, string | undefined>>;

export interface CatalogExposureOptions {
  profile: CatalogProfile;
  schemaDetail: SchemaDetail;
  compactAgentGuide: boolean;
}

const COMPACT_TOOL_DESCRIPTION_ALLOWLIST = new Set([
  'agent_task',
  'analyze_reference_patterns',
  'analyze_reference_video',
  'apply_animation_preset',
  'apply_keyframe_animation',
  'assemble_product_spot',
  'assemble_product_spot_closed_loop',
  'build_brand_spot_from_mogrt_and_assets',
  'build_motion_graphics_demo',
  'collect_reference_videos',
  'compare_result_to_blueprint',
  'compare_to_reference_video',
  'critic_edit_result',
  'extract_editing_blueprint',
  'load_editing_blueprint',
  'parse_edit_request',
  'parse_keyframe_request',
  'plan_edit_assembly',
  'plan_edit_from_request',
  'plan_keyframe_animation',
  'plan_replication_from_video',
  'plugin_call',
  'plugin_list',
  'plugin_register',
  'plugin_set_enabled',
  'review_blueprint_reasonability',
  'review_edit_reasonability',
]);

const SCHEMA_METADATA_KEYS = new Set([
  '$schema',
  'additionalProperties',
  'default',
  'description',
  'examples',
  'title',
]);

function parseCatalogProfileValue(value: string | undefined): CatalogProfile | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'slim') {
    return 'slim';
  }
  if (normalized === 'full') {
    return 'full';
  }
  return null;
}

function parseSchemaDetailValue(value: string | undefined): SchemaDetail | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'compact') {
    return 'compact';
  }
  if (normalized === 'full') {
    return 'full';
  }
  return null;
}

export function resolveCatalogProfile(env: EnvLike = process.env): CatalogProfile {
  return parseCatalogProfileValue(env.PREMIERE_MCP_CATALOG_PROFILE) ?? 'full';
}

export function resolveSchemaDetail(
  profile: CatalogProfile,
  env: EnvLike = process.env,
): SchemaDetail {
  return parseSchemaDetailValue(env.PREMIERE_MCP_SCHEMA_DETAIL)
    ?? (profile === 'slim' ? 'compact' : 'full');
}

export function resolveCatalogExposure(env: EnvLike = process.env): CatalogExposureOptions {
  const profile = resolveCatalogProfile(env);
  const schemaDetail = resolveSchemaDetail(profile, env);
  const compactAgentGuide =
    env.PREMIERE_MCP_AGENT_GUIDE_MODE?.trim().toLowerCase() === 'compact'
    || profile === 'slim';

  return {
    profile,
    schemaDetail,
    compactAgentGuide,
  };
}

export function compactJsonSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map((entry) => compactJsonSchema(entry));
  }

  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const schemaRecord = schema as Record<string, unknown>;
  const isLeafSchema =
    !Object.prototype.hasOwnProperty.call(schemaRecord, 'properties')
    && !Object.prototype.hasOwnProperty.call(schemaRecord, 'items');
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schemaRecord)) {
    if (SCHEMA_METADATA_KEYS.has(key)) {
      continue;
    }
    if (
      key === 'type'
      && isLeafSchema
      && !Object.prototype.hasOwnProperty.call(schemaRecord, 'enum')
    ) {
      continue;
    }
    output[key] = compactJsonSchema(value);
  }

  return output;
}

export function compactCatalogDescription(
  description: string,
  maxLength = 96,
): string {
  const normalized = description.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const firstSentence = normalized.match(/^(.{1,160}?[.!?])(\s|$)/)?.[1]?.trim();
  const candidate = firstSentence && firstSentence.length <= maxLength
    ? firstSentence
    : normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd();

  return candidate.endsWith('...') ? candidate : `${candidate}...`;
}

export function shouldKeepCompactToolDescription(name: string): boolean {
  return COMPACT_TOOL_DESCRIPTION_ALLOWLIST.has(name);
}
