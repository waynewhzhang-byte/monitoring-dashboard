import { normalizeGetBVDetailsPayload } from './normalize-get-bv-details';

describe('normalizeGetBVDetailsPayload', () => {
  it('returns null for null/undefined input', () => {
    expect(normalizeGetBVDetailsPayload(null)).toBeNull();
    expect(normalizeGetBVDetailsPayload(undefined)).toBeNull();
  });

  it('reads top-level deviceProperties and linkProperties', () => {
    const raw = {
      deviceProperties: [{ id: 'a' }],
      linkProperties: [{ id: 'l' }],
    };
    const n = normalizeGetBVDetailsPayload(raw);
    expect(n?.deviceProperties).toHaveLength(1);
    expect(n?.linkProperties).toHaveLength(1);
  });

  it('unwraps nested getBVDetails', () => {
    const raw = {
      getBVDetails: {
        deviceProperties: [{ objName: 'd1' }],
        linkProperties: [],
      },
    };
    const n = normalizeGetBVDetailsPayload(raw);
    expect(n?.deviceProperties).toHaveLength(1);
    expect(n?.linkProperties).toHaveLength(0);
  });

  it('supports DeviceProperties / LinkProperties casing', () => {
    const raw = {
      DeviceProperties: [{ x: 1 }],
      LinkProperties: [{ y: 2 }],
    };
    const n = normalizeGetBVDetailsPayload(raw);
    expect(n?.deviceProperties).toHaveLength(1);
    expect(n?.linkProperties).toHaveLength(1);
  });

  it('returns empty arrays when no topology keys exist', () => {
    const n = normalizeGetBVDetailsPayload({ foo: 'bar' });
    expect(n?.deviceProperties).toEqual([]);
    expect(n?.linkProperties).toEqual([]);
  });
});
