"""
backend/auth.py
Flask Authentication Blueprint for CineSphere.
Provides Signup, Login, and Session Restoration endpoints via JWT.
"""

import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from backend.models import db, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')


def is_valid_email(email: str) -> bool:
    """Verifies format of an email address strictly."""
    return bool(EMAIL_REGEX.match(email))


@auth_bp.route('/signup', methods=['POST'])
def signup():
    """
    Registers a new user account.
    Payload: { name, email, password }
    """
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not name or not email or not password:
        return jsonify({"error": "Full name, email, and password are required."}), 400

    if not is_valid_email(email):
        return jsonify({"error": "Please enter a valid email address (e.g. name@example.com)."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters in length."}), 400

    # Check existing user
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "An account with this email already exists."}), 400

    # Create new user
    user = User(name=name, email=email)
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create user account. Please try again."}), 500

    # Issue JWT access token (identity is user.id string)
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Account created successfully!",
        "access_token": access_token,
        "user": user.to_dict()
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Authenticates an existing user.
    Payload: { email, password }
    """
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"error": "Both email and password are required."}), 400

    if not is_valid_email(email):
        return jsonify({"error": "Please enter a valid email address."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters in length."}), 400

    # Strictly check user existence and password hash match
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password credentials."}), 401

    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Logged in successfully!",
        "access_token": access_token,
        "user": user.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Returns authenticated user's session data given a valid JWT.
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))
    
    if not user:
        return jsonify({"error": "User session not found."}), 404

    return jsonify({
        "user": user.to_dict()
    }), 200
