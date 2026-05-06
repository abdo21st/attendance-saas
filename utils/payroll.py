from datetime import datetime, timedelta

def calculate_salary(customer_id, pin, logs, extra_tasks, rules, hourly_rate):
    """
    محرك الحسابات المالي: يحسب الراتب، مكافأة التميز، والمهام الإضافية.
    """
    total_hours = 0.0
    shifts = []
    current_in = None
    
    # 1. تحليل الورديات (Shifts)
    logs.sort(key=lambda x: x['timestamp'])
    for log in logs:
        dt = datetime.strptime(log['timestamp'], '%Y-%m-%d %H:%M:%S')
        if current_in is None:
            current_in = dt
        else:
            diff = dt - current_in
            # إذا كان الفرق أكثر من 12 ساعة، نعتبر الدخول السابق "بدون خروج"
            if diff.total_seconds() > 12 * 3600:
                shifts.append({'in': current_in, 'out': None, 'hours': 0.0})
                current_in = dt
            else:
                hours = round(diff.total_seconds() / 3600, 2)
                shifts.append({'in': current_in, 'out': dt, 'hours': hours})
                current_in = None
    
    if current_in:
        shifts.append({'in': current_in, 'out': None, 'hours': 0.0})
    
    total_hours = sum(s['hours'] for s in shifts)
    base_salary = total_hours * hourly_rate
    
    # 2. تطبيق قواعد التميز (Premium Rules)
    # مثال: "مكافأة 10$ لكل وردية تزيد عن 8 ساعات"
    premium_bonus = 0.0
    applied_rules = []
    
    for rule in rules:
        # إذا كانت القاعدة تنطبق على موظف معين أو كل الموظفين
        if rule.get('user_pin') and rule['user_pin'] != pin:
            continue
            
        if rule['rule_type'] == 'shift_bonus':
            # مثال: مكافأة لكل وردية مكتملة
            for s in shifts:
                if s['out']:
                    premium_bonus += float(rule['rate_value'])
                    applied_rules.append(f"مكافأة وردية: {rule['name']}")
        
        elif rule['rule_type'] == 'daily_hours':
            # مثال: إذا تجاوز مجموع ساعات اليوم 8 ساعات
            # (تحتاج لتجميع الورديات حسب اليوم)
            pass

    # 3. حساب المهام الإضافية
    total_extras = sum(float(t['task_value']) for t in extra_tasks)
    
    return {
        'total_hours': round(total_hours, 2),
        'base_salary': round(base_salary, 2),
        'premium_bonus': round(premium_bonus, 2),
        'total_extras': round(total_extras, 2),
        'total_salary': round(base_salary + premium_bonus + total_extras, 2),
        'shifts': shifts,
        'applied_rules': applied_rules
    }
