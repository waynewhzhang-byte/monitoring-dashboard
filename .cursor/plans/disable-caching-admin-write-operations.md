# Disable Caching for All Admin Write Operations

All write operations (POST, PUT, PATCH, DELETE) in `/admin` section should disable caching to ensure data is properly persisted to the database and not cached by browsers or Next.js.

## Implementation Steps

### 1. Device Management APIs
- **`src/pages/api/devices/[id].ts`**: Add cache headers to PATCH and DELETE responses
- **`src/pages/api/devices/[id]/tags.ts`**: Add cache headers to PUT response
- **`src/pages/api/devices/[id]/business-views.ts`**: Add cache headers to PUT response

### 2. Interface Management APIs
- **`src/pages/api/interfaces/[id]/tags.ts`**: Add cache headers to PUT response (verify existing)
- **`src/pages/api/interfaces/[id]/monitored.ts`**: Add cache headers to PUT response
- **`src/pages/api/interfaces/[id]/index.ts`**: Add cache headers to DELETE response

### 3. Topology Management API
- **`src/pages/api/topology/save.ts`**: Add cache headers to POST response

### 4. Business View Management APIs
- **`src/pages/api/admin/business-views.ts`**: Add cache headers to POST, PUT, DELETE responses
- **`src/pages/api/admin/views.ts`**: Add cache headers to POST, DELETE responses

## Cache Control Headers
All write operation responses should include:
```typescript
res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
res.setHeader('Pragma', 'no-cache');
res.setHeader('Expires', '0');
```

This ensures that:
- Browsers don't cache write operation responses
- Next.js doesn't cache these responses
- Proxies don't cache these responses
- Data is always fetched fresh after write operations
