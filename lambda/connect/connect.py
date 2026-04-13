import json
import os
import re
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

CALLSIGN_PATTERN = re.compile(r"^[a-zA-Z0-9_]{1,20}$")


def handler(event, context):
    connection_id = event["requestContext"]["connectionId"]
    domain_name = event["requestContext"]["domainName"]
    stage = event["requestContext"]["stage"]

    params = event.get("queryStringParameters") or {}
    callsign = params.get("callsign")

    if not callsign or not CALLSIGN_PATTERN.match(callsign):
        return {"statusCode": 400, "body": "Invalid or missing callsign"}

    try:
        table.put_item(
            Item={
                "connectionId": connection_id,
                "callsign": callsign,
                "connectedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }
        )
    except Exception:
        logger.exception("Failed to write connection to DynamoDB")
        return {"statusCode": 500, "body": "Internal server error"}

    # Broadcast user_joined to existing connections (best-effort)
    try:
        _broadcast_system_event(domain_name, stage, connection_id, callsign, "user_joined")
    except Exception:
        logger.exception("Failed to broadcast user_joined event")

    return {"statusCode": 200, "body": "Connected"}


def _broadcast_system_event(domain_name, stage, new_connection_id, callsign, event_type):
    endpoint_url = f"https://{domain_name}/{stage}"
    apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)

    connections = table.scan(ProjectionExpression="connectionId")["Items"]

    payload = json.dumps({
        "type": "system",
        "event": event_type,
        "callsign": callsign,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }).encode("utf-8")

    for conn in connections:
        cid = conn["connectionId"]
        if cid == new_connection_id:
            continue
        try:
            apigw.post_to_connection(ConnectionId=cid, Data=payload)
        except apigw.exceptions.GoneException:
            table.delete_item(Key={"connectionId": cid})
        except Exception:
            logger.exception("Failed to send user_joined to %s", cid)
