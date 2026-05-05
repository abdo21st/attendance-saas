from flask import Blueprint, jsonify
from utils.database import device_info
from utils.adms import command_queue

from utils.auth import login_required

api_device_bp = Blueprint('api_device', __name__)

@api_device_bp.route('/status')
@login_required
def api_status():
    return jsonify({
        'success':      True,
        'device':       device_info['sn'] or 'غير متصل',
        'connected':    device_info['connected'],
        'model':        device_info['model'],
        'last_seen':    device_info['last_seen'],
        'logs_count':   device_info['log_count'],
        'users_count':  device_info['user_count'],
        'pending_cmds': len(command_queue)
    })
