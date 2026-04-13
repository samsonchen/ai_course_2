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

    # Parse and validate body
    try:
        body = json.loads(event["body"])
    except (json.JSONDecodeError, TypeError):
        return {"statusCode": 400, "body": "Missing or invalid text"}

    text = body.get("text")
    if not text or not isinstance(text, str) or len(text.strip()) == 0:
        return {"statusCode": 400, "body": "Missing or invalid text"}
    if len(text) > 1000:
        return {"statusCode": 400, "body": "Missing or invalid text"}

    # Look up sender's callsign from DynamoDB
    try:
        response = table.get_item(Key={"connectionId": connection_id})
    except Exception:
        logger.exception("Failed to get sender from DynamoDB")
        return {"statusCode": 500, "body": "Internal server error"}

    sender = response.get("Item")
    if not sender:
        return {"statusCode": 400, "body": "Unknown sender"}
    callsign = sender["callsign"]

    # Build broadcast payload
    payload = json.dumps({
        "type": "message",
        "callsign": callsign,
        "text": text,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }).encode("utf-8")

    # Scan all connections (with pagination)
    try:
        connections = []
        scan_kwargs = {"ProjectionExpression": "connectionId"}
        while True:
            scan_response = table.scan(**scan_kwargs)
            connections.extend(scan_response["Items"])
            if "LastEvaluatedKey" not in scan_response:
                break
            scan_kwargs["ExclusiveStartKey"] = scan_response["LastEvaluatedKey"]
    except Exception:
        logger.exception("Failed to scan connections from DynamoDB")
        return {"statusCode": 500, "body": "Internal server error"}

    # Fan-out: PostToConnection to all connected clients
    endpoint_url = f"https://{domain_name}/{stage}"
    apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)

    for conn in connections:
        cid = conn["connectionId"]
        try:
            apigw.post_to_connection(ConnectionId=cid, Data=payload)
        except apigw.exceptions.GoneException:
            table.delete_item(Key={"connectionId": cid})
        except Exception:
            logger.exception("Failed to send to %s", cid)

    return {"statusCode": 200, "body": "Message sent"}
