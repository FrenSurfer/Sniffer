import os
from dotenv import load_dotenv
from api_client import BirdeyeAPIClient

load_dotenv()

def test_api():
	api_key = os.getenv("API_KEY")
	if not api_key:
		raise ValueError("API_KEY not set in .env")
	client = BirdeyeAPIClient(api_key)

	response = client.get_token_list(limit=10)
	print(response)

if __name__ == "__main__":
	test_api()