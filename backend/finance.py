import os
import httpx
from dotenv import load_dotenv


load_dotenv()


API_KEY = os.getenv("COINGECKO_API_KEY")
BASE_URL = "https://api.coingecko.com/api/v3"


def get_headers():
    """Constructs the required headers for the CoinGecko API."""
    #The free tier of CoinGecko uses this specific header key
    return {
        "accept": "application/json",
        "x-cg-demo-api-key": API_KEY
    }


async def get_live_price(currency: str = "bitcoin", result_currency: str = "usd") -> float:
    """Fetches the current price of a cryptocurrency in USD."""
    url = f"{BASE_URL}/simple/price"
    params = {
        "ids": currency.lower(),
        "vs_currencies": result_currency.lower()
    }
    
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=get_headers(), params=params)
        response.raise_for_status() #Throws an error if the API fails
        
        data = response.json()
        
        coin_data = data.get(currency.lower())
        if not coin_data:
            raise ValueError(f"CoinGecko could not find data for cryptocurrency: '{currency}'")
        
        price = coin_data.get(result_currency.lower())
        if price is None:
            raise ValueError(f"CoinGecko does not support the fiat currency: '{result_currency}'")
        
        return price

async def get_price_history(currency: str = "bitcoin", result_currency: str = "usd", days: int = 7) -> list:
    """Fetches historical price data to draw the inline chart."""
    url = f"{BASE_URL}/coins/{currency.lower()}/market_chart"
    params = {
        "vs_currency": result_currency.lower(),
        "days": days
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=get_headers(), params=params)
        response.raise_for_status()
        
        data = response.json()
        

        prices_array = data.get("prices")
        

        if not prices_array or not isinstance(prices_array, list):
            raise ValueError(f"Could not retrieve price history for '{currency}' in '{result_currency}'.")

        #The prices are returned as a dictionary for recharts to use
        prices = [
            {
                "timestamp": point[0], 
                "price": point[1]
            } 
            for point in prices_array
        ]
        return prices
