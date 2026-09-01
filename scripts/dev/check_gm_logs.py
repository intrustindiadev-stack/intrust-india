import psycopg2
import json

def check_opt_ins():
    conn_params = {
        "host": "187.124.98.130",
        "port": 5432,
        "user": "postgres",
        "password": "postgrespassword", # Assuming standard local dev password or need to check VPS SSH config. Wait, the VPS SSH guide says we must use SSH via paramiko to run scripts on VPS, or we use the REST API. 
    }
