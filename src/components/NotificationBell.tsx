'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Mail,
  Send,
  X,
  FileText,
  AlertCircle,
  Building2,
  Calendar
} from 'lucide-react';
import { Notification } from '@/types/database';
import {
  fetchNotifications,
  markNotificationAsRead,
  getDispatchedEmails,
  EmailAlertPayload
} from '@/lib/workflowService';

interface NotificationBellProps {
  role: 'admin_head_hr' | 'receptionist' | 'institute_head' | 'appointment_officer' | 'guest';
  instituteId?: string;
  onSelectApplication?: (applicationId: string) => void;
}

export function NotificationBell({ role, instituteId, onSelectApplication }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'emails'>('notifications');
  const [dispatchedEmails, setDispatchedEmails] = useState<EmailAlertPayload[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailAlertPayload | null>(null);

  const loadData = async () => {
    const list = await fetchNotifications(role, instituteId);
    setNotifications(list);
    setDispatchedEmails(getDispatchedEmails());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Polling every 10s for live alerts
    return () => clearInterval(interval);
  }, [role, instituteId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (notif: Notification) => {
    await markNotificationAsRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await handleMarkRead(notif);
    }
    if (notif.application_id && onSelectApplication) {
      onSelectApplication(notif.application_id);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    for (const notif of notifications.filter((n) => !n.is_read)) {
      await markNotificationAsRead(notif.id);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative font-sans">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          loadData();
        }}
        className={`relative p-2 rounded-xl border transition flex items-center justify-center ${
          isOpen
            ? 'bg-sky-100 text-sky-800 border-sky-300 shadow-inner'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
        }`}
        title={`Notifications & Email Alerts (${unreadCount} unread)`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[9px] min-w-[18px] text-center shadow animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/10"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-100">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
                  <Bell className="w-4 h-4 text-sky-400" /> Workflow Alert Center
                </h3>
                <p className="text-[11px] text-slate-400">
                  {role === 'institute_head' ? 'Institute Head Alerts' : 'Central HR Notifications'}
                </p>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && activeTab === 'notifications' && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-sky-200 transition flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs: Notifications vs Email Outbox */}
            <div className="flex items-center border-b border-slate-100 bg-slate-50 p-1 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 py-1.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'notifications'
                    ? 'bg-white text-sky-900 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                <span>Alerts</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('emails')}
                className={`flex-1 py-1.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'emails'
                    ? 'bg-white text-sky-900 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Outbox</span>
                {dispatchedEmails.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[9px]">
                    {dispatchedEmails.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab 1: In-App Notifications List */}
            {activeTab === 'notifications' && (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <CheckCircleIcon className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold">No notifications right now</p>
                    <p className="text-[10px] text-slate-400">
                      When Central HR or Institute Heads forward or review applications, alerts appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isReview = notif.type === 'institute_reviewed';
                    const isForward = notif.type === 'forwarded_to_institute';

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 transition cursor-pointer flex items-start gap-3 ${
                          notif.is_read
                            ? 'bg-white hover:bg-slate-50'
                            : 'bg-sky-50/70 hover:bg-sky-100/70 border-l-4 border-l-sky-600'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isForward
                              ? 'bg-indigo-100 text-indigo-700'
                              : isReview
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {isForward ? (
                            <Building2 className="w-4 h-4" />
                          ) : isReview ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(notif.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 leading-snug line-clamp-3">
                            {notif.message}
                          </p>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                              {new Date(notif.created_at).toLocaleDateString('en-GB')}
                            </span>
                            {notif.application_id && (
                              <span className="text-[10px] font-bold text-sky-700 hover:underline flex items-center gap-0.5">
                                View file <ExternalLink className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab 2: Simulated Email Outbox List */}
            {activeTab === 'emails' && (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {dispatchedEmails.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Mail className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold">No emails dispatched yet</p>
                    <p className="text-[10px] text-slate-400">
                      Dispatched alerts to Institute Heads and Central HR will log here.
                    </p>
                  </div>
                ) : (
                  dispatchedEmails.map((email, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedEmail(email)}
                      className="p-3.5 hover:bg-slate-50 transition cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          To: {email.toName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {new Date(email.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-[10.5px] text-sky-800 font-medium block truncate">
                        {email.subject}
                      </span>
                      <p className="text-[10px] text-slate-500 line-clamp-2">
                        {email.body}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
              <span className="text-[10px] text-slate-400">
                Automated Recruitment Workflow • SmartHR Multi-Tier Alert System
              </span>
            </div>
          </div>
        </>
      )}

      {/* Modal to view specific dispatched email contents */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Dispatched Email Alert</h4>
                  <span className="text-[10px] text-slate-400">
                    {new Date(selectedEmail.timestamp).toLocaleString('en-GB')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div>
                <span className="font-bold text-slate-600">To: </span>
                <span className="text-slate-900 font-semibold">{selectedEmail.toName} &lt;{selectedEmail.toEmail}&gt;</span>
              </div>
              <div>
                <span className="font-bold text-slate-600">Subject: </span>
                <span className="text-sky-900 font-bold">{selectedEmail.subject}</span>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-xs font-mono whitespace-pre-line text-slate-800 leading-relaxed max-h-60 overflow-y-auto">
              {selectedEmail.body}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
