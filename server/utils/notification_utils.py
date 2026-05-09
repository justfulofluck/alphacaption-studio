from models.notification import Notification
from extensions import db

def create_notification(user_id, title, message, type='info'):
    """
    Utility function to create a notification for a user.
    Types: info, success, warning, error
    """
    try:
        new_notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type
        )
        db.session.add(new_notification)
        db.session.commit()
        return True
    except Exception as e:
        print(f"Error creating notification: {e}")
        return False
