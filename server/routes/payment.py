from datetime import datetime, timedelta
import uuid

import razorpay
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from razorpay.errors import BadRequestError, SignatureVerificationError

from extensions import db
from models.credit_ledger import CreditLedger
from models.payment import Payment
from models.plan import Plan
from models.subscription import Subscription
from models.user import User
from services.credit_service import CreditService
from services.email_service import email_service

payment_bp = Blueprint('payment', __name__)


def get_razorpay_client():
    key_id = current_app.config.get('RAZORPAY_KEY_ID')
    key_secret = current_app.config.get('RAZORPAY_KEY_SECRET')
    if not key_id or not key_secret:
        return None
    return razorpay.Client(auth=(key_id, key_secret))


def apply_plan_entitlements(user_id, plan, payment):
    if getattr(plan, 'plan_type', 'subscription') != 'top_up':
        now = datetime.utcnow()
        subscription = Subscription(
            user_id=user_id,
            plan_id=plan.id,
            start_date=now,
            end_date=now + timedelta(days=plan.validity_days),
            status='active'
        )
        db.session.add(subscription)

        user = User.query.get(user_id)
        if user:
            user.plan = plan.name

    CreditService.add_credits(
        user_id=user_id,
        amount=plan.credits_included,
        source=getattr(plan, 'plan_type', 'subscription'),
        reference_id=str(payment.id),
        description=f"Subscription for {plan.name} Plan"
    )


@payment_bp.route('/plans', methods=['GET'])
def get_plans():
    plans = Plan.query.filter(
        Plan.price > 0,
        Plan.plan_type != 'trial'
    ).order_by(Plan.price.asc()).all()
    return jsonify([p.to_dict() for p in plans]), 200


@payment_bp.route('/create-order', methods=['POST'])
@jwt_required()
def create_order():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    plan_id = data.get('plan_id')

    plan = Plan.query.get(plan_id)
    if not plan:
        return jsonify({'error': 'Plan not found'}), 404

    if plan.price <= 0:
        return jsonify({'error': 'Invalid plan price'}), 400

    client = get_razorpay_client()
    if not client:
        return jsonify({'error': 'Razorpay is not configured'}), 500

    amount_in_paise = int(round(float(plan.price) * 100))
    receipt = f"rcpt_{user_id}_{plan.id}_{uuid.uuid4().hex[:10]}"

    try:
        order = client.order.create({
            'amount': amount_in_paise,
            'currency': 'INR',
            'receipt': receipt,
            'payment_capture': 1,
            'notes': {
                'user_id': str(user_id),
                'plan_id': str(plan.id),
                'plan_name': plan.name
            }
        })
    except BadRequestError as exc:
        return jsonify({'error': 'Unable to create Razorpay order', 'details': str(exc)}), 400
    except Exception as exc:
        current_app.logger.exception('Razorpay order creation failed')
        return jsonify({'error': 'Unable to create Razorpay order', 'details': str(exc)}), 500

    payment = Payment(
        user_id=user_id,
        plan_id=plan.id,
        amount=plan.price,
        payment_gateway='razorpay',
        status='pending',
        razorpay_order_id=order['id']
    )
    db.session.add(payment)
    db.session.commit()

    return jsonify({
        'key': current_app.config.get('RAZORPAY_KEY_ID'),
        'order_id': order['id'],
        'amount': order['amount'],
        'currency': order['currency'],
        'plan': plan.to_dict()
    }), 201


@payment_bp.route('/verify', methods=['POST'])
@jwt_required()
def verify_payment():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    required_fields = ('razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature')
    if not all(data.get(field) for field in required_fields):
        return jsonify({'error': 'Missing Razorpay verification fields'}), 400

    payment = Payment.query.filter_by(
        razorpay_order_id=data['razorpay_order_id'],
        user_id=user_id
    ).first()
    if not payment:
        return jsonify({'error': 'Payment record not found'}), 404

    if payment.status == 'captured':
        return jsonify({
            'message': 'Payment already verified',
            'credits_added': 0,
            'new_balance': CreditService.get_balance(user_id)
        }), 200

    client = get_razorpay_client()
    if not client:
        return jsonify({'error': 'Razorpay is not configured'}), 500

    verification_payload = {
        'razorpay_order_id': data['razorpay_order_id'],
        'razorpay_payment_id': data['razorpay_payment_id'],
        'razorpay_signature': data['razorpay_signature']
    }

    try:
        client.utility.verify_payment_signature(verification_payload)
    except SignatureVerificationError:
        payment.status = 'failed'
        payment.razorpay_payment_id = data['razorpay_payment_id']
        payment.razorpay_signature = data['razorpay_signature']
        db.session.commit()
        return jsonify({'error': 'Payment signature verification failed'}), 400

    plan = Plan.query.get(payment.plan_id)
    if not plan:
        return jsonify({'error': 'Plan not found for payment'}), 404

    payment.status = 'captured'
    payment.transaction_id = data['razorpay_payment_id']
    payment.razorpay_payment_id = data['razorpay_payment_id']
    payment.razorpay_signature = data['razorpay_signature']

    apply_plan_entitlements(user_id, plan, payment)
    db.session.commit()

    user = User.query.get(user_id)
    if user:
        email_service.send_payment_thank_you(
            to_email=user.email,
            name=user.name,
            plan_name=plan.name,
            amount=payment.amount,
            credits=plan.credits_included,
            validity_days=plan.validity_days
        )

    return jsonify({
        'message': 'Payment verified successfully',
        'credits_added': plan.credits_included,
        'new_balance': CreditService.get_balance(user_id)
    }), 200
