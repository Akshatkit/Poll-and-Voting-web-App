from flask import Flask, jsonify, request, session, render_template
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json
import os


app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///polls.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


os.makedirs('templates', exist_ok=True)
os.makedirs('static/css', exist_ok=True)
os.makedirs('static/js', exist_ok=True)

db = SQLAlchemy(app)

# Making class Model for user, poll, and vote
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), default='user')  # 'admin' or 'user'
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role
        }

class Poll(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    question = db.Column(db.String(200), nullable=False)
    options = db.Column(db.Text, nullable=False)  # JSON string of options
    closing_date = db.Column(db.DateTime, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    is_closed = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'question': self.question,
            'options': json.loads(self.options),
            'closing_date': self.closing_date.isoformat(),
            'created_by': self.created_by,
            'is_closed': self.is_closed
        }

class Vote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    poll_id = db.Column(db.Integer, db.ForeignKey('poll.id'), nullable=False)
    option_index = db.Column(db.Integer, nullable=False)
    
    # Ensure one vote per user per poll
    __table_args__ = (db.UniqueConstraint('user_id', 'poll_id', name='unique_user_poll'),)

# Making routes for the app
@app.route('/')
def index():
    return render_template('index.html')

# User registration router
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    hashed_password = generate_password_hash(password)
    user = User(username=username, password=hashed_password, role=role)
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User created successfully'}), 201

# User login router
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    
    if user and check_password_hash(user.password, password):
        session['user_id'] = user.id
        session['username'] = user.username
        session['role'] = user.role
        return jsonify({'message': 'Login successful', 'user': user.to_dict()}), 200
    
    return jsonify({'error': 'Invalid credentials'}), 401

# User logout router
@app.route('/api/logout')
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

# Poll management routes
@app.route('/api/polls', methods=['GET'])
def get_polls():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    polls = Poll.query.all()
    poll_list = []
    
    for poll in polls:
        poll_data = poll.to_dict()
        # Check if user has voted on this poll
        vote = Vote.query.filter_by(user_id=user_id, poll_id=poll.id).first()
        poll_data['has_voted'] = vote is not None
        if vote:
            poll_data['user_vote'] = vote.option_index
        poll_list.append(poll_data)
    
    return jsonify(poll_list), 200

# Create, update, delete poll routes (admin only)
@app.route('/api/polls', methods=['POST'])
def create_poll():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = User.query.get(user_id)
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.get_json()
    question = data.get('question')
    options = data.get('options')
    closing_date = data.get('closing_date')
    
    if not question or not options or len(options) < 2 or not closing_date:
        return jsonify({'error': 'Question, at least 2 options, and closing date required'}), 400
    
    try:
        closing_datetime = datetime.fromisoformat(closing_date)
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    poll = Poll(
        question=question,
        options=json.dumps(options),
        closing_date=closing_datetime,
        created_by=user_id
    )
    
    db.session.add(poll)
    db.session.commit()
    
    return jsonify(poll.to_dict()), 201

@app.route('/api/polls/<int:poll_id>', methods=['PUT'])
def update_poll(poll_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = User.query.get(user_id)
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    poll = Poll.query.get_or_404(poll_id)
    data = request.get_json()
    
    if 'question' in data:
        poll.question = data['question']
    
    if 'options' in data:
        if len(data['options']) < 2:
            return jsonify({'error': 'At least 2 options required'}), 400
        poll.options = json.dumps(data['options'])
    
    if 'closing_date' in data:
        try:
            poll.closing_date = datetime.fromisoformat(data['closing_date'])
        except ValueError:
            return jsonify({'error': 'Invalid date format'}), 400
    
    if 'is_closed' in data:
        poll.is_closed = data['is_closed']
    
    db.session.commit()
    
    return jsonify(poll.to_dict()), 200

@app.route('/api/polls/<int:poll_id>', methods=['DELETE'])
def delete_poll(poll_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = User.query.get(user_id)
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    poll = Poll.query.get_or_404(poll_id)
    
    # Delete associated votes
    Vote.query.filter_by(poll_id=poll_id).delete()
    
    db.session.delete(poll)
    db.session.commit()
    
    return jsonify({'message': 'Poll deleted successfully'}), 200

@app.route('/api/polls/<int:poll_id>/vote', methods=['POST'])
def vote(poll_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    poll = Poll.query.get_or_404(poll_id)
    
    # Check if poll is closed
    if poll.is_closed or datetime.utcnow() > poll.closing_date:
        return jsonify({'error': 'Poll is closed'}), 400
    
    # Check if user has already voted
    existing_vote = Vote.query.filter_by(user_id=user_id, poll_id=poll_id).first()
    if existing_vote:
        return jsonify({'error': 'You have already voted on this poll'}), 400
    
    data = request.get_json()
    option_index = data.get('option_index')
    
    if option_index is None or option_index < 0 or option_index >= len(json.loads(poll.options)):
        return jsonify({'error': 'Invalid option'}), 400
    
    vote = Vote(user_id=user_id, poll_id=poll_id, option_index=option_index)
    db.session.add(vote)
    db.session.commit()
    
    return jsonify({'message': 'Vote recorded successfully'}), 200

@app.route('/api/polls/<int:poll_id>/results')
def get_results(poll_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    poll = Poll.query.get_or_404(poll_id)
    
    # Check if user has voted
    user_vote = Vote.query.filter_by(user_id=user_id, poll_id=poll_id).first()
    if not user_vote:
        return jsonify({'error': 'You must vote first to see results'}), 403
    
    # Check if poll is closed
    if not poll.is_closed and datetime.utcnow() < poll.closing_date:
        return jsonify({'error': 'Poll is still open'}), 400
    
    # Get all votes for this poll
    votes = Vote.query.filter_by(poll_id=poll_id).all()
    
    # Count votes per option
    options = json.loads(poll.options)
    results = [0] * len(options)
    
    for vote in votes:
        results[vote.option_index] += 1
    
    return jsonify({
        'poll': poll.to_dict(),
        'results': results,
        'total_votes': len(votes)
    }), 200

@app.route('/api/me')
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = User.query.get(user_id)
    return jsonify(user.to_dict()), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)