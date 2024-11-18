from api_client import BirdeyeAPIClient

def test_api():
    api_key = "7817826158dc4340acbb4468ab7af7a4"
    client = BirdeyeAPIClient(api_key)

    response = client.get_token_list(limit=10)
    print(response)

if __name__ == "__main__":
    test_api()