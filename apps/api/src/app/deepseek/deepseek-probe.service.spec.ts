import { DeepseekProbeService } from './deepseek-probe.service';
import { DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID } from '@specpilot/shared-contracts';
import { ProjectHttpError } from '../projects/project-errors';

describe('DeepseekProbeService', () => {
  const projectId = '11111111-1111-4111-8111-111111111111';

  function makeService(gateway: {
    completeStructured: jest.Mock;
  }) {
    const prisma = {
      project: {
        findUnique: jest.fn(async () => ({
          id: projectId,
          activeConfiguration: {
            normalizedConfig: {
              review: {
                provider: 'deepseek',
                models: {
                  discovery: 'deepseek-flash',
                  planning: 'deepseek-pro',
                  applied: 'deepseek-pro',
                  verify: 'deepseek-pro',
                },
              },
            },
          },
        })),
      },
    };
    return {
      prisma,
      service: new DeepseekProbeService(prisma as never, gateway as never),
    };
  }

  it('returns ok DTO from fake gateway without reading repository paths', async () => {
    process.env['DEEPSEEK_API_KEY'] = 'unit-test-key';
    const completeStructured = jest.fn(async () => ({
      ok: true as const,
      parsed: {
        ok: true as const,
        probe: DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID,
        message: 'ok',
      },
      attemptCount: 1,
      providerHttpStatus: 200 as const,
      latencyMs: 11,
    }));
    const { service, prisma } = makeService({ completeStructured });
    const result = await service.probe(projectId, { stage: 'planning' });
    expect(result.status).toBe('ok');
    expect(result.stage).toBe('planning');
    expect(result.resolvedModelId).toBe('deepseek-v4-pro');
    expect(result.attemptCount).toBe(1);
    expect(result.schemaId).toBe(DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID);
    expect(completeStructured).toHaveBeenCalledTimes(1);
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: projectId },
      include: { activeConfiguration: true },
    });
  });

  it('fails before gateway call when key is missing', async () => {
    delete process.env['DEEPSEEK_API_KEY'];
    const completeStructured = jest.fn();
    const { service } = makeService({ completeStructured });
    await expect(service.probe(projectId, {})).rejects.toBeInstanceOf(
      ProjectHttpError,
    );
    expect(completeStructured).not.toHaveBeenCalled();
  });
});
