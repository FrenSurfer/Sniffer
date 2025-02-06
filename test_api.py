from api_client import BirdeyeAPIClient

def test_api():
	api_key = "77e7ad01541f415d99238b246b59294f"
	client = BirdeyeAPIClient(api_key)

	response = client.get_token_list(limit=10)
	print(response)

if __name__ == "__main__":
	test_api()