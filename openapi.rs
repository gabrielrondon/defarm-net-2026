use utoipa::OpenApi;

/// OpenAPI documentation for item-registry service
///
/// Complete API documentation for the DeFarm Item Registry service.
/// This is the Layer 2 registry in the DeFarm architecture.
#[derive(OpenApi)]
#[openapi(
    info(
        title = "DeFarm Item Registry API",
        version = "0.1.0",
        description = r#"
# DeFarm Item Registry API

**Layer 2 Registry Service** - Core registry for items, circuits, events, and collaboration in the DeFarm ecosystem.

## Overview

The Item Registry is a production-ready service providing comprehensive tracking, verification, and collaboration
features for agricultural supply chains. It integrates with the DFID service (Layer 1) for unique identifier generation.

## Core Features

### 🎯 Item Management (10 endpoints)
- **CRUD Operations**: Create, read, update, delete items with DFIDs
- **Bulk Import**: CSV ingestion with automatic DFID generation and identifier resolution
- **Workflows**: Merge/split items, track relationships and provenance
- **Status Tracking**: Update item status, archive items

### 🔄 Circuit Collaboration (10 endpoints)
- **Circuit Management**: Create collaborative data-sharing circuits
- **Member Management**: Add/remove members, manage roles and permissions
- **Access Control**: Public/private circuits, organization-based access

### 📊 Event Tracking (3 endpoints)
- **Event Recording**: Track lifecycle events (birth, weight, transfers, etc.)
- **Status Updates**: Modify event status (pending, verified, disputed)
- **Event Queries**: Filter and retrieve event history

### 🔍 Audit & Verification (3 endpoints)
- **Immutable Audit Trail**: Hash-chained audit logs for tamper detection
- **Hash Chain Verification**: Verify integrity of audit logs
- **Complete History**: Track all system changes with user attribution

### 🔔 Webhooks & Notifications (8 endpoints)
- **Webhook Management**: Create, update, delete webhooks for real-time notifications
- **Event Subscriptions**: Subscribe to item, circuit, and event changes
- **Delivery Tracking**: Monitor webhook delivery status, retries, and failures
- **Statistics**: View webhook performance metrics

### 📈 Activity Tracking (6 endpoints)
- **Activity Feeds**: User, circuit, and public activity streams
- **Session Management**: Track active user sessions
- **Recent Activity**: Quick access to latest actions
- **Activity Summaries**: Aggregated statistics by day/week/month

### 💾 State Management (11 endpoints)
- **Snapshots**: Create point-in-time snapshots of circuit/item state
- **Comparisons**: Compare snapshots to track changes over time
- **Restoration**: Rollback to previous states
- **Retention Policies**: Automatic cleanup of old snapshots

### 🌳 Merkle Tree Verification (8 endpoints)
- **Tree Building**: Create Merkle trees from batches of data
- **Proof Generation**: Generate cryptographic inclusion proofs
- **Proof Verification**: Verify data integrity efficiently
- **Verification Logs**: Track all verification operations

### 🔑 Admin & Monitoring (3 endpoints)
- **API Key Management**: Create and manage circuit-scoped API keys
- **Health Checks**: Service health and database connectivity
- **Metrics**: Prometheus-compatible metrics for monitoring

## Architecture

**Technology Stack:**
- **Language**: Rust 1.75+
- **Framework**: Axum 0.7 (async)
- **Database**: PostgreSQL 15+ (39 tables)
- **Cache**: Redis 7+ (sequences, caching)
- **Hashing**: BLAKE3 (checksums, Merkle trees)

**Integration:**
- **DFID Service**: Calls Layer 1 for unique identifier generation
- **External Systems**: Webhooks for event notifications
- **Blockchain Ready**: Merkle trees and audit trails for immutability

## Authentication

**Current**: API key authentication for bulk ingestion endpoints
**Planned**: JWT tokens, OAuth2, role-based access control (RBAC)

## Base URLs
- **Development**: http://localhost:8080
- **Production**: https://item-registry.railway.app

## Response Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `204 No Content` - Successful deletion
- `400 Bad Request` - Invalid input or validation error
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource or conflict
- `500 Internal Server Error` - Server error
- `501 Not Implemented` - Feature not yet available

## Rate Limiting

Not currently enforced. Future versions will implement per-API-key rate limits.

## Pagination

List endpoints support pagination via `limit` and `offset` query parameters:
- `limit`: Maximum number of results (default: 50, max: 1000)
- `offset`: Number of results to skip (default: 0)

## Error Response Format

All errors return a consistent JSON structure:
```json
{
  "error": "error_type",
  "message": "Human-readable message",
  "details": "Optional detailed information"
}
```

## Total Endpoints: 64

Grouped by category for easy navigation. See tags below for detailed documentation.
"#,
        contact(
            name = "DeFarm Team",
            email = "api@defarm.com"
        ),
        license(
            name = "Proprietary"
        )
    ),
    servers(
        (url = "http://localhost:8080", description = "Local development"),
        (url = "https://item-registry-production.up.railway.app", description = "Production")
    ),
    paths(
        // Health check
        crate::api::health::health_check,

        // Items endpoints
        crate::api::items::create_item,
        crate::api::items::get_item,
        crate::api::items::list_items,
        crate::api::items::update_item,
        crate::api::items::update_item_status,
        crate::api::items::delete_item,

        // Bulk ingestion endpoint
        crate::api::ingestion::bulk_ingest,

        // Workflow endpoints (merge/split operations)
        crate::api::workflows::merge_items,
        crate::api::workflows::split_item,
        crate::api::workflows::unmerge_item,
        crate::api::workflows::get_item_relationships,

        // Circuits endpoints
        crate::api::circuits::create_circuit,
        crate::api::circuits::get_circuit,
        crate::api::circuits::list_circuits,
        crate::api::circuits::update_circuit,
        crate::api::circuits::delete_circuit,

        // Circuit members endpoints
        crate::api::circuits::add_member,
        crate::api::circuits::get_member,
        crate::api::circuits::list_members,
        crate::api::circuits::update_member,
        crate::api::circuits::remove_member,

        // Events endpoints
        crate::api::events::list_events,
        crate::api::events::get_event,
        crate::api::events::update_event_status,

        // Audit endpoints
        crate::api::audit::list_audit_logs,
        crate::api::audit::get_audit_log,
        crate::api::audit::verify_hash_chain,

        // Admin endpoints (API key management)
        crate::api::admin_keys::create_api_key,
        crate::api::admin_keys::list_api_keys,

        // Webhook endpoints (Phase 5.1)
        crate::api::webhooks::create_webhook,
        crate::api::webhooks::get_webhook,
        crate::api::webhooks::list_webhooks,
        crate::api::webhooks::update_webhook,
        crate::api::webhooks::delete_webhook,
        crate::api::webhooks::get_webhook_deliveries,
        crate::api::webhooks::get_webhook_stats,
        crate::api::webhooks::retry_webhook,

        // Activity endpoints (Phase 5.3)
        crate::api::activity::get_user_activity_feed,
        crate::api::activity::get_circuit_activity_feed,
        crate::api::activity::get_public_activity_feed,
        crate::api::activity::get_recent_activity,
        crate::api::activity::get_active_sessions,
        crate::api::activity::get_activity_summaries,

        // Snapshot endpoints (Phase 6.1)
        crate::api::snapshots::create_snapshot,
        crate::api::snapshots::get_snapshot,
        crate::api::snapshots::list_snapshots,
        crate::api::snapshots::delete_snapshot,
        crate::api::snapshots::archive_snapshot,
        crate::api::snapshots::create_comparison,
        crate::api::snapshots::get_comparison,
        crate::api::snapshots::create_restoration,
        crate::api::snapshots::update_restoration_status,
        crate::api::snapshots::get_retention_policies,
        crate::api::snapshots::apply_retention_policy,

        // Merkle tree endpoints (Phase 6.2)
        crate::api::merkle::create_merkle_tree,
        crate::api::merkle::get_merkle_tree,
        crate::api::merkle::list_merkle_trees,
        crate::api::merkle::delete_merkle_tree,
        crate::api::merkle::generate_proof,
        crate::api::merkle::verify_proof,
        crate::api::merkle::verify_tree,
        crate::api::merkle::get_verifications,
    ),
    components(
        schemas(
            // Response types
            crate::api::health::HealthResponse,
            crate::api::health::HealthStatus,

            // Models
            crate::models::Item,
            crate::models::Circuit,
            crate::models::CircuitMember,
            crate::models::Event,
            crate::models::AuditLog,

            // Items Request/Response DTOs
            crate::api::items::CreateItemRequest,
            crate::api::items::UpdateItemRequest,
            crate::api::items::UpdateItemStatusRequest,
            crate::api::items::ItemResponse,
            crate::api::items::ListItemsResponse,

            // Workflow Request/Response DTOs
            crate::api::workflows::MergeItemsRequest,
            crate::api::workflows::MergeItemsResponse,
            crate::api::workflows::SplitItemRequest,
            crate::api::workflows::SplitItemResponse,
            crate::api::workflows::UnmergeItemRequest,
            crate::api::workflows::UnmergeItemResponse,

            // Ingestion DTOs
            crate::ingestion::models::IngestionReceipt,
            crate::ingestion::models::IngestionSummary,
            crate::ingestion::models::TrustLevel,

            // Circuits Request/Response DTOs
            crate::api::circuits::CreateCircuitRequest,
            crate::api::circuits::UpdateCircuitRequest,
            crate::api::circuits::CircuitResponse,
            crate::api::circuits::ListCircuitsResponse,
            crate::api::circuits::AddMemberRequest,
            crate::api::circuits::UpdateMemberRequest,
            crate::api::circuits::CircuitMemberResponse,
            crate::api::circuits::ListMembersResponse,

            // Events Request/Response DTOs
            crate::api::events::UpdateEventStatusRequest,
            crate::api::events::EventResponse,
            crate::api::events::ListEventsResponse,

            // Audit Response DTOs
            crate::api::audit::AuditLogResponse,
            crate::api::audit::ListAuditLogsResponse,
            crate::api::audit::HashChainVerificationResponse,

            // Admin Request/Response DTOs
            crate::api::admin_keys::CreateApiKeyRequest,
            crate::api::admin_keys::CreateApiKeyResponse,

            // Webhook models (Phase 5.1)
            crate::models::Webhook,
            crate::models::WebhookDelivery,
            crate::models::WebhookStats,
            crate::models::CreateWebhookInput,
            crate::models::UpdateWebhookInput,
            crate::models::WebhookRetryConfig,

            // Activity models (Phase 5.3)
            crate::models::ActivityFeed,
            crate::models::RecentActivity,
            crate::models::UserSession,
            crate::models::ActivitySummary,
            crate::models::CreateActivityInput,

            // Snapshot models (Phase 6.1)
            crate::models::Snapshot,
            crate::models::SnapshotComparison,
            crate::models::SnapshotRestoration,
            crate::models::SnapshotRetentionPolicy,
            crate::api::snapshots::CreateSnapshotRequest,
            crate::api::snapshots::CreateComparisonRequest,
            crate::api::snapshots::CreateRestorationRequest,
            crate::api::snapshots::UpdateRestorationStatusRequest,
            crate::api::snapshots::SnapshotResponse,
            crate::api::snapshots::ListSnapshotsResponse,
            crate::api::snapshots::ComparisonResponse,
            crate::api::snapshots::RestorationResponse,
            crate::api::snapshots::RetentionPolicyResponse,
            crate::api::snapshots::ApplyRetentionResponse,

            // Merkle tree models (Phase 6.2)
            crate::models::MerkleTree,
            crate::models::MerkleNode,
            crate::models::MerkleProof,
            crate::models::MerkleVerification,
            crate::api::merkle::CreateMerkleTreeRequest,
            crate::api::merkle::GenerateProofRequest,
            crate::api::merkle::VerifyProofRequest,
            crate::api::merkle::MerkleTreeResponse,
            crate::api::merkle::ListMerkleTreesResponse,
            crate::api::merkle::ProofResponse,
            crate::api::merkle::VerificationResponse,
            crate::api::merkle::VerificationHistoryResponse,

            // Error response
            crate::error::ErrorResponse,
        )
    ),
    tags(
        (name = "health", description = "Health check and monitoring endpoints"),
        (name = "items", description = "Item registry CRUD operations and bulk import"),
        (name = "workflows", description = "Item merge, split, unmerge, and relationship tracking"),
        (name = "circuits", description = "Circuit and member management"),
        (name = "events", description = "Event tracking and lifecycle management"),
        (name = "audit", description = "Immutable audit logs with hash chain verification"),
        (name = "admin", description = "Administrative operations and API key management"),
        (name = "webhooks", description = "Webhook subscriptions and delivery tracking"),
        (name = "activity", description = "Activity feeds, sessions, and user tracking"),
        (name = "snapshots", description = "Point-in-time snapshots with restore capabilities"),
        (name = "merkle", description = "Merkle tree construction and cryptographic verification")
    )
)]
pub struct ApiDoc;
