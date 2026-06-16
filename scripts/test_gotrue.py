import urllib.request, json
url = "https://intrustindia.com/api/supabase/auth/v1/token?grant_type=id_token"
data = json.dumps({"provider":"google", "id_token":"fake", "access_token":"fake"}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgxMzgwMjY3LCJleHAiOjIwOTY3NDAyNjd9.y6NnezLK5TqzHfwRkj4pLZL_JYG-lxFGurhhkqH9gTw"})
try:
    urllib.request.urlopen(req)
except Exception as e:
    print(e.code)
    print(e.read().decode())
