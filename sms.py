# from twilio.rest import Client

# ACCOUNT_SID = "YOUR_TWILIO_SID"
# AUTH_TOKEN = "YOUR_TWILIO_AUTH"
# TWILIO_NUMBER = "+1234567890"
# HELPLINE_NUMBER = "+91XXXXXXXXXX"

# client = Client(ACCOUNT_SID, AUTH_TOKEN)

# def send_emergency_sms(lat, lon):
#     message = f"""
#     🚨 Emergency Alert!
#     Location: https://maps.google.com/?q={lat},{lon}
#     """

#     client.messages.create(
#         body=message,
#         from_=TWILIO_NUMBER,
#         to=HELPLINE_NUMBER
#     )
import os
from twilio.rest import Client

# Read configuration from environment variables
ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_NUMBER = os.getenv('TWILIO_NUMBER')
HELPLINE_NUMBERS = os.getenv('HELPLINE_NUMBERS', '')

def _ensure_configured():
    if not ACCOUNT_SID or not AUTH_TOKEN or not TWILIO_NUMBER:
        raise RuntimeError('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_NUMBER environment variables')

def send_sms(phone, message):
    """Send SMS to a single phone number using Twilio.

    Raises RuntimeError if Twilio is not configured or Twilio exceptions on failure.
    """
    _ensure_configured()

    client = Client(ACCOUNT_SID, AUTH_TOKEN)
    return client.messages.create(
        body=message,
        from_=TWILIO_NUMBER,
        to=phone
    )

def default_helplines():
    if HELPLINE_NUMBERS.strip() == '':
        return []
    return [p.strip() for p in HELPLINE_NUMBERS.split(',') if p.strip()]