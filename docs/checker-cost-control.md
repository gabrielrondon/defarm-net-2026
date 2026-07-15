# Checker cost control

## Current dormant mode

As of 2026-07-15, the Railway `checker` project is intentionally in full sleep mode to avoid paying for always-on PostGIS RAM while DeFarm Check is mostly used for demos.

Stopped services:

- `defarm-check-api`
- `check-api-worker`
- `Redis`
- `PostGIS`

Persistent volumes are not deleted:

- `postgis-volume`
- `redis-volume`

The public EUDR certificate pages should render maps from the persisted DDS snapshot first:

- `statement.origin[].polygon`
- `statement.origin[].polygon_source`
- `statement.origin[].area_ha`

The direct Check API CAR lookup remains as a fallback for older emissions that do not have a polygon in the snapshot, but it will not work while the Railway checker stack is asleep.

## Reactivate before a demo

Run this from the Check API repository:

```bash
cd /Users/gabrielrondon/defarm/check
railway redeploy -s PostGIS -y
railway redeploy -s Redis -y
railway redeploy -s defarm-check-api -y
railway redeploy -s check-api-worker -y
```

If `railway redeploy` cannot redeploy `PostGIS` or `Redis` because the latest
deployment is empty after `railway down`, use the Railway dashboard instead:

1. Open project `checker` in Railway.
2. Deploy `PostGIS`.
3. Deploy `Redis`.
4. Deploy `defarm-check-api`.
5. Deploy `check-api-worker`.

Keep the same order. The database and cache must be back before the API/worker.

Check status:

```bash
railway service status -s PostGIS --json
railway service status -s Redis --json
railway service status -s defarm-check-api --json
railway service status -s check-api-worker --json
curl -i https://defarm-check-api-production.up.railway.app/
```

Expected status after activation for each service:

```json
{
  "status": "SUCCESS",
  "stopped": false
}
```

Activation order matters: bring PostGIS and Redis back before the API and worker.

## Put it back to sleep

After the demo or refresh window:

```bash
cd /Users/gabrielrondon/defarm/check
railway down -s check-api-worker -y
railway down -s defarm-check-api -y
railway down -s Redis -y
railway down -s PostGIS -y
```

Check status:

```bash
railway service status -s check-api-worker --json
railway service status -s defarm-check-api --json
railway service status -s Redis --json
railway service status -s PostGIS --json
```

Expected dormant status for each service:

```json
{
  "stopped": true
}
```

For image services (`PostGIS`, `Redis`), Railway may report dormant state as:

```json
{
  "deploymentId": null,
  "status": null
}
```

In the full project status, this appears as `latestDeployment: null` and
`activeDeployments: []`. The volumes should still be listed under
`volumeInstances`.

## Notes

- Do not delete PostGIS volumes; they hold the seeded spatial data.
- New EUDR emissions should include the polygon in the persisted statement, so the public verifier does not need Railway Check just to draw the map.
- While asleep, `/check`, `/car/:car/geojson`, samples, source freshness, and internal compliance refresh screens are unavailable.
- The public DeFarm site and public DDS verifier should remain available because they run outside this Railway checker project.
