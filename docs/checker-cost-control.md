# Checker cost control

## Current dormant mode

As of 2026-07-14, the Railway `check-api-worker` service is intentionally stopped to avoid paying for always-on background cron jobs while DeFarm Check is mostly used for demos.

The public EUDR certificate pages should render maps from the persisted DDS snapshot first:

- `statement.origin[].polygon`
- `statement.origin[].polygon_source`
- `statement.origin[].area_ha`

The direct Check API CAR lookup remains as a fallback for older emissions that do not have a polygon in the snapshot.

## Reactivate before a demo

Run this from the Check API repository:

```bash
cd /Users/gabrielrondon/defarm/check
railway redeploy -s check-api-worker -y
railway service status -s check-api-worker --json
```

Expected status after activation:

```json
{
  "name": "check-api-worker",
  "status": "SUCCESS",
  "stopped": false
}
```

The API service should already stay online:

```bash
railway service status -s defarm-check-api --json
curl -i https://defarm-check-api-production.up.railway.app/
```

## Put it back to sleep

After the demo or refresh window:

```bash
cd /Users/gabrielrondon/defarm/check
railway down -s check-api-worker -y
railway service status -s check-api-worker --json
```

Expected dormant status:

```json
{
  "name": "check-api-worker",
  "stopped": true
}
```

## Notes

- Do not stop `defarm-check-api` unless public CAR fallback and internal compliance screens can be unavailable.
- Do not delete PostGIS volumes; they hold the seeded spatial data.
- New EUDR emissions should include the polygon in the persisted statement, so the public verifier does not need Railway Check just to draw the map.
