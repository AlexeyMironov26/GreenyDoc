# s3_service.py
import uuid
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
import os
from dotenv import load_dotenv

load_dotenv()

# Конфигурация MinIO
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "greenydoc")
MINIO_SECURE = os.getenv("MINIO_SECURE", "False").lower() == "true"

s3_client = boto3.client(
    "s3",
    endpoint_url=f"http{'s' if MINIO_SECURE else ''}://{MINIO_ENDPOINT}",
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
    config=Config(signature_version="s3v4"),
    region_name="us-east-1"
)


def ensure_bucket_exists():
    try:
        s3_client.head_bucket(Bucket=MINIO_BUCKET)
        print(f"✅ Бакет '{MINIO_BUCKET}' уже существует")
    except ClientError:
        s3_client.create_bucket(Bucket=MINIO_BUCKET)
        print(f"✅ Бакет '{MINIO_BUCKET}' создан")


def upload_file(file_bytes: bytes, original_filename: str, content_type: str) -> str:
    ext = original_filename.split('.')[-1] if '.' in original_filename else 'jpg'
    key = f"analyses/{uuid.uuid4()}.{ext}"
    s3_client.put_object(
        Bucket=MINIO_BUCKET,
        Key=key,
        Body=file_bytes,
        ContentType=content_type
    )
    return key


def generate_presigned_url(key: str, expires_in: int = 3600) -> str:
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": MINIO_BUCKET, "Key": key},
        ExpiresIn=expires_in
    )


def delete_file(key: str) -> bool:
    try:
        s3_client.delete_object(Bucket=MINIO_BUCKET, Key=key)
        return True
    except ClientError:
        return False


ensure_bucket_exists()