import requests

url = "https://intrustindia.com/api/supabase/rest/v1/rpc/draft_cart_orders"
headers = {
    "Origin": "https://www.intrustindia.com",
    "apikey": "fake_key",
    "Authorization": "Bearer fake_token",
    "Content-Type": "application/json"
}

response = requests.post(url, headers=headers, json={"p_customer_id": "123"})
print(response.status_code, response.text)
