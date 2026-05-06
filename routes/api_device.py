from flask import Blueprint, jsonify
from utils.database import device_info
from utils.adms import command_queues

from utils.auth import login_required

api_device_bp = Blueprint('api_device', __name__)

@api_device_bp.route('/status')
@login_required
def api_status():
    # في نظام الشركات المتعددة، نحتاج لمعرفة أي جهاز نراقب. 
    # حالياً سنقوم بجمع عدد الأوامر المعلقة لكل الأجهزة كإحصائية عامة أو لجهاز محدد
    total_pending = sum(len(q) for q in command_queues.values())
    
    return jsonify({
        'success':      True,
        'device':       device_info['sn'] or 'غير متصل',
        'connected':    device_info['connected'],
        'model':        device_info['model'],
        'last_seen':    device_info['last_seen'],
        'logs_count':   device_info['log_count'],
        'users_count':  device_info['user_count'],
        'pending_cmds': total_pending
    })
