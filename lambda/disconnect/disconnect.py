import json
import os
import logging
from datetime import datetime, timezone

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]

dynamodb = boto3.resource(
    "dynamodb",
    endpoint_url=os.environ.get("DYNAMODB_ENDPOINT"),
)
table = dynamodb.Table(TABLE_NAME)


def handler(event, context):
    connection_id = event["requestContext"]["connectionId"]
    domain_name = event["requestContext"]["domainName"]
    stage = event["requestContext"]["stage"]

    # Get callsign before deletion (for broadcast)
    callsign = "unknown"
    try:
        response = table.get_item(Key={"connectionId": connection_id})
        callsign = response.get("Item", {}).get("callsign", "unknown")
    except Exception:
        logger.exception("Failed to get connection item for %s", connection_id)

    # Delete the connection record
    try:
        table.delete_item(Key={"connectionId": connection_id})
    except Exception:
        logger.exception("Failed to delete connection %s from DynamoDB", connection_id)
        return {"statusCode": 500, "body": "Internal server error"}

    # Broadcast user_left to remaining connections (best-effort)
    try:
        _broadcast_system_event(domain_name, stage, callsign)
    except Exception:
        logger.exception("Failed to broadcast user_left event")

    return {"statusCode": 200, "body": "Disconnected"}


def _broadcast_system_event(domain_name, stage, callsign):
    endpoint_url = f"https://{domain_name}/{stage}"
    apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)

    connections = table.scan(ProjectionExpression="connectionId")["Items"]

    payload = json.dumps({
        "type": "system",
        "event": "user_left",
        "callsign": callsign,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }).encode("utf-8")

    for conn in connections:
        cid = conn["connectionId"]
        try:
            apigw.post_to_connection(ConnectionId=cid, Data=payload)
        except apigw.exceptions.GoneException:
            table.delete_item(Key={"connectionId": cid})
        except Exception:
            logger.exception("Failed to send user_left to %s", cid)
