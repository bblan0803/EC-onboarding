import json
import redis
import os
import ssl
from datetime import datetime

def lambda_handler(event, context):
    # Handle both direct Lambda invocation and HTTP requests (API Gateway/Function URL)
    print(f"Received event: {json.dumps(event)}")
    
    # Extract HTTP method and path from different event sources
    if 'httpMethod' in event:
        # Direct Lambda invocation format
        method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        body = event.get('body', '{}')
    elif 'requestContext' in event and 'http' in event['requestContext']:
        # API Gateway v2 format
        method = event['requestContext']['http']['method']
        path = event['requestContext']['http']['path']
        body = event.get('body', '{}')
    elif 'version' in event and event['version'] == '2.0':
        # Lambda Function URL format
        method = event['requestContext']['http']['method']
        path = event['requestContext']['http']['path']
        body = event.get('body', '{}')
    else:
        # Fallback for direct invocation
        method = 'GET'
        path = '/health'
        body = '{}'

    # Connect to Valkey/Redis with TLS (required for ElastiCache Serverless)
    try:
        r = redis.Redis(
            host=os.environ.get('VALKEY_HOST', 'localhost'),
            port=int(os.environ.get('VALKEY_PORT', 6379)),
            ssl=True,
            ssl_check_hostname=False,
            ssl_cert_reqs=ssl.CERT_NONE,
            decode_responses=True,
            socket_connect_timeout=10,
            socket_timeout=10,
            retry_on_timeout=True
        )
        
        # Test connection
        r.ping()
        
    except Exception as e:
        response = {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({
                'error': f'Connection failed: {str(e)}',
                'timestamp': datetime.utcnow().isoformat()
            })
        }
        return response

    # Handle CORS preflight requests
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    # Route handling
    if path == '/health' or path == '/':
        response_body = {
            'success': True,
            'ping': 'PONG',
            'timestamp': datetime.utcnow().isoformat(),
            'method': method,
            'path': path
        }
        
    elif path == '/leaderboard' and method == 'GET':
        try:
            leaderboard = r.zrevrange('leaderboard', 0, 9, withscores=True)
            response_body = {
                'leaderboard': [{'player': player, 'score': int(score)} for player, score in leaderboard],
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': f'Failed to get leaderboard: {str(e)}',
                    'timestamp': datetime.utcnow().isoformat()
                })
            }
    
    elif path == '/score' and method == 'POST':
        try:
            # Parse body if it's a string
            if isinstance(body, str):
                body_data = json.loads(body) if body else {}
            else:
                body_data = body or {}
                
            player = body_data.get('player')
            score = body_data.get('score')
            
            if not player or score is None:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Missing player or score'})
                }
            
            r.zadd('leaderboard', {player: score})
            
            response_body = {
                'success': True,
                'message': f'Score updated for {player}: {score}',
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': f'Invalid request: {str(e)}'})
            }
    
    else:
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Endpoint not found'})
        }

    # Return successful response with CORS headers
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps(response_body)
    }
