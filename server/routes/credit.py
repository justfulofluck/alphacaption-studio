from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.credit_service import CreditService

credit_bp = Blueprint('credit', __name__)

@credit_bp.route('/balance', methods=['GET'])
@jwt_required()
def get_balance():
    user_id = get_jwt_identity()
    balance = CreditService.get_balance(user_id)
    return jsonify({'balance': balance}), 200

@credit_bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    user_id = get_jwt_identity()
    history = CreditService.get_history(user_id)
    return jsonify([h.to_dict() for h in history]), 200
