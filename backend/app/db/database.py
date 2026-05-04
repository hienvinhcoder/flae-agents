from google.cloud import firestore
import firedantic

def setup_database():
    """
    Initialize Firestore client and configure firedantic.
    It automatically uses GOOGLE_APPLICATION_CREDENTIALS from environment variables.
    """
    db = firestore.Client()
    firedantic.configure(db)
