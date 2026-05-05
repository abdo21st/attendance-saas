import customtkinter as ctk
from CTkTable import CTkTable
from CTkMessagebox import CTkMessagebox
import threading
import json
import uuid
from datetime import datetime
import sys
import os
import socket
import winreg
import pystray
from PIL import Image

IPC_PORT = 44556

def set_auto_startup():
    if getattr(sys, 'frozen', False):
        exe_path = sys.executable
    else:
        exe_path = os.path.abspath(__file__)
        
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Software\Microsoft\Windows\CurrentVersion\Run', 0, winreg.KEY_SET_VALUE)
        winreg.SetValueEx(key, 'ZKTeco_Attendance', 0, winreg.REG_SZ, f'"{exe_path}" --startup')
        winreg.CloseKey(key)
    except Exception as e:
        print(f"Failed to set startup: {e}")

class SingletonIPC:
    def __init__(self, app_instance):
        self.app_instance = app_instance
        self.server_socket = None
        
    def start(self):
        try:
            self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.bind(('127.0.0.1', IPC_PORT))
            self.server_socket.listen(1)
            threading.Thread(target=self.listen_for_commands, daemon=True).start()
            return True
        except socket.error:
            self.send_show_command()
            return False

    def listen_for_commands(self):
        while True:
            try:
                conn, addr = self.server_socket.accept()
                data = conn.recv(1024).decode()
                if data == "SHOW":
                    self.app_instance.after(0, self.app_instance.show_from_tray)
                conn.close()
            except:
                pass

    def send_show_command(self):
        try:
            client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            client.connect(('127.0.0.1', IPC_PORT))
            client.sendall(b"SHOW")
            client.close()
        except:
            pass

from app import start_background_server
from utils.database import get_all_users, get_recent_logs, device_info, get_setting, save_setting
from utils.database import get_db, save_user, delete_user, add_attendance_log, delete_attendance_log, add_extra_task, get_all_extra_tasks, delete_extra_task
from utils.adms import command_queue, enqueue
from utils.license import get_ethernet_mac, generate_license_key, is_activated, activate
from contextlib import closing

# إعدادات مظهر الواجهة
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

# خطوط الواجهة الأساسية
FONT_TITLE  = ("Tajawal", 24, "bold")
FONT_HEADER = ("Tajawal", 18, "bold")
FONT_TEXT   = ("Tajawal", 14)

# ═══════════════════════════════════════════════════════════
# نافذة التفعيل
# ═══════════════════════════════════════════════════════════
class ActivationWindow(ctk.CTkToplevel):
    """تظهر عند أول تشغيل أو إذا لم يكن البرنامج مُفعَّلاً على هذا الجهاز."""
    def __init__(self, parent, on_success):
        super().__init__(parent)
        self.parent   = parent
        self.on_success = on_success
        self.title("تفعيل البرنامج - ZKTeco")
        self.geometry("480x400")
        self.resizable(False, False)
        self.attributes('-topmost', True)
        self.protocol("WM_DELETE_WINDOW", self._on_close)
        self.grab_set()

        # ─── الحصول على MAC والمفتاح المتوقع ───
        mac = get_ethernet_mac()
        self._mac = mac or "غير متوفر"
        self._expected_key = generate_license_key(mac) if mac else "---"

        # ─── البطاقة الرئيسية ───
        card = ctk.CTkFrame(self, corner_radius=16, fg_color="#12122a")
        card.pack(fill="both", expand=True, padx=20, pady=20)

        ctk.CTkLabel(card, text="🔐  تفعيل البرنامج",
                     font=("Tajawal", 22, "bold"), text_color="#90caf9").pack(pady=(25, 5))

        ctk.CTkLabel(card,
                     text="هذه النسخة تعمل فقط على الجهاز المُرخَّص له.\nأدخل مفتاح التفعيل الخاص بجهازك.",
                     font=FONT_TEXT, text_color="#aaaaaa", justify="center").pack(pady=(0, 20))

        # ─── بطاقة MAC ───
        mac_card = ctk.CTkFrame(card, fg_color="#1a1a3e", corner_radius=10, border_width=1, border_color="#3b3b6a")
        mac_card.pack(fill="x", padx=30, pady=(0, 5))

        ctk.CTkLabel(mac_card, text="MAC كرت الإيثرنت:", font=("Tajawal", 12),
                     text_color="#888888").pack(anchor="e", padx=15, pady=(10, 2))
        ctk.CTkLabel(mac_card, text=self._mac,
                     font=("Courier", 16, "bold"), text_color="#f9a825").pack(pady=(0, 10))

        # ─── حقل المفتاح ───
        ctk.CTkLabel(card, text="مفتاح التفعيل:", font=FONT_TEXT,
                     text_color="#cccccc").pack(anchor="e", padx=30)

        self.key_var = ctk.StringVar()
        self.key_entry = ctk.CTkEntry(
            card, textvariable=self.key_var,
            font=("Courier", 18, "bold"),
            justify="center", height=46,
            show="*",
            placeholder_text=""
        )
        self.key_entry.pack(fill="x", padx=30, pady=8)
        self.key_entry.bind("<Return>", lambda _: self._do_activate())

        self.lbl_error = ctk.CTkLabel(card, text="", font=FONT_TEXT,
                                      text_color="#f44336")
        self.lbl_error.pack()

        ctk.CTkButton(
            card, text="تفعيل البرنامج", font=FONT_HEADER,
            height=44, fg_color="#1565c0", hover_color="#0d47a1",
            command=self._do_activate
        ).pack(fill="x", padx=30, pady=(5, 20))

        self.key_entry.focus()

    def _do_activate(self):
        key = self.key_var.get().strip()
        if not key:
            self.lbl_error.configure(text="الرجاء إدخال مفتاح التفعيل")
            return
        # نمرر نفس MAC الذي ظهر في النافذة لضمان التطابق
        if activate(key, mac=self._mac):
            self.destroy()
            self.on_success()
        else:
            self.lbl_error.configure(text="مفتاح التفعيل غير صحيح، يرجى المراجعة.")
            self.key_entry.configure(border_color="#f44336")

    def _on_close(self):
        # إغلاق نافذة التفعيل = إغلاق البرنامج
        self.parent.destroy()

class LoginWindow(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.parent = parent
        self.title("تسجيل الدخول - ZKTeco")
        self.geometry("450x350")
        self.protocol("WM_DELETE_WINDOW", self.on_close)
        self.resizable(False, False)
        self.attributes('-topmost', True) # نافذة فوق الجميع
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        frame = ctk.CTkFrame(self, corner_radius=15)
        frame.grid(row=0, column=0, padx=30, pady=30, sticky="nsew")
        
        ctk.CTkLabel(frame, text="🛡️ نظام إدارة الحضور", font=FONT_TITLE).pack(pady=30)
        
        self.pin_entry = ctk.CTkEntry(frame, placeholder_text="رقم الموظف (PIN)", font=FONT_TEXT, justify="center", height=40)
        self.pin_entry.pack(pady=10, padx=40, fill="x")
        
        self.pass_entry = ctk.CTkEntry(frame, placeholder_text="كلمة المرور", show="*", font=FONT_TEXT, justify="center", height=40)
        self.pass_entry.pack(pady=10, padx=40, fill="x")
        
        btn = ctk.CTkButton(frame, text="تسجيل الدخول", font=FONT_HEADER, height=45, command=self.login)
        btn.pack(pady=20, padx=40, fill="x")
        
    def login(self):
        pin = self.pin_entry.get().strip()
        password = self.pass_entry.get().strip()
        
        if not pin or not password:
            CTkMessagebox(title="تنبيه", message="الرجاء إدخال رقم الموظف وكلمة المرور", icon="warning")
            return
            
        users = get_all_users()
        for u in users:
            if str(u['pin']) == pin and str(u['password']) == password:
                # نجاح تسجيل الدخول
                self.parent.current_user = u
                
                # جلب الصلاحيات
                groups = get_setting('groups', {})
                role_str = str(u['role'])
                if role_str == '14':
                    self.parent.user_perms = groups.get(role_str, {}).get('permissions', ["view_own_profile", "view_logs", "add_logs", "edit_logs", "delete_logs", "view_reports", "view_users", "add_users", "edit_users", "delete_users", "view_settings", "manage_settings", "manage_device", "manage_roles", "manage_tasks"])
                else:
                    self.parent.user_perms = groups.get(role_str, {}).get('permissions', [])
                
                self.parent.init_ui()
                self.destroy()
                return
        
        CTkMessagebox(title="خطأ", message="بيانات الدخول غير صحيحة", icon="cancel")

    def on_close(self):
        self.withdraw()

class AddLogModal(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.parent = parent
        self.title("إضافة بصمة يدوية")
        self.geometry("450x400")
        self.resizable(False, False)
        self.attributes('-topmost', True)
        self.grab_set()
        
        self.grid_columnconfigure(0, weight=1)
        
        ctk.CTkLabel(self, text="إضافة سجل حضور يدوياً", font=FONT_TITLE).pack(pady=20)
        
        frame = ctk.CTkFrame(self, fg_color="transparent")
        frame.pack(fill="both", expand=True, padx=40)
        
        # قائمة الموظفين
        users = get_all_users()
        self.user_options = {f"{u['name']} ({u['pin']})": str(u['pin']) for u in users}
        
        self.user_var = ctk.StringVar(value=list(self.user_options.keys())[0] if users else "")
        self.user_menu = ctk.CTkOptionMenu(frame, values=list(self.user_options.keys()), variable=self.user_var, font=FONT_TEXT)
        self.user_menu.pack(pady=10, fill="x")
        
        now = datetime.now()
        
        self.date_entry = ctk.CTkEntry(frame, placeholder_text="التاريخ (YYYY-MM-DD)", font=FONT_TEXT, justify="center")
        self.date_entry.insert(0, now.strftime("%Y-%m-%d"))
        self.date_entry.pack(pady=10, fill="x")
        
        self.time_entry = ctk.CTkEntry(frame, placeholder_text="الوقت (HH:MM:SS)", font=FONT_TEXT, justify="center")
        self.time_entry.insert(0, now.strftime("%H:%M:%S"))
        self.time_entry.pack(pady=10, fill="x")
        
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(pady=20, fill="x", padx=40)
        
        ctk.CTkButton(btn_frame, text="حفظ السجل", font=FONT_HEADER, command=self.save).pack(side="right", padx=5)

    def save(self):
        user_text = self.user_var.get()
        date_str = self.date_entry.get().strip()
        time_str = self.time_entry.get().strip()
        
        if not user_text or not date_str or not time_str:
            CTkMessagebox(title="تنبيه", message="يجب تعبئة جميع الحقول", icon="warning", parent=self)
            return
            
        pin = self.user_options.get(user_text)
        timestamp = f"{date_str} {time_str}"
        
        success = add_attendance_log(pin, timestamp, verify_method=0)
        if success:
            self.parent.show_logs()
            self.destroy()
        else:
            CTkMessagebox(title="تنبيه", message="يوجد سجل مسبق في نفس الوقت لهذا الموظف", icon="warning", parent=self)

class AddTaskModal(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.parent = parent
        self.title("تكليف بمهمة إضافية")
        self.geometry("450x450")
        self.resizable(False, False)
        self.attributes('-topmost', True)
        self.grab_set()
        
        self.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(self, text="مهمة إضافية جديدة", font=FONT_TITLE).pack(pady=20)
        
        frame = ctk.CTkFrame(self, fg_color="transparent")
        frame.pack(fill="both", expand=True, padx=40)
        
        users = get_all_users()
        self.user_options = {f"{u['name']} ({u['pin']})": str(u['pin']) for u in users}
        
        self.user_var = ctk.StringVar(value=list(self.user_options.keys())[0] if users else "")
        self.user_menu = ctk.CTkOptionMenu(frame, values=list(self.user_options.keys()), variable=self.user_var, font=FONT_TEXT)
        self.user_menu.pack(pady=10, fill="x")
        
        self.task_name_entry = ctk.CTkEntry(frame, placeholder_text="اسم المهمة (مثال: صيانة جهاز)", font=FONT_TEXT, justify="center")
        self.task_name_entry.pack(pady=10, fill="x")
        
        self.task_value_entry = ctk.CTkEntry(frame, placeholder_text="المكافأة المالية (مثال: 15.5)", font=FONT_TEXT, justify="center")
        self.task_value_entry.pack(pady=10, fill="x")
        
        now = datetime.now()
        self.date_entry = ctk.CTkEntry(frame, placeholder_text="التاريخ (YYYY-MM-DD)", font=FONT_TEXT, justify="center")
        self.date_entry.insert(0, now.strftime("%Y-%m-%d"))
        self.date_entry.pack(pady=10, fill="x")
        
        self.is_monthly_var = ctk.BooleanVar(value=False)
        self.monthly_switch = ctk.CTkSwitch(frame, text="مهمة دورية (تتكرر كل شهر)", variable=self.is_monthly_var, font=FONT_TEXT)
        self.monthly_switch.pack(pady=10, anchor="e")
        
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(pady=20, fill="x", padx=40)
        
        ctk.CTkButton(btn_frame, text="تكليف وحفظ", font=FONT_HEADER, command=self.save).pack(side="right", padx=5)

    def save(self):
        user_text = self.user_var.get()
        task_name = self.task_name_entry.get().strip()
        task_value = self.task_value_entry.get().strip()
        date_str = self.date_entry.get().strip()
        is_monthly = 1 if self.is_monthly_var.get() else 0
        
        if not user_text or not task_name or not task_value or not date_str:
            CTkMessagebox(title="تنبيه", message="يجب تعبئة جميع الحقول", icon="warning", parent=self)
            return
            
        try:
            val = float(task_value)
        except:
            CTkMessagebox(title="تنبيه", message="القيمة المالية غير صحيحة", icon="warning", parent=self)
            return
            
        pin = self.user_options.get(user_text)
        add_extra_task(pin, task_name, val, date_str, is_monthly)
        self.parent.show_tasks()
        self.destroy()

class AddPremiumRuleModal(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.parent = parent
        self.title("إضافة قاعدة ساعات إضافية (Premium)")
        self.geometry("500x650")
        self.resizable(False, False)
        self.attributes('-topmost', True)
        self.grab_set()
        
        self.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(self, text="قاعدة ساعات إضافية", font=FONT_TITLE).pack(pady=15)
        
        frame = ctk.CTkFrame(self, fg_color="transparent")
        frame.pack(fill="both", expand=True, padx=40)
        
        self.name_entry = ctk.CTkEntry(frame, placeholder_text="اسم القاعدة (مثال: دوام ليل الجمعة)", font=FONT_TEXT, justify="center")
        self.name_entry.pack(pady=10, fill="x")
        
        users = get_all_users()
        self.user_options = {"الجميع (ALL)": "ALL"}
        for u in users:
            self.user_options[f"{u['name']} ({u['pin']})"] = str(u['pin'])
            
        self.user_var = ctk.StringVar(value="الجميع (ALL)")
        ctk.CTkLabel(frame, text="تطبق على:", font=FONT_TEXT).pack(anchor="e")
        self.user_menu = ctk.CTkOptionMenu(frame, values=list(self.user_options.keys()), variable=self.user_var, font=FONT_TEXT)
        self.user_menu.pack(pady=5, fill="x")
        
        self.type_var = ctk.StringVar(value="يومياً")
        ctk.CTkLabel(frame, text="نوع التكرار:", font=FONT_TEXT).pack(anchor="e")
        self.type_menu = ctk.CTkOptionMenu(frame, values=["يومياً", "أسبوعياً", "تاريخ محدد"], variable=self.type_var, font=FONT_TEXT, command=self.on_type_change)
        self.type_menu.pack(pady=5, fill="x")
        
        self.date_frame = ctk.CTkFrame(frame, fg_color="transparent")
        self.date_frame.pack(fill="x", pady=5)
        self.date_entry = ctk.CTkEntry(self.date_frame, placeholder_text="التاريخ (YYYY-MM-DD)", font=FONT_TEXT, justify="center")
        self.weekday_var = ctk.StringVar(value="0") # Monday
        self.weekday_menu = ctk.CTkOptionMenu(self.date_frame, values=["0", "1", "2", "3", "4", "5", "6"], variable=self.weekday_var, font=FONT_TEXT)
        
        time_frame = ctk.CTkFrame(frame, fg_color="transparent")
        time_frame.pack(fill="x", pady=10)
        ctk.CTkLabel(time_frame, text="الوقت (اتركه فارغاً لطوال اليوم):", font=FONT_TEXT).pack(anchor="e")
        row = ctk.CTkFrame(time_frame, fg_color="transparent")
        row.pack(fill="x")
        self.start_entry = ctk.CTkEntry(row, placeholder_text="من (HH:MM)", font=FONT_TEXT, width=100, justify="center")
        self.start_entry.pack(side="right", padx=5)
        self.end_entry = ctk.CTkEntry(row, placeholder_text="إلى (HH:MM)", font=FONT_TEXT, width=100, justify="center")
        self.end_entry.pack(side="left", padx=5)
        
        rate_frame = ctk.CTkFrame(frame, fg_color="transparent")
        rate_frame.pack(fill="x", pady=10)
        self.rate_type_var = ctk.StringVar(value="نسبة (Multiplier)")
        self.rate_type_menu = ctk.CTkOptionMenu(rate_frame, values=["نسبة (Multiplier)", "قيمة ثابتة"], variable=self.rate_type_var, font=FONT_TEXT)
        self.rate_type_menu.pack(side="right", padx=5)
        self.rate_val_entry = ctk.CTkEntry(rate_frame, placeholder_text="النسبة أو القيمة", font=FONT_TEXT, justify="center", width=120)
        self.rate_val_entry.pack(side="left", padx=5)
        self.rate_val_entry.insert(0, "1.5")
        
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(pady=20, fill="x", padx=40)
        ctk.CTkButton(btn_frame, text="حفظ القاعدة", font=FONT_HEADER, command=self.save).pack(side="right", padx=5)
        
        self.on_type_change("يومياً")

    def on_type_change(self, val):
        self.date_entry.pack_forget()
        self.weekday_menu.pack_forget()
        if val == "تاريخ محدد":
            self.date_entry.pack(fill="x")
        elif val == "أسبوعياً":
            # Monday=0, Sunday=6
            self.weekday_menu.configure(values=["الإثنين (0)", "الثلاثاء (1)", "الأربعاء (2)", "الخميس (3)", "الجمعة (4)", "السبت (5)", "الأحد (6)"])
            self.weekday_menu.pack(fill="x")

    def save(self):
        name = self.name_entry.get().strip()
        if not name:
            CTkMessagebox(title="تنبيه", message="يجب كتابة اسم القاعدة", icon="warning", parent=self)
            return
            
        pin = self.user_options.get(self.user_var.get(), "ALL")
        
        r_type = self.type_var.get()
        if r_type == "يومياً":
            rule_type = "daily"
            rule_date = None
        elif r_type == "أسبوعياً":
            rule_type = "weekly"
            # format from option menu
            val = self.weekday_var.get()
            import re
            m = re.search(r'\((\d)\)', val)
            rule_date = m.group(1) if m else "0"
        else:
            rule_type = "date"
            rule_date = self.date_entry.get().strip()
            
        start_t = self.start_entry.get().strip()
        end_t = self.end_entry.get().strip()
        
        start_time = f"{start_t}:00" if start_t else None
        end_time = f"{end_t}:00" if end_t else None
        
        rt = self.rate_type_var.get()
        rate_type = "multiplier" if "نسبة" in rt else "fixed"
        rate_value = self.rate_val_entry.get().strip()
        
        try:
            val = float(rate_value)
        except:
            CTkMessagebox(title="تنبيه", message="قيمة الزيادة غير صحيحة", icon="warning", parent=self)
            return
            
        from utils.database import add_premium_rule
        add_premium_rule(name, pin, rule_type, rule_date, start_time, end_time, rate_type, val)
        self.parent.show_tasks(tab="premium")
        self.destroy()

class UserModal(ctk.CTkToplevel):
    def __init__(self, parent, user_data=None):
        super().__init__(parent)
        self.parent = parent
        self.user_data = user_data
        
        mode = "تعديل موظف" if user_data else "إضافة موظف جديد"
        self.title(mode)
        self.geometry("450x550")
        self.resizable(False, False)
        self.attributes('-topmost', True)
        self.grab_set() # منع التفاعل مع النافذة الرئيسية حتى يتم إغلاق هذه
        
        self.grid_columnconfigure(0, weight=1)
        
        ctk.CTkLabel(self, text=mode, font=FONT_TITLE).pack(pady=20)
        
        frame = ctk.CTkFrame(self, fg_color="transparent")
        frame.pack(fill="both", expand=True, padx=40)
        
        # حقول الإدخال
        self.pin_entry = ctk.CTkEntry(frame, placeholder_text="رقم الموظف (PIN)", font=FONT_TEXT, justify="center")
        self.pin_entry.pack(pady=10, fill="x")
        
        self.name_entry = ctk.CTkEntry(frame, placeholder_text="اسم الموظف", font=FONT_TEXT, justify="center")
        self.name_entry.pack(pady=10, fill="x")
        
        self.pass_entry = ctk.CTkEntry(frame, placeholder_text="كلمة المرور (اختياري)", font=FONT_TEXT, justify="center")
        self.pass_entry.pack(pady=10, fill="x")
        
        self.rate_entry = ctk.CTkEntry(frame, placeholder_text="الأجر الساعي (مثال: 15.5)", font=FONT_TEXT, justify="center")
        self.rate_entry.pack(pady=10, fill="x")
        
        # قائمة المجموعات
        groups = get_setting('groups', {})
        self.group_options = {f"{g['name']} ({gid})": gid for gid, g in groups.items()}
        self.group_options["مدير النظام (14)"] = "14"
        
        self.role_var = ctk.StringVar(value="بدون مجموعة (0)")
        self.role_options = ["بدون مجموعة (0)"] + list(self.group_options.keys())
        
        self.role_menu = ctk.CTkOptionMenu(frame, values=self.role_options, variable=self.role_var, font=FONT_TEXT)
        self.role_menu.pack(pady=10, fill="x")
        
        if user_data:
            self.pin_entry.insert(0, str(user_data['pin']))
            self.pin_entry.configure(state="disabled") # لا يمكن تعديل PIN
            self.name_entry.insert(0, user_data['name'])
            if user_data.get('password'):
                self.pass_entry.insert(0, user_data['password'])
            if user_data.get('hourly_rate'):
                self.rate_entry.insert(0, str(user_data['hourly_rate']))
                
            r = str(user_data.get('role', '0'))
            if r == '14':
                self.role_var.set("مدير النظام (14)")
            else:
                for k, v in self.group_options.items():
                    if v == r:
                        self.role_var.set(k)
                        break
        
        # أزرار الإجراءات
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(pady=20, fill="x", padx=40)
        
        ctk.CTkButton(btn_frame, text="حفظ", font=FONT_HEADER, command=self.save).pack(side="right", padx=5)
        
        if user_data:
            ctk.CTkButton(btn_frame, text="حذف", font=FONT_HEADER, fg_color="#d32f2f", hover_color="#b71c1c", command=self.delete).pack(side="left", padx=5)

    def save(self):
        pin = self.pin_entry.get().strip()
        name = self.name_entry.get().strip()
        password = self.pass_entry.get().strip()
        rate_str = self.rate_entry.get().strip()
        
        if not pin or not name:
            CTkMessagebox(title="تنبيه", message="يجب إدخال رقم الموظف والاسم", icon="warning", parent=self)
            return
            
        try:
            rate = float(rate_str) if rate_str else 0.0
        except:
            CTkMessagebox(title="تنبيه", message="قيمة الأجر الساعي غير صحيحة", icon="warning", parent=self)
            return
            
        selected_role_text = self.role_var.get()
        role = 0
        if selected_role_text in self.group_options:
            role = int(self.group_options[selected_role_text])
            
        save_user(pin, name, role, password, rate)
        self.parent.show_users() # Refresh
        self.destroy()
        
    def delete(self):
        msg = CTkMessagebox(title="تأكيد الحذف", message="هل أنت متأكد من حذف هذا الموظف؟",
                            icon="question", option_1="نعم", option_2="إلغاء", parent=self)
        if msg.get() == "نعم":
            pin = self.pin_entry.get()
            delete_user(pin)
            self.parent.show_users()
            self.destroy()

class GroupModal(ctk.CTkToplevel):
    def __init__(self, parent, group_id=None, group_data=None):
        super().__init__(parent)
        self.parent = parent
        self.group_id = group_id
        
        mode = "تعديل المجموعة" if group_id else "إنشاء مجموعة جديدة"
        self.title(mode)
        self.geometry("500x650")
        self.resizable(False, False)
        self.attributes('-topmost', True)
        self.grab_set()
        
        self.grid_columnconfigure(0, weight=1)
        
        ctk.CTkLabel(self, text=mode, font=FONT_TITLE).pack(pady=20)
        
        frame = ctk.CTkFrame(self, fg_color="transparent")
        frame.pack(fill="both", expand=True, padx=40)
        
        # حقول البيانات الأساسية
        self.id_entry = ctk.CTkEntry(frame, placeholder_text="رقم المجموعة (رقم صحيح)", font=FONT_TEXT, justify="center")
        self.id_entry.pack(pady=10, fill="x")
        
        self.name_entry = ctk.CTkEntry(frame, placeholder_text="اسم المجموعة (مثال: موظف عادي)", font=FONT_TEXT, justify="center")
        self.name_entry.pack(pady=10, fill="x")
        
        if group_id and group_data:
            self.id_entry.insert(0, str(group_id))
            self.id_entry.configure(state="disabled")
            self.name_entry.insert(0, group_data.get('name', ''))
            current_perms = group_data.get('permissions', [])
        else:
            current_perms = []
            
        # الصلاحيات
        ctk.CTkLabel(frame, text="الصلاحيات:", font=FONT_HEADER).pack(pady=(10, 5), anchor="e")
        
        scroll_perms = ctk.CTkScrollableFrame(frame, height=200)
        scroll_perms.pack(fill="both", expand=True, pady=5)
        
        available_perms = {
            "view_own_profile": "عرض الملف الشخصي",
            "view_logs": "عرض سجلات الحضور",
            "add_logs": "إضافة بصمة يدوية",
            "edit_logs": "تعديل السجلات",
            "delete_logs": "حذف السجلات",
            "view_reports": "عرض التقارير",
            "view_users": "عرض الموظفين",
            "add_users": "إضافة موظفين",
            "edit_users": "تعديل الموظفين",
            "delete_users": "حذف الموظفين",
            "view_settings": "عرض الإعدادات",
            "manage_settings": "إدارة الإعدادات",
            "manage_device": "التحكم بالجهاز",
            "manage_roles": "إدارة الصلاحيات",
            "manage_tasks": "إدارة المهام والمكافآت"
        }
        
        self.perm_vars = {}
        for p_key, p_name in available_perms.items():
            var = ctk.BooleanVar(value=(p_key in current_perms))
            chk = ctk.CTkCheckBox(scroll_perms, text=p_name, variable=var, font=FONT_TEXT)
            chk.pack(pady=5, anchor="e")
            self.perm_vars[p_key] = var
            
        # أزرار الإجراءات
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(pady=20, fill="x", padx=40)
        
        ctk.CTkButton(btn_frame, text="حفظ", font=FONT_HEADER, command=self.save).pack(side="right", padx=5)

    def save(self):
        gid = self.id_entry.get().strip()
        name = self.name_entry.get().strip()
        
        if not gid or not name:
            CTkMessagebox(title="تنبيه", message="يجب إدخال رقم واسم المجموعة", icon="warning", parent=self)
            return
            
        if not gid.isdigit():
            CTkMessagebox(title="تنبيه", message="رقم المجموعة يجب أن يكون رقماً صحيحاً", icon="warning", parent=self)
            return
            
        selected_perms = [p_key for p_key, var in self.perm_vars.items() if var.get()]
        
        groups = get_setting('groups', {})
        groups[gid] = {
            "name": name,
            "permissions": selected_perms
        }
        
        save_setting('groups', groups)
        self.parent.show_groups()
        self.destroy()

class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("نظام إدارة الحضور والانصراف - ZKTeco SenseFace")
        self.geometry("1200x750")
        self.current_user = None
        self.user_perms = []
        
        # تشغيل السيرفر في الخلفية
        start_background_server()
        
        # واجهة التسجيل
        self.withdraw()
        self.login_window = LoginWindow(self)
        
        self.protocol("WM_DELETE_WINDOW", self.hide_to_tray)
        self.icon = None
        self.setup_tray()
        
    def hide_to_tray(self):
        self.current_user = None
        self.user_perms = []
        self.withdraw()

    def setup_tray(self):
        try:
            icon_path = "static/icon-192.png"
            if getattr(sys, 'frozen', False):
                icon_path = os.path.join(sys._MEIPASS, icon_path)
            else:
                base = os.path.dirname(os.path.abspath(__file__))
                icon_path = os.path.join(base, icon_path)
                
            image = Image.open(icon_path)
            menu = pystray.Menu(
                pystray.MenuItem('إظهار النافذة', self.show_from_tray, default=True),
                pystray.MenuItem('إغلاق السيرفر بالكامل', self.quit_app)
            )
            self.icon = pystray.Icon("ZKTeco", image, "نظام الحضور والانصراف", menu)
            threading.Thread(target=self.icon.run, daemon=True).start()
        except Exception as e:
            print("Tray error:", e)

    def show_from_tray(self, icon=None, item=None):
        if self.current_user is None:
            if not hasattr(self, 'login_window') or not self.login_window.winfo_exists():
                self.login_window = LoginWindow(self)
            self.login_window.deiconify()
            self.login_window.lift()
            self.login_window.attributes('-topmost', True)
            self.login_window.attributes('-topmost', False)
        else:
            self.deiconify()
            self.lift()
            self.attributes('-topmost', True)
            self.attributes('-topmost', False)

    def quit_app(self, icon=None, item=None):
        if self.icon:
            self.icon.stop()
        self.destroy()
        os._exit(0)
        
    def has_perm(self, perm):
        if str(self.current_user.get('role', '0')) == '14' and perm == 'manage_roles':
            return True
        return perm in self.user_perms

    def init_ui(self):
        self.deiconify()
        
        self.grid_columnconfigure(0, weight=1) # Main Content
        self.grid_columnconfigure(1, weight=0) # Sidebar
        self.grid_rowconfigure(0, weight=1)
        
        # الشريط الجانبي (على اليمين)
        self.sidebar = ctk.CTkFrame(self, width=250, corner_radius=0, fg_color="#1a1a1a")
        self.sidebar.grid(row=0, column=1, sticky="nsew")
        
        # منطقة المحتوى (على اليسار)
        self.main_frame = ctk.CTkFrame(self, corner_radius=15, fg_color="transparent")
        self.main_frame.grid(row=0, column=0, sticky="nsew", padx=20, pady=20)
        
        # بيانات المستخدم
        user_frame = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        user_frame.pack(pady=30, padx=20, fill="x")
        ctk.CTkLabel(user_frame, text=f"أهلاً، {self.current_user['name']}", font=FONT_HEADER, text_color="#3b8ed0").pack()
        
        # أزرار التصفح
        if self.has_perm('view_logs'):
            self.create_nav_btn("سجلات الحضور", self.show_logs)
        if self.has_perm('view_users'):
            self.create_nav_btn("إدارة الموظفين", self.show_users)
        if self.has_perm('manage_tasks'):
            self.create_nav_btn("المهام والمكافآت", self.show_tasks)
            self.create_nav_btn("التقارير المالية والرواتب", self.show_financial_reports)
        if self.has_perm('manage_roles'):
            self.create_nav_btn("الصلاحيات والمجموعات", self.show_groups)
        if self.has_perm('manage_device'):
            self.create_nav_btn("حالة جهاز البصمة", self.show_device)
        
        # أزرار الإغلاق وتسجيل الخروج
        bottom_frame = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        bottom_frame.pack(side="bottom", fill="x", pady=20, padx=20)
        
        ctk.CTkButton(bottom_frame, text="إغلاق البرنامج نهائياً", font=FONT_TEXT, fg_color="#d32f2f", hover_color="#b71c1c", command=self.quit_app).pack(side="bottom", fill="x", pady=5)
        ctk.CTkButton(bottom_frame, text="تسجيل الخروج", font=FONT_TEXT, fg_color="#ff9800", hover_color="#f57c00", command=self.logout).pack(side="bottom", fill="x", pady=5)
        
        if self.has_perm('view_logs'):
            self.show_logs()
        elif self.has_perm('view_users'):
            self.show_users()
            
    def create_nav_btn(self, text, command):
        btn = ctk.CTkButton(self.sidebar, text=text, font=FONT_HEADER, fg_color="transparent", text_color="#e0e0e0", hover_color="#333333", anchor="e", height=50, command=command)
        btn.pack(pady=5, padx=10, fill="x")
        
    def clear_main(self):
        for w in self.main_frame.winfo_children():
            w.destroy()
            
    # ========================================================
    # شاشة السجلات
    # ========================================================
    def show_logs(self):
        self.clear_main()
        
        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.pack(fill="x", pady=10)
        ctk.CTkLabel(header_frame, text="سجلات الحضور", font=FONT_TITLE).pack(side="right")
        
        if self.has_perm('add_logs'):
            ctk.CTkButton(header_frame, text="إضافة بصمة يدوية", font=FONT_TEXT, width=120, command=self.open_add_log).pack(side="left")
            
        logs = get_recent_logs(50)
        users = {u['pin']: u['name'] for u in get_all_users()}
        
        headers = ["الرقم", "اسم الموظف", "الوقت", "النوع", "طريقة التحقق"]
        values = [headers]
        for l in logs:
            uname = users.get(l['user_pin'], l['user_pin'])
            values.append([l['user_pin'], uname, l['timestamp'], l.get('_type', ''), l['verify_method']])
            
        if len(values) > 1:
            frame = ctk.CTkScrollableFrame(self.main_frame)
            frame.pack(fill="both", expand=True)
            table = CTkTable(frame, values=values, font=FONT_TEXT, header_color="#1f538d", justify="center", command=self.on_log_click)
            table.pack(expand=True, fill="both")
        else:
            ctk.CTkLabel(self.main_frame, text="لا توجد بيانات متاحة", font=FONT_TEXT, text_color="gray").pack(pady=100)

    def open_add_log(self):
        AddLogModal(self)
        
    def on_log_click(self, cell):
        if cell['row'] == 0: return # Header
        if not self.has_perm('delete_logs'): return
        
        row_data = cell['args'][0][cell['row']]
        pin = str(row_data[0])
        timestamp = str(row_data[2])
        
        msg = CTkMessagebox(title="تأكيد الحذف", message=f"هل تريد حذف بصمة الموظف رقم {pin} بتاريخ {timestamp}؟",
                            icon="question", option_1="نعم", option_2="إلغاء")
        if msg.get() == "نعم":
            delete_attendance_log(pin, timestamp)
            self.show_logs()

    # ========================================================
    # شاشة المهام والمكافآت وقواعد الساعات
    # ========================================================
    def show_tasks(self, tab="tasks"):
        self.current_tab = 'tasks'
        self.clear_main()
        
        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.pack(fill="x", pady=10)
        
        seg_button = ctk.CTkSegmentedButton(header_frame, values=["المهام والمكافآت المباشرة", "قواعد الساعات الإضافية (Premium)"], font=FONT_TEXT, command=self.switch_tasks_tab)
        seg_button.pack(side="right")
        seg_button.set("المهام والمكافآت المباشرة" if tab == "tasks" else "قواعد الساعات الإضافية (Premium)")
        
        if tab == "tasks":
            if self.has_perm('manage_tasks'):
                ctk.CTkButton(header_frame, text="تكليف بمهمة", font=FONT_TEXT, width=120, command=self.open_add_task).pack(side="left")
                
            tasks = get_all_extra_tasks()
            users = {u['pin']: u['name'] for u in get_all_users()}
            
            headers = ["الرقم المرجعي", "الموظف المكلف", "اسم المهمة / المكافأة", "القيمة المالية", "التاريخ"]
            values = [headers]
            for t in tasks:
                uname = users.get(str(t['user_pin']), t['user_pin'])
                display_name = f"{t['task_name']} (دورية)" if t.get('is_monthly') == 1 else t['task_name']
                values.append([t['id'], uname, display_name, f"{t['task_value']} د.ل", t['date']])
                
            if len(values) > 1:
                frame = ctk.CTkScrollableFrame(self.main_frame)
                frame.pack(fill="both", expand=True)
                table = CTkTable(frame, values=values, font=FONT_TEXT, header_color="#1f538d", justify="center", command=self.on_task_click)
                table.pack(expand=True, fill="both")
            else:
                ctk.CTkLabel(self.main_frame, text="لا توجد مهام أو مكافآت مسجلة", font=FONT_TEXT, text_color="gray").pack(pady=100)
                
        else: # Premium Rules
            if self.has_perm('manage_tasks'):
                ctk.CTkButton(header_frame, text="إضافة قاعدة جديدة", font=FONT_TEXT, width=120, command=self.open_add_premium_rule).pack(side="left")
                
            from utils.database import get_premium_rules
            rules = get_premium_rules()
            users = {u['pin']: u['name'] for u in get_all_users()}
            
            headers = ["الرقم", "اسم القاعدة", "الموظف", "النوع", "التوقيت", "نوع الزيادة", "النسبة / القيمة"]
            values = [headers]
            for r in rules:
                uname = "الجميع" if r['user_pin'] == 'ALL' else users.get(str(r['user_pin']), r['user_pin'])
                rtype_ar = {"daily": "يومياً", "weekly": "أسبوعياً", "date": "تاريخ محدد"}.get(r['rule_type'], r['rule_type'])
                timing = f"{r['start_time'] or '00:00'} - {r['end_time'] or '23:59'}"
                rate_ar = "نسبة (Multiplier)" if r['rate_type'] == 'multiplier' else "قيمة ثابتة"
                rate_val = f"{r['rate_value']}x" if r['rate_type'] == 'multiplier' else f"+{r['rate_value']}"
                
                values.append([r['id'], r['name'], uname, rtype_ar, timing, rate_ar, rate_val])
                
            if len(values) > 1:
                frame = ctk.CTkScrollableFrame(self.main_frame)
                frame.pack(fill="both", expand=True)
                table = CTkTable(frame, values=values, font=FONT_TEXT, header_color="#1f538d", justify="center", command=self.on_premium_click)
                table.pack(expand=True, fill="both")
            else:
                ctk.CTkLabel(self.main_frame, text="لا توجد قواعد ساعات إضافية", font=FONT_TEXT, text_color="gray").pack(pady=100)

    def switch_tasks_tab(self, value):
        if value == "المهام والمكافآت المباشرة":
            self.show_tasks(tab="tasks")
        else:
            self.show_tasks(tab="premium")

    def open_add_task(self):
        AddTaskModal(self)
        
    def open_add_premium_rule(self):
        AddPremiumRuleModal(self)
        
    def on_task_click(self, cell):
        if cell['row'] == 0: return # Header
        if not self.has_perm('manage_tasks'): return
        
        row_data = cell['args'][0][cell['row']]
        task_id = str(row_data[0])
        task_name = str(row_data[2])
        
        msg = CTkMessagebox(title="تأكيد الحذف", message=f"هل تريد إلغاء المهمة: {task_name}؟",
                            icon="question", option_1="نعم", option_2="إلغاء")
        if msg.get() == "نعم":
            delete_extra_task(task_id)
            self.show_tasks(tab="tasks")
            
    def on_premium_click(self, cell):
        if cell['row'] == 0: return # Header
        if not self.has_perm('manage_tasks'): return
        
        row_data = cell['args'][0][cell['row']]
        rule_id = str(row_data[0])
        rule_name = str(row_data[1])
        
        msg = CTkMessagebox(title="تأكيد الحذف", message=f"هل تريد إلغاء القاعدة: {rule_name}؟",
                            icon="question", option_1="نعم", option_2="إلغاء")
        if msg.get() == "نعم":
            from utils.database import delete_premium_rule
            delete_premium_rule(rule_id)
            self.show_tasks(tab="premium")

    # ========================================================
    # التقارير المالية والرواتب - كشف المرتبات المفصل
    # ========================================================
    def show_financial_reports(self):
        self.clear_main()
        
        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.pack(fill="x", pady=10)
        ctk.CTkLabel(header_frame, text="كشف المرتبات الشهري", font=FONT_TITLE).pack(side="right")
        
        filter_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        filter_frame.pack(fill="x", pady=5)
        
        now = datetime.now()
        start_def = now.replace(day=1).strftime('%Y-%m-%d')
        end_def = now.strftime('%Y-%m-%d')
        
        start_var = ctk.StringVar(value=start_def)
        end_var = ctk.StringVar(value=end_def)
        
        ctk.CTkLabel(filter_frame, text="من تاريخ:", font=FONT_TEXT).pack(side="right", padx=5)
        start_entry = ctk.CTkEntry(filter_frame, textvariable=start_var, font=FONT_TEXT, width=120, justify="center")
        start_entry.pack(side="right", padx=5)
        
        ctk.CTkLabel(filter_frame, text="إلى تاريخ:", font=FONT_TEXT).pack(side="right", padx=5)
        end_entry = ctk.CTkEntry(filter_frame, textvariable=end_var, font=FONT_TEXT, width=120, justify="center")
        end_entry.pack(side="right", padx=5)
        
        ctk.CTkButton(filter_frame, text="تحديث التقرير", font=FONT_TEXT, command=lambda: refresh_report()).pack(side="right", padx=20)
        
        scroll_container = ctk.CTkScrollableFrame(self.main_frame)
        scroll_container.pack(fill="both", expand=True, pady=5)
        
        def refresh_report():
            for w in scroll_container.winfo_children():
                w.destroy()

            from utils.database import get_financial_report, get_user_logs, calculate_premium_bonus, get_extra_tasks_for_user
            from datetime import datetime as dt_, timedelta
            from collections import defaultdict
            
            sd = start_var.get()
            ed = end_var.get()
            
            summary, data = get_financial_report(sd, ed)
            all_users = get_all_users()
            
            # ── بطاقات الإجمالي ─────────────────────────────
            cards_frame = ctk.CTkFrame(scroll_container, fg_color="transparent")
            cards_frame.pack(fill="x", pady=(0, 20))
            
            for title, val, color in [
                ("إجمالي المصروفات", f"{summary['total_salary']} د.ل", "#d32f2f"),
                ("إجمالي المكافآت", f"{summary['total_extras']} د.ل", "#ff9800"),
                ("الراتب الأساسي الكلي", f"{summary['total_base']} د.ل", "#4caf50"),
                ("إجمالي الساعات", f"{summary['total_hours']} س", "#3b8ed0"),
            ]:
                card = ctk.CTkFrame(cards_frame, fg_color="#1e1e2e", corner_radius=10, border_width=2, border_color=color)
                card.pack(side="right", fill="x", expand=True, padx=6)
                ctk.CTkLabel(card, text=title, font=FONT_TEXT, text_color="#aaaaaa").pack(pady=(12, 2))
                ctk.CTkLabel(card, text=val, font=FONT_HEADER, text_color=color).pack(pady=(0, 12))
            
            arabic_days = {
                'Sunday': 'أحد', 'Monday': 'إثنين', 'Tuesday': 'ثلاثاء',
                'Wednesday': 'أربعاء', 'Thursday': 'خميس', 'Friday': 'جمعة', 'Saturday': 'سبت'
            }
            
            try:
                start_dt = dt_.strptime(sd, '%Y-%m-%d')
                end_dt = dt_.strptime(ed, '%Y-%m-%d')
                today_dt = dt_.now()
                actual_end_dt = today_dt if end_dt > today_dt else end_dt
            except:
                return
            
            # ── بطاقة كل موظف ────────────────────────────────
            for emp_row in data:
                pin = str(emp_row['pin'])
                emp_user = next((u for u in all_users if str(u['pin']) == pin), {})
                rate = float(emp_user.get('hourly_rate', 0.0))
                
                emp_card = ctk.CTkFrame(scroll_container, fg_color="#1a1a2e", corner_radius=12, border_width=1, border_color="#2d2d4a")
                emp_card.pack(fill="x", pady=8, padx=4)
                
                # رأس البطاقة
                emp_header = ctk.CTkFrame(emp_card, fg_color="#16213e", corner_radius=10)
                emp_header.pack(fill="x", padx=10, pady=(10, 5))
                
                ctk.CTkLabel(emp_header, text=f"  {emp_row['name']}", font=FONT_HEADER, text_color="#90caf9").pack(side="right", padx=15, pady=10)
                
                info_right = ctk.CTkFrame(emp_header, fg_color="transparent")
                info_right.pack(side="left", padx=15, pady=8)
                
                ctk.CTkLabel(info_right, text=f"إجمالي المستحق: {emp_row['total_salary']} د.ل", font=("Tajawal", 15, "bold"), text_color="#f9a825").pack(anchor="w")
                ctk.CTkLabel(info_right, text=f"الراتب الأساسي: {emp_row['base_salary']} د.ل  |  المكافآت: {emp_row['total_extras']} د.ل  |  الساعات: {emp_row['total_hours']} س  |  سعر الساعة: {rate} د.ل", font=FONT_TEXT, text_color="#aaaaaa").pack(anchor="w")
                
                # جدول الحضور
                fetch_start = (start_dt - timedelta(days=1)).strftime('%Y-%m-%d')
                user_logs = get_user_logs(pin, fetch_start, ed)
                user_logs.sort(key=lambda x: x['timestamp'])
                
                shifts = []
                current_in = None
                for l in user_logs:
                    ldt = dt_.strptime(l['timestamp'], '%Y-%m-%d %H:%M:%S')
                    if current_in is None:
                        current_in = ldt
                    else:
                        diff = ldt - current_in
                        if diff.total_seconds() > 12 * 3600:
                            shifts.append({'in': current_in, 'out': None, 'hours': 0.0})
                            current_in = ldt
                        else:
                            hours = round(diff.total_seconds() / 3600, 2)
                            shifts.append({'in': current_in, 'out': ldt, 'hours': hours})
                            current_in = None
                if current_in:
                    shifts.append({'in': current_in, 'out': None, 'hours': 0.0})
                
                shifts_by_day = defaultdict(list)
                for s in shifts:
                    if s['in'].date() >= start_dt.date():
                        shifts_by_day[s['in'].strftime('%Y-%m-%d')].append(s)
                
                att_headers = ["اليوم", "التاريخ", "دخول", "خروج", "الساعات", "الحالة"]
                att_values = [att_headers]
                
                curr = start_dt
                present_days = absent_days = 0
                while curr <= actual_end_dt:
                    d_str = curr.strftime('%Y-%m-%d')
                    day_ar = arabic_days.get(curr.strftime('%A'), '')
                    day_shifts = shifts_by_day.get(d_str, [])
                    
                    if not day_shifts:
                        att_values.append([day_ar, d_str, "—", "—", "0", "غياب"])
                        absent_days += 1
                    else:
                        present_days += 1
                        for i, s in enumerate(day_shifts):
                            out_str = s['out'].strftime('%H:%M') + (" +1" if s['out'].date() > s['in'].date() else "") if s['out'] else "—"
                            status = "حضور" if s['out'] else "حضور (ناقص)"
                            att_values.append([
                                day_ar if i == 0 else "",
                                d_str if i == 0 else "",
                                s['in'].strftime('%H:%M'),
                                out_str,
                                str(s['hours']),
                                status
                            ])
                    curr += timedelta(days=1)
                
                ctk.CTkLabel(emp_card, text=f"  أيام الحضور: {present_days}  |  أيام الغياب: {absent_days}", font=FONT_TEXT, text_color="#888888").pack(anchor="e", padx=15)
                
                att_frame = ctk.CTkFrame(emp_card, fg_color="transparent")
                att_frame.pack(fill="x", padx=10, pady=(0, 5))
                att_table = CTkTable(att_frame, values=att_values, font=("Tajawal", 12),
                                     header_color="#0f3460", colors=["#1a1a2e", "#16213e"], justify="center")
                att_table.pack(fill="x", expand=True)
                
                # المكافآت والمهام
                extras = get_extra_tasks_for_user(pin, sd, ed)
                premium = calculate_premium_bonus(pin, shifts, rate)
                if extras or premium > 0:
                    ctk.CTkLabel(emp_card, text="  المكافآت والإضافات:", font=("Tajawal", 13, "bold"), text_color="#81c784").pack(anchor="e", padx=15, pady=(8, 2))
                    bonus_frame = ctk.CTkFrame(emp_card, fg_color="transparent")
                    bonus_frame.pack(fill="x", padx=10, pady=(0, 10))
                    bonus_headers = ["اسم المكافأة / المهمة", "القيمة", "التاريخ"]
                    bonus_values = [bonus_headers]
                    for t in extras:
                        label = f"{t['task_name']} (دورية)" if t.get('is_monthly') else t['task_name']
                        bonus_values.append([label, f"{t['task_value']} د.ل", t['date']])
                    if premium > 0:
                        bonus_values.append(["علاوة ساعات إضافية (Premium)", f"{premium} د.ل", "—"])
                    bonus_table = CTkTable(bonus_frame, values=bonus_values, font=("Tajawal", 12),
                                           header_color="#1b5e20", colors=["#1a2e1a", "#16221a"], justify="center")
                    bonus_table.pack(fill="x", expand=True)
                    
        refresh_report()

    # ========================================================
    # شاشة المستخدمين
    # ========================================================
    def show_users(self):
        self.clear_main()
        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.pack(fill="x", pady=10)
        ctk.CTkLabel(header_frame, text="إدارة الموظفين", font=FONT_TITLE).pack(side="right")
        
        if self.has_perm('add_users'):
            ctk.CTkButton(header_frame, text="إضافة موظف", font=FONT_TEXT, width=120, command=self.open_add_user).pack(side="left")

        self.users_data_map = {}
        users = get_all_users()
        groups = get_setting('groups', {})
        
        headers = ["PIN", "الاسم", "المجموعة (الصلاحية)", "الأجر"]
        values = [headers]
        for u in users:
            r = str(u['role'])
            group_name = groups.get(r, {}).get('name', f"مجموعة {r}") if r != '14' else "مدير"
            values.append([u['pin'], u['name'], group_name, str(u.get('hourly_rate', 0))])
            self.users_data_map[str(u['pin'])] = u
            
        if len(values) > 1:
            frame = ctk.CTkScrollableFrame(self.main_frame)
            frame.pack(fill="both", expand=True)
            table = CTkTable(frame, values=values, font=FONT_TEXT, header_color="#1f538d", justify="center", command=self.on_user_click)
            table.pack(expand=True, fill="both")
            
    def open_add_user(self):
        UserModal(self)
        
    def on_user_click(self, cell):
        if cell['row'] == 0: return # Header clicked
        if not self.has_perm('edit_users'): return
        
        pin = str(cell['value']) if cell['column'] == 0 else str(cell['args'][0][cell['row']][0])
        user = self.users_data_map.get(pin)
        if user:
            UserModal(self, user_data=user)

    # ========================================================
    # شاشة المجموعات والصلاحيات
    # ========================================================
    def show_groups(self):
        self.clear_main()
        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.pack(fill="x", pady=10)
        ctk.CTkLabel(header_frame, text="إدارة المجموعات والصلاحيات", font=FONT_TITLE).pack(side="right")
        
        ctk.CTkButton(header_frame, text="مجموعة جديدة", font=FONT_TEXT, width=120, command=self.open_add_group).pack(side="left")
        
        groups = get_setting('groups', {})
        scroll = ctk.CTkScrollableFrame(self.main_frame, fg_color="transparent")
        scroll.pack(fill="both", expand=True, pady=10)
        
        for gid, grp in groups.items():
            card = ctk.CTkFrame(scroll, fg_color="#2b2b2b", corner_radius=10)
            card.pack(fill="x", pady=10, padx=10, ipadx=10, ipady=10)
            
            top_bar = ctk.CTkFrame(card, fg_color="transparent")
            top_bar.pack(fill="x", pady=(0, 10))
            
            ctk.CTkLabel(top_bar, text=f"{grp.get('name', 'بدون اسم')} ({gid})", font=FONT_HEADER, text_color="#3b8ed0").pack(side="right")
            
            btn_container = ctk.CTkFrame(top_bar, fg_color="transparent")
            btn_container.pack(side="left")
            
            if gid != '14':
                ctk.CTkButton(btn_container, text="حذف", fg_color="#d32f2f", hover_color="#b71c1c", width=60, height=28, command=lambda g=gid: self.delete_group(g)).pack(side="left", padx=5)
            
            ctk.CTkButton(btn_container, text="تعديل", width=60, height=28, command=lambda g=gid, d=grp: self.edit_group(g, d)).pack(side="left", padx=5)
                
            perms_text = "، ".join(grp.get('permissions', []))
            if len(perms_text) > 80: perms_text = perms_text[:80] + "..."
            ctk.CTkLabel(card, text=f"صلاحيات: {perms_text}", font=FONT_TEXT, text_color="gray", justify="right").pack(anchor="e")

    def open_add_group(self):
        GroupModal(self)
        
    def edit_group(self, gid, data):
        GroupModal(self, group_id=gid, group_data=data)
        
    def delete_group(self, gid):
        msg = CTkMessagebox(title="تأكيد الحذف", message=f"هل أنت متأكد من حذف المجموعة ({gid})؟",
                            icon="question", option_1="نعم", option_2="إلغاء")
        if msg.get() == "نعم":
            groups = get_setting('groups', {})
            if gid in groups:
                del groups[gid]
                save_setting('groups', groups)
                self.show_groups()

    # ========================================================
    # شاشة الجهاز
    # ========================================================
    def show_device(self):
        self.current_tab = 'device'
        self.clear_main()
        ctk.CTkLabel(self.main_frame, text="حالة جهاز البصمة", font=FONT_TITLE).pack(anchor="e", pady=10)
        
        card = ctk.CTkFrame(self.main_frame, corner_radius=15, fg_color="#1e1e1e", border_width=1, border_color="#333333")
        card.pack(fill="x", pady=20, padx=20, ipadx=30, ipady=30)
        
        status_frame = ctk.CTkFrame(card, fg_color="transparent")
        status_frame.pack(pady=15)
        
        self.lbl_device_dot = ctk.CTkLabel(status_frame, text="●", font=("Arial", 24))
        self.lbl_device_dot.pack(side="right", padx=(0, 10))
        
        self.lbl_device_status = ctk.CTkLabel(status_frame, text="", font=("Tajawal", 22, "bold"))
        self.lbl_device_status.pack(side="right")
        
        info_container = ctk.CTkFrame(card, fg_color="transparent")
        info_container.pack(pady=20)

        def create_info_row(parent, label):
            row = ctk.CTkFrame(parent, fg_color="transparent")
            row.pack(fill="x", pady=8)
            lbl_val = ctk.CTkLabel(row, text="", font=("Tajawal", 18), text_color="#e0e0e0")
            lbl_val.pack(side="left", padx=20)
            ctk.CTkLabel(row, text=label, font=("Tajawal", 18, "bold"), text_color="#90caf9").pack(side="right")
            
            sep = ctk.CTkFrame(parent, height=1, fg_color="#333333")
            sep.pack(fill="x", pady=5)
            return lbl_val

        self.lbl_device_model = create_info_row(info_container, "الموديل")
        self.lbl_device_sn = create_info_row(info_container, "السيريال")
        self.lbl_device_seen = create_info_row(info_container, "آخر ظهور")
        
        # أزرار التحكم في الجهاز
        if self.has_perm('manage_device'):
            btn_frame1 = ctk.CTkFrame(card, fg_color="transparent")
            btn_frame1.pack(pady=(20, 5))
            
            ctk.CTkButton(btn_frame1, text="إعادة تشغيل", width=120, command=self.restart_device).pack(side="right", padx=5)
            ctk.CTkButton(btn_frame1, text="إرسال الموظفين", width=120, command=self.sync_device_users).pack(side="right", padx=5)
            ctk.CTkButton(btn_frame1, text="مسح السجلات", width=120, fg_color="#d32f2f", hover_color="#b71c1c", command=self.clear_device_logs).pack(side="right", padx=5)

            btn_frame2 = ctk.CTkFrame(card, fg_color="transparent")
            btn_frame2.pack(pady=(5, 0))
            
            ctk.CTkButton(btn_frame2, text="سحب البصمات القديمة", width=160, command=self.pull_device_logs).pack(side="right", padx=5)
            ctk.CTkButton(btn_frame2, text="سحب الموظفين من الجهاز", width=160, command=self.pull_device_users).pack(side="right", padx=5)
        
        self.refresh_device_data()

    def restart_device(self):
        enqueue("C:123:REBOOT")
        CTkMessagebox(title="نجاح", message="تم إرسال أمر إعادة التشغيل للجهاز.", icon="check")
        
    def sync_device_users(self):
        msg = CTkMessagebox(title="تأكيد المزامنة", message="هذا الإجراء سيرسل جميع الموظفين من البرنامج إلى جهاز البصمة.\nهل تود المتابعة؟", icon="question", option_1="نعم", option_2="إلغاء")
        if msg.get() == "نعم":
            users = get_all_users()
            for u in users:
                cmd = f"C:{u['pin']}:DATA UPDATE USERINFO PIN={u['pin']}\tName={u['name']}\tPri={u['role']}\tPasswd={u.get('password', '')}"
                enqueue(cmd)
            CTkMessagebox(title="نجاح", message="تم وضع أوامر مزامنة الموظفين في طابور الانتظار.", icon="check")
            
    def clear_device_logs(self):
        msg = CTkMessagebox(title="تأكيد المسح", message="تحذير: هذا سيحذف جميع بصمات الحضور من ذاكرة الجهاز (البرنامج لن يتأثر).\nهل أنت متأكد؟", icon="warning", option_1="نعم", option_2="إلغاء")
        if msg.get() == "نعم":
            enqueue("C:999:CLEAR LOG")
            CTkMessagebox(title="نجاح", message="تم إرسال أمر مسح السجلات للجهاز.", icon="check")
        
        self.refresh_device_data()

    def pull_device_logs(self):
        enqueue("C:111:DATA QUERY ATTLOG StartTime=2000-01-01 00:00:00")
        CTkMessagebox(title="نجاح", message="تم إرسال أمر سحب البصمات القديمة. قد تستغرق العملية بضع دقائق حسب حجم البيانات.", icon="check", parent=self)

    def pull_device_users(self):
        enqueue("C:112:DATA QUERY USERINFO")
        CTkMessagebox(title="نجاح", message="تم إرسال أمر سحب الموظفين من الجهاز.", icon="check", parent=self)

    def refresh_device_data(self):
        status = device_info.get('connected', False)
        status_text = "متصل بالشبكة" if status else "غير متصل"
        status_color = "#4caf50" if status else "#f44336"
        
        if hasattr(self, 'lbl_device_status') and self.lbl_device_status.winfo_exists():
            self.lbl_device_dot.configure(text_color=status_color)
            self.lbl_device_status.configure(text=status_text, text_color=status_color)
            
            model = device_info.get('model')
            sn = device_info.get('sn')
            self.lbl_device_model.configure(text=model if model else "غير متوفر")
            self.lbl_device_sn.configure(text=sn if sn else "غير متوفر")
            
            last_seen = device_info.get('last_seen')
            if last_seen and last_seen != '—':
                last_seen = str(last_seen).replace('T', ' ')[:19]
            else:
                last_seen = "غير متوفر"
            self.lbl_device_seen.configure(text=last_seen)

    def logout(self):
        self.current_user = None
        self.user_perms = []
        self.withdraw()
        if not hasattr(self, 'login_window') or not self.login_window.winfo_exists():
            self.login_window = LoginWindow(self)
        else:
            self.login_window.deiconify()
        
    def update_loop(self):
        from datetime import datetime as _dt
        # فحص انقطاع الاتصال: إذا لم يصل heartbeat منذ أكثر من 120 ثانية
        last_seen = device_info.get('last_seen')
        if last_seen and device_info.get('connected'):
            try:
                last_dt = _dt.fromisoformat(str(last_seen))
                elapsed = (_dt.now() - last_dt).total_seconds()
                if elapsed > 120:
                    device_info['connected'] = False
            except:
                pass
                
        if hasattr(self, 'current_tab') and self.current_tab == 'device':
            self.refresh_device_data()
        self.after(2000, self.update_loop)

if __name__ == "__main__":
    set_auto_startup()
    
    app = App()
    ipc = SingletonIPC(app)
    
    if not ipc.start():
        # البرنامج يعمل مسبقاً في الخلفية وتم إرسال أمر لإظهاره
        sys.exit(0)
    
    def _start_app():
        """تُشغَّل بعد التفعيل الناجح أو إذا كان البرنامج مُفعَّلاً مسبقاً."""
        is_startup = '--startup' in sys.argv
        if is_startup and hasattr(app, 'login_window'):
            app.login_window.withdraw()
        app.update_loop()
    
    if is_activated():
        _start_app()
    else:
        # إخفاء النافذة الرئيسية وعرض نافذة التفعيل أولاً
        app.withdraw()
        ActivationWindow(app, on_success=lambda: (app.deiconify(), _start_app()))
    
    app.mainloop()
