import gspread
from google.oauth2.service_account import Credentials

def load_college_data():
    creds = Credentials.from_service_account_file("service_account.json")
    client = gspread.authorize(creds)
    sheet = client.open_by_key("1A89_szdWcAXxn9JUWoLTjum8eSTBVreGIZLBasjgO3Q").sheet1

    return sheet.get_all_records()