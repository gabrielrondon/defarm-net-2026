# Frontend Integration Guide

Complete guide for integrating frontend applications with the DeFarm API Gateway.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│           (React, Vue, Next.js, Mobile App)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS
                         │ Single Entry Point
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    🌐 API Gateway                           │
│                    Port 8000                                │
│                                                              │
│  • JWT Validation                                           │
│  • Request Routing                                          │
│  • User Context Injection                                   │
│  • Rate Limiting                                            │
│  • Unified OpenAPI Documentation                            │
└─────┬────────────────┬───────────────┬──────────────────────┘
      │                │               │
      ▼                ▼               ▼
┌──────────┐     ┌──────────┐   ┌──────────────┐
│   Auth   │     │   DFID   │   │     Item     │
│ Service  │     │ Service  │   │   Registry   │
│  :3001   │     │  :3000   │   │    :8080     │
└──────────┘     └──────────┘   └──────────────┘
```

## 🎯 Key Principle: Single Entry Point

**Important**: Your frontend should ONLY communicate with the **API Gateway**.

❌ **Don't**:
```typescript
// DON'T directly call backend services
fetch('https://auth-service-production.railway.app/login')
fetch('https://item-registry-production.railway.app/items')
```

✅ **Do**:
```typescript
// DO call everything through the gateway
fetch('https://gateway-production.railway.app/auth/login')
fetch('https://gateway-production.railway.app/api/items')
```

---

## 📖 API Documentation

### Access Swagger UI

**Development**: http://localhost:8000/swagger-ui
**Production**: https://gateway-service-production-f54d.up.railway.app/swagger-ui

The Swagger UI provides:
- ✅ Complete API reference (all endpoints from all services)
- ✅ Interactive testing ("Try it out" button)
- ✅ Request/response schemas
- ✅ Authentication flows
- ✅ Code examples

### Download OpenAPI Spec

**JSON Format**: `GET /api-docs/openapi.json`

Use this to generate:
- TypeScript types
- API client code
- Frontend SDKs

---

## 🔐 Authentication Flow

### 1. Register a New User

```typescript
const response = await fetch('http://localhost:8000/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
    name: 'John Doe'
  })
});

const data = await response.json();
console.log(data); // { id, email, name }
```

### 2. Login

```typescript
const response = await fetch('http://localhost:8000/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!'
  })
});

const data = await response.json();
/*
{
  access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  token_type: "Bearer",
  expires_in: 900, // 15 minutes
  user: {
    id: "uuid",
    email: "user@example.com",
    name: "John Doe",
    workspace_id: "uuid",
    workspace_slug: "johns-workspace",
    role: "owner"
  }
}
*/

// Store tokens securely
localStorage.setItem('access_token', data.access_token);
localStorage.setItem('refresh_token', data.refresh_token);
```

### 3. Use Access Token

```typescript
const accessToken = localStorage.getItem('access_token');

const response = await fetch('http://localhost:8000/api/items', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
});

const items = await response.json();
```

### 4. Refresh Token When Expired

```typescript
// When you get a 401 Unauthorized response
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');

  const response = await fetch('http://localhost:8000/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refresh_token: refreshToken
    })
  });

  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    return data.access_token;
  } else {
    // Refresh token expired, redirect to login
    window.location.href = '/login';
  }
}
```

### 5. Logout

```typescript
const refreshToken = localStorage.getItem('refresh_token');
const accessToken = localStorage.getItem('access_token');

await fetch('http://localhost:8000/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    refresh_token: refreshToken
  })
});

// Clear local storage
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
```

---

## 📡 API Client Example (React + TypeScript)

### Create an API Client

```typescript
// src/api/client.ts
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;

    // Add access token if available
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
      };
    }

    // Add Content-Type for JSON requests
    if (options.body && typeof options.body === 'string') {
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
      };
    }

    let response = await fetch(url, options);

    // Handle token expiration (401 Unauthorized)
    if (response.status === 401 && accessToken) {
      // Try to refresh token
      const newToken = await this.refreshToken();
      if (newToken) {
        // Retry request with new token
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
        };
        response = await fetch(url, options);
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  private async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        return data.access_token;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    // Refresh failed, redirect to login
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    return null;
  }

  // Auth methods
  async register(email: string, password: string, name: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);

    return data;
  }

  async logout() {
    const refreshToken = localStorage.getItem('refresh_token');
    await this.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Item methods
  async getItems(circuitId?: string) {
    const query = circuitId ? `?circuit_id=${circuitId}` : '';
    return this.request(`/api/items${query}`);
  }

  async createItem(data: any) {
    return this.request('/api/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getItem(id: string) {
    return this.request(`/api/items/${id}`);
  }

  // Circuit methods
  async getCircuits() {
    return this.request('/api/circuits');
  }

  async createCircuit(data: any) {
    return this.request('/api/circuits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // DFID methods
  async generateDFID(valueChain: string, country: string, year: number) {
    return this.request('/api/dfid/generate', {
      method: 'POST',
      body: JSON.stringify({ value_chain: valueChain, country, year }),
    });
  }

  async validateDFID(dfid: string) {
    return this.request('/api/dfid/validate', {
      method: 'POST',
      body: JSON.stringify({ dfid }),
    });
  }
}

// Export singleton instance
export const api = new ApiClient(
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
);
```

### Use in React Components

```typescript
// src/components/ItemList.tsx
import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function ItemList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadItems() {
      try {
        const data = await api.getItems();
        setItems(data.items);
      } catch (error) {
        console.error('Failed to load items:', error);
      } finally {
        setLoading(false);
      }
    }

    loadItems();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Items</h2>
      {items.map(item => (
        <div key={item.id}>{item.dfid}</div>
      ))}
    </div>
  );
}
```

---

## 🔧 Environment Configuration

### Development (.env.development)

```bash
VITE_API_BASE_URL=http://localhost:8000
```

### Production (.env.production)

```bash
VITE_API_BASE_URL=https://gateway-service-production-f54d.up.railway.app
```

---

## 🚨 Common Pitfalls

### ❌ Don't call backend services directly

```typescript
// WRONG - bypasses gateway, won't work in production
fetch('https://auth-service.railway.app/login')
```

### ❌ Don't hardcode tokens

```typescript
// WRONG - insecure
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### ❌ Don't forget Authorization header

```typescript
// WRONG - will get 401 Unauthorized
fetch('/api/items'); // Missing Authorization header
```

### ✅ Always use the gateway

```typescript
// CORRECT
fetch('https://gateway-production.railway.app/api/items', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

---

## 📊 Endpoint Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | ❌ | Gateway health check |
| `/swagger-ui` | GET | ❌ | API documentation |
| `/api-docs/openapi.json` | GET | ❌ | OpenAPI spec |
| `/auth/register` | POST | ❌ | Register new user |
| `/auth/login` | POST | ❌ | Login and get tokens |
| `/auth/refresh` | POST | ❌ | Refresh access token |
| `/auth/logout` | POST | ✅ | Logout |
| `/api/items` | GET | ✅ | List items |
| `/api/items` | POST | ✅ | Create item |
| `/api/items/:id` | GET | ✅ | Get item |
| `/api/circuits` | GET | ✅ | List circuits |
| `/api/circuits` | POST | ✅ | Create circuit |
| `/api/dfid/generate` | POST | ✅ | Generate DFID |
| `/api/dfid/validate` | POST | ✅ | Validate DFID |

✅ = Requires JWT token in Authorization header

---

## 🎓 Best Practices

1. **Use Environment Variables**: Never hardcode the API URL
2. **Implement Token Refresh**: Handle 401 errors gracefully
3. **Store Tokens Securely**: Use httpOnly cookies in production
4. **Use TypeScript**: Generate types from OpenAPI spec
5. **Handle Errors**: Show user-friendly error messages
6. **Loading States**: Provide feedback during API calls
7. **Retry Logic**: Implement exponential backoff for failed requests

---

## 🔗 Resources

- **Swagger UI**: http://localhost:8000/swagger-ui (development)
- **OpenAPI Spec**: http://localhost:8000/api-docs/openapi.json
- **Production Gateway**: https://gateway-service-production-f54d.up.railway.app

---

## ❓ Questions?

For questions about the API:
1. Check the Swagger UI documentation
2. Review this guide
3. Contact the backend team

Happy coding! 🚀
