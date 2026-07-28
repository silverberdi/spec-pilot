import { parse as parseYaml } from 'yaml';
import {
  hashProjectYamlBytes,
  MANDATORY_SECRET_EXCLUDES,
  validateProjectYamlBytes,
} from './project-yaml-validator';
import { validProjectYaml } from './valid-project-yaml.fixture';

describe('project-yaml-validator', () => {
  it('accepts a valid schemaVersion 1 contract and merges secret excludes', () => {
    const text = validProjectYaml();
    const bytes = Buffer.from(text, 'utf8');
    const result = validateProjectYamlBytes(bytes, parseYaml(text));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.sourceHash).toBe(hashProjectYamlBytes(bytes));
    const exclude = result.value.normalizedConfig['context'] as {
      exclude: string[];
    };
    for (const pattern of MANDATORY_SECRET_EXCLUDES) {
      expect(exclude.exclude).toContain(pattern);
    }
  });

  it('rejects oversized payloads before relying on parse semantics', () => {
    const bytes = Buffer.alloc(262145, 0x61);
    const result = validateProjectYamlBytes(bytes, {});
    expect(result).toEqual({ ok: false, code: 'project_yaml_too_large' });
  });

  it('rejects non-object parse roots', () => {
    const bytes = Buffer.from('just-a-string\n', 'utf8');
    const result = validateProjectYamlBytes(bytes, 'just-a-string');
    expect(result).toEqual({ ok: false, code: 'project_yaml_parse_error' });
  });

  it('rejects unsupported schemaVersion', () => {
    const text = validProjectYaml().replace('schemaVersion: 1', 'schemaVersion: 2');
    const bytes = Buffer.from(text, 'utf8');
    const result = validateProjectYamlBytes(bytes, parseYaml(text));
    expect(result).toEqual({ ok: false, code: 'unsupported_schema_version' });
  });

  it('rejects invalid machine ids', () => {
    const text = validProjectYaml({ projectId: 'Not_Kebab' });
    const bytes = Buffer.from(text, 'utf8');
    const result = validateProjectYamlBytes(bytes, parseYaml(text));
    expect(result).toEqual({ ok: false, code: 'invalid_machine_id' });
  });

  it('rejects non-cursor executor', () => {
    const text = validProjectYaml().replace('tool: cursor', 'tool: other');
    const bytes = Buffer.from(text, 'utf8');
    const result = validateProjectYamlBytes(bytes, parseYaml(text));
    expect(result).toEqual({ ok: false, code: 'invalid_executor' });
  });

  it('uses exact bytes for sourceHash (LF vs CRLF differ)', () => {
    const lf = Buffer.from(validProjectYaml(), 'utf8');
    const crlf = Buffer.from(validProjectYaml().replace(/\n/g, '\r\n'), 'utf8');
    expect(hashProjectYamlBytes(lf)).not.toBe(hashProjectYamlBytes(crlf));
    const lfResult = validateProjectYamlBytes(lf, parseYaml(lf.toString('utf8')));
    const crlfResult = validateProjectYamlBytes(
      crlf,
      parseYaml(crlf.toString('utf8')),
    );
    expect(lfResult.ok && crlfResult.ok).toBe(true);
    if (lfResult.ok && crlfResult.ok) {
      expect(lfResult.value.sourceHash).not.toBe(crlfResult.value.sourceHash);
    }
  });
});
