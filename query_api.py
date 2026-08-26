import urllib.request
import json

url = 'https://intrustindia.com/api/cart/validate'
req = urllib.request.Request(url, method='POST', headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, data=b'{"items": []}') as response:
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print(e.read().decode())
