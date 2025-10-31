"""Create database if it doesn't exist."""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os

# Connect to PostgreSQL server
conn = psycopg2.connect(
    host=os.environ.get('DB_HOST', 'db'),
    port=os.environ.get('DB_PORT', '5432'),
    user=os.environ.get('DB_USER', 'postgres'),
    password=os.environ.get('DB_PASSWORD', 'postgres'),
    database='postgres'  # Connect to default database
)
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

cursor = conn.cursor()

# Check if database exists
db_name = os.environ.get('DB_NAME', 'emocare_db')
cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'")
exists = cursor.fetchone()

if not exists:
    cursor.execute(f'CREATE DATABASE {db_name}')
    print(f"Database '{db_name}' created successfully")
else:
    print(f"Database '{db_name}' already exists")

cursor.close()
conn.close()
