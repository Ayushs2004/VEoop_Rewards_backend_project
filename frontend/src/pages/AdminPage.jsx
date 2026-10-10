import React, { useState, useEffect } from 'react';
import { adminApi, withdrawalApi, walletApi } from '../api/client';
import {
  Shield,
  Users,
  Wallet,
  ArrowRightLeft,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  FileText,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sliders,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Lock,
  UserCheck
} from 'lucide-react';

export const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'withdrawals' | 'wallet' | 'audit'

  // Loading & Feedback States
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // 1. Overview Stats State
  const [stats, setStats] = useState(null);

  // 2. Users Management State
  const [users, setUsers] = useState([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // Selected User Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [userModalTab, setUserModalTab] = useState('wallet'); // 'wallet' | 'transactions' | 'withdrawals'
  const [userTransactions, setUserTransactions] = useState([]);
  const [userTxPage, setUserTxPage] = useState(1);
  const [userTxTotalPages, setUserTxTotalPages] = useState(1);
  const [userWithdrawals, setUserWithdrawals] = useState([]);
  const [userWdPage, setUserWdPage] = useState(1);
  const [userWdTotalPages, setUserWdTotalPages] = useState(1);
  const [userModalLoading, setUserModalLoading] = useState(false);

  // 3. Withdrawals Management State
  const [withdrawals, setWithdrawals] = useState([]);
  const [wdPage, setWdPage] = useState(1);
  const [wdTotalPages, setWdTotalPages] = useState(1);
  const [wdTotal, setWdTotal] = useState(0);
  const [wdStatusFilter, setWdStatusFilter] = useState('');
  const [wdMethodFilter, setWdMethodFilter] = useState('');
  const [wdSearch, setWdSearch] = useState('');
  const [wdStartDate, setWdStartDate] = useState('');
  const [wdEndDate, setWdEndDate] = useState('');

  // Withdrawal Detail Modal State
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [wdDetailLoading, setWdDetailLoading] = useState(false);

  // Rejection & Approval Modals
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('Invalid beneficiary details');
  const [approvingId, setApprovingId] = useState(null);
  const [approvalNote, setApprovalNote] = useState('Approved via Admin Portal');

  // 4. Wallet Adjustment Form State
  const [adjustment, setAdjustment] = useState({
    userId: '',
    type: 'credit',
    amount: '',
    currency: 'VEs',
    reason: ''
  });
  const [confirmAdjustment, setConfirmAdjustment] = useState(null);
  const [adjustmentResult, setAdjustmentResult] = useState(null);

  // 5. Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditTypeFilter, setAuditTypeFilter] = useState('');

  // ==================== DATA FETCHERS ====================

  const fetchOverviewStats = async () => {
    try {
      const res = await adminApi.getStats();
      if (res.success) setStats(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load stats.');
    }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', userPage);
      params.append('limit', 10);
      if (userSearch.trim()) params.append('search', userSearch.trim());
      if (userStatusFilter) params.append('status', userStatusFilter);
      if (userRoleFilter) params.append('role', userRoleFilter);

      const res = await adminApi.getUsers(params.toString());
      if (res.success) {
        setUsers(res.data);
        if (res.pagination) {
          setUserTotalPages(res.pagination.totalPages || 1);
          setUserTotal(res.pagination.total || 0);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', wdPage);
      params.append('limit', 10);
      if (wdStatusFilter) params.append('status', wdStatusFilter);
      if (wdMethodFilter) params.append('method', wdMethodFilter);
      if (wdSearch.trim()) params.append('search', wdSearch.trim());
      if (wdStartDate) params.append('startDate', wdStartDate);
      if (wdEndDate) params.append('endDate', wdEndDate);

      const res = await adminApi.getWithdrawals(params.toString());
      if (res.success) {
        setWithdrawals(res.data);
        if (res.pagination) {
          setWdTotalPages(res.pagination.totalPages || 1);
          setWdTotal(res.pagination.total || 0);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load withdrawals.');
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', auditPage);
      params.append('limit', 20);
      if (auditActionFilter) params.append('action', auditActionFilter);
      if (auditTypeFilter) params.append('targetType', auditTypeFilter);

      const res = await adminApi.getAuditLogs(params.toString());
      if (res.success) {
        setAuditLogs(res.data);
        if (res.pagination) {
          setAuditTotalPages(res.pagination.totalPages || 1);
          setAuditTotal(res.pagination.total || 0);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
    }
  };

  // Master refresh depending on active tab
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'overview') await fetchOverviewStats();
      if (activeTab === 'users') await fetchUsers();
      if (activeTab === 'withdrawals') await fetchWithdrawals();
      if (activeTab === 'audit') await fetchAuditLogs();
      if (activeTab === 'wallet') await fetchOverviewStats();
    } finally {
      setLoading(false);
    }
  };

  // Initial and reactive effects
  useEffect(() => {
    handleRefresh();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [userPage, userStatusFilter, userRoleFilter]);

  useEffect(() => {
    if (activeTab === 'withdrawals') fetchWithdrawals();
  }, [wdPage, wdStatusFilter, wdMethodFilter, wdStartDate, wdEndDate]);

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLogs();
  }, [auditPage, auditActionFilter, auditTypeFilter]);

  // Debounced search for Users
  useEffect(() => {
    if (activeTab !== 'users') return;
    const timer = setTimeout(() => {
      setUserPage(1);
      fetchUsers();
    }, 350);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Debounced search for Withdrawals
  useEffect(() => {
    if (activeTab !== 'withdrawals') return;
    const timer = setTimeout(() => {
      setWdPage(1);
      fetchWithdrawals();
    }, 350);
    return () => clearTimeout(timer);
  }, [wdSearch]);

  // ==================== USER MODAL HANDLERS ====================

  const openUserModal = async (user) => {
    setSelectedUser(user);
    setUserModalTab('wallet');
    setUserModalLoading(true);
    try {
      const res = await adminApi.getUserDetails(user._id);
      if (res.success) {
        setSelectedUserDetails(res.data);
      }
      // Pre-fetch transactions and withdrawals
      fetchUserModalTransactions(user._id, 1);
      fetchUserModalWithdrawals(user._id, 1);
    } catch (err) {
      setError(err.message || 'Failed to load user details.');
    } finally {
      setUserModalLoading(false);
    }
  };

  const fetchUserModalTransactions = async (userId, page = 1) => {
    try {
      const res = await adminApi.getUserTransactions(userId, `page=${page}&limit=8`);
      if (res.success) {
        setUserTransactions(res.data);
        if (res.pagination) {
          setUserTxPage(res.pagination.page);
          setUserTxTotalPages(res.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserModalWithdrawals = async (userId, page = 1) => {
    try {
      const res = await adminApi.getUserWithdrawals(userId, `page=${page}&limit=8`);
      if (res.success) {
        setUserWithdrawals(res.data);
        if (res.pagination) {
          setUserWdPage(res.pagination.page);
          setUserWdTotalPages(res.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==================== WITHDRAWAL MODAL HANDLERS ====================

  const openWithdrawalDetailModal = async (withdrawalId) => {
    setWdDetailLoading(true);
    try {
      const res = await adminApi.getWithdrawalDetails(withdrawalId);
      if (res.success) {
        setSelectedWithdrawal(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load withdrawal details.');
    } finally {
      setWdDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approvingId) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await withdrawalApi.adminApprove(approvingId, {
        reviewNote: approvalNote || 'Approved via Admin Portal'
      });
      if (res.success) {
        setSuccessMsg(`Withdrawal ${approvingId} approved successfully.`);
        setApprovingId(null);
        if (selectedWithdrawal?.withdrawal?.withdrawalId === approvingId) {
          setSelectedWithdrawal(null);
        }
        fetchWithdrawals();
        fetchOverviewStats();
      }
    } catch (err) {
      setError(err.message || 'Failed to approve withdrawal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    if (!rejectReason.trim()) {
      setError('A mandatory rejection reason is required.');
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await withdrawalApi.adminReject(rejectingId, {
        reason: rejectReason.trim()
      });
      if (res.success) {
        setSuccessMsg(
          `Withdrawal ${rejectingId} rejected. Deducted balance has been safely refunded via immutable ledger reversal.`
        );
        setRejectingId(null);
        if (selectedWithdrawal?.withdrawal?.withdrawalId === rejectingId) {
          setSelectedWithdrawal(null);
        }
        fetchWithdrawals();
        fetchOverviewStats();
      }
    } catch (err) {
      setError(err.message || 'Failed to reject withdrawal.');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== WALLET ADJUSTMENT HANDLERS ====================

  const handleOpenAdjustmentConfirm = (e) => {
    e.preventDefault();
    if (!adjustment.userId.trim() || !adjustment.amount) {
      setError('Please provide a valid Target User and Amount.');
      return;
    }
    if (!adjustment.reason.trim()) {
      setError('A mandatory reason is required for administrative wallet adjustments.');
      return;
    }
    setConfirmAdjustment({
      ...adjustment,
      amount: parseFloat(adjustment.amount)
    });
  };

  const executeAdjustment = async () => {
    if (!confirmAdjustment) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = {
        userId: confirmAdjustment.userId.trim(),
        currency: confirmAdjustment.currency,
        amount: confirmAdjustment.amount,
        reason: confirmAdjustment.reason.trim()
      };

      let res;
      if (confirmAdjustment.type === 'credit') {
        res = await walletApi.adminCredit(payload);
      } else {
        res = await walletApi.adminDebit(payload);
      }

      if (res.success) {
        setAdjustmentResult(res.data);
        setSuccessMsg(
          `Successfully executed ${confirmAdjustment.type.toUpperCase()} of ${confirmAdjustment.amount} ${confirmAdjustment.currency}!`
        );
        setConfirmAdjustment(null);
        setAdjustment({
          userId: '',
          type: 'credit',
          amount: '',
          currency: 'VEs',
          reason: ''
        });
        fetchOverviewStats();
      }
    } catch (err) {
      setError(err.message || 'Adjustment failed.');
      setConfirmAdjustment(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Quick switch to adjust balance for a specific user
  const initiateUserAdjustment = (targetUser) => {
    setSelectedUser(null);
    setSelectedUserDetails(null);
    setAdjustment({
      userId: targetUser.email || targetUser._id,
      type: 'credit',
      amount: '',
      currency: 'VEs',
      reason: ''
    });
    setActiveTab('wallet');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ec4899' }}>
            <Shield size={20} />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Administration & Financial Control Portal
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>
            VELoop Rewards System Control
          </h1>
        </div>

        <button className="btn-secondary" onClick={handleRefresh} disabled={loading || actionLoading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh Data
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle size={20} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={16} /> Dashboard Overview
        </button>

        <button
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} /> User Management
          {stats?.users?.total !== undefined && (
            <span style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 7px', borderRadius: '10px', fontSize: '0.75rem' }}>
              {stats.users.total}
            </span>
          )}
        </button>

        <button
          className={`admin-tab ${activeTab === 'withdrawals' ? 'active' : ''}`}
          onClick={() => setActiveTab('withdrawals')}
        >
          <ArrowRightLeft size={16} /> Withdrawal Management
          {stats?.withdrawals?.pending > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', padding: '2px 7px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
              {stats.withdrawals.pending}
            </span>
          )}
        </button>

        <button
          className={`admin-tab ${activeTab === 'wallet' ? 'active' : ''}`}
          onClick={() => setActiveTab('wallet')}
        >
          <Wallet size={16} /> Wallet Adjustment (Ledger Direct)
        </button>

        <button
          className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <FileText size={16} /> Security & Audit Logs
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DASHBOARD OVERVIEW */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div>
          {/* Key Metric Cards */}
          <div className="stat-grid-5">
            <div className="stat-box">
              <span className="stat-box-title">Total Users</span>
              <span className="stat-box-value">{stats?.users?.total ?? '—'}</span>
              <span className="stat-box-subtitle" style={{ color: '#10b981' }}>
                Active: {stats?.users?.active ?? '—'}
              </span>
            </div>

            <div className="stat-box">
              <span className="stat-box-title">System VEs in Circulation</span>
              <span className="stat-box-value" style={{ color: '#c4b5fd' }}>
                {stats?.circulation?.totalVEs ? Number(stats.circulation.totalVEs).toLocaleString() : '—'}
              </span>
              <span className="stat-box-subtitle">
                Avg: {stats?.circulation?.avgVEs ? Math.round(stats.circulation.avgVEs).toLocaleString() : 0} VEs/user
              </span>
            </div>

            <div className="stat-box">
              <span className="stat-box-title">Pending Withdrawals</span>
              <span className="stat-box-value" style={{ color: '#f59e0b' }}>
                {stats?.withdrawals?.pending ?? 0}
              </span>
              <span className="stat-box-subtitle">
                Req: {Number(stats?.withdrawals?.totalPendingVEs || 0).toLocaleString()} VEs (₹{stats?.withdrawals?.totalPendingPayoutINR || 0})
              </span>
            </div>

            <div className="stat-box">
              <span className="stat-box-title">Approved Payouts</span>
              <span className="stat-box-value" style={{ color: '#10b981' }}>
                {stats?.withdrawals?.approved ?? 0}
              </span>
              <span className="stat-box-subtitle">
                Total Paid: ₹{stats?.withdrawals?.totalApprovedPayoutINR || 0}
              </span>
            </div>

            <div className="stat-box">
              <span className="stat-box-title">Rejected & Refunded</span>
              <span className="stat-box-value" style={{ color: '#ef4444' }}>
                {stats?.withdrawals?.rejected ?? 0}
              </span>
              <span className="stat-box-subtitle">Safely reversed in ledger</span>
            </div>
          </div>

          {/* Secondary Currencies Overview */}
          <div className="glass-card" style={{ marginBottom: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Multi-Currency System Balance Reserves
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SVEs Reserve</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8' }}>{Number(stats?.circulation?.totalSVEs || 0).toLocaleString()}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gems Reserve</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ec4899' }}>{Number(stats?.circulation?.totalGems || 0).toLocaleString()}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tokens Reserve</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f59e0b' }}>{Number(stats?.circulation?.totalTokens || 0).toLocaleString()}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Spins Reserve</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#10b981' }}>{Number(stats?.circulation?.totalSpins || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Feeds: Recent Ledger Activity & Admin Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {/* Recent Transactions */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowRightLeft size={18} color="#8b5cf6" /> Recent Platform Transactions
                </h3>
              </div>

              {!stats?.recentTransactions || stats.recentTransactions.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
                  No recent transactions found.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table-custom">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Source</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentTransactions.map((tx) => (
                        <tr key={tx.transactionId || tx._id}>
                          <td style={{ fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 600 }}>{tx.userId?.name || 'User'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.userId?.email || 'N/A'}</div>
                          </td>
                          <td>
                            <span className={`badge-status ${tx.type === 'CREDIT' ? 'approved' : 'rejected'}`} style={{ fontSize: '0.7rem' }}>
                              {tx.type}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: tx.type === 'CREDIT' ? '#10b981' : '#f87171' }}>
                            {tx.type === 'CREDIT' ? '+' : '-'}{Number(tx.amount).toLocaleString()} {tx.currency}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tx.source}</td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Audit Logs */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} color="#ec4899" /> Recent Administrative Activities
                </h3>
              </div>

              {!stats?.recentAuditLogs || stats.recentAuditLogs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
                  No administrative actions logged yet.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table-custom">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Target</th>
                        <th>Reference</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentAuditLogs.map((log) => (
                        <tr key={log.auditId || log._id}>
                          <td>
                            <span style={{ fontWeight: 600, color: '#c4b5fd', fontSize: '0.8rem' }}>{log.action}</span>
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>
                            {log.targetUserId?.name || log.targetType || 'System'}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {log.referenceId || 'N/A'}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: USER MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Registered Users Directory</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing {users.length} of {userTotal} registered users
            </span>
          </div>

          {/* Search & Filter Bar */}
          <div className="admin-filter-bar">
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Search by name, email, or user ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <select
              className="form-input"
              style={{ width: 'auto', minWidth: '140px' }}
              value={userStatusFilter}
              onChange={(e) => {
                setUserStatusFilter(e.target.value);
                setUserPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="FLAGGED">Flagged</option>
            </select>

            <select
              className="form-input"
              style={{ width: 'auto', minWidth: '130px' }}
              value={userRoleFilter}
              onChange={(e) => {
                setUserRoleFilter(e.target.value);
                setUserPage(1);
              }}
            >
              <option value="">All Roles</option>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {/* Users Table */}
          {users.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No users found matching the search criteria.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>User Profile</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>VEs Balance</th>
                    <th>Other Balances</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u._id}</div>
                      </td>
                      <td>
                        <span className={`badge-status ${u.accountStatus.toLowerCase()}`}>
                          {u.accountStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`role-pill ${u.role === 'ADMIN' ? 'admin' : ''}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#c4b5fd', fontSize: '1rem' }}>
                          {Number(u.wallet?.ves || 0).toLocaleString()} VEs
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div>SVEs: {Number(u.wallet?.sves || 0).toLocaleString()}</div>
                        <div>Gems: {u.wallet?.gems || 0} | Tokens: {u.wallet?.tokens || 0}</div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            onClick={() => openUserModal(u)}
                            title="View user wallet details and ledger history"
                          >
                            <Eye size={13} /> View Wallet
                          </button>
                          <button
                            className="btn-primary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            onClick={() => initiateUserAdjustment(u)}
                            title="Credit or Debit user wallet"
                          >
                            <DollarSign size={13} /> Adjust
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="pagination-bar">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Page {userPage} of {userTotalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-secondary"
                disabled={userPage <= 1}
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                className="btn-secondary"
                disabled={userPage >= userTotalPages}
                onClick={() => setUserPage((p) => p + 1)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: WITHDRAWAL MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === 'withdrawals' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Withdrawal Requests & Payout Queue</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Total: {wdTotal} requests
            </span>
          </div>

          {/* Filter Bar */}
          <div className="admin-filter-bar">
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Search by ID, user email, name..."
                value={wdSearch}
                onChange={(e) => setWdSearch(e.target.value)}
              />
            </div>

            <select
              className="form-input"
              style={{ width: 'auto', minWidth: '130px' }}
              value={wdStatusFilter}
              onChange={(e) => {
                setWdStatusFilter(e.target.value);
                setWdPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              className="form-input"
              style={{ width: 'auto', minWidth: '150px' }}
              value={wdMethodFilter}
              onChange={(e) => {
                setWdMethodFilter(e.target.value);
                setWdPage(1);
              }}
            >
              <option value="">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="PAYPAL">PayPal</option>
              <option value="AMAZON_GIFT_CARD">Amazon Gift Card</option>
              <option value="GOOGLE_PLAY_GIFT_CARD">Google Play Gift Card</option>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From:</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                value={wdStartDate}
                onChange={(e) => setWdStartDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To:</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                value={wdEndDate}
                onChange={(e) => setWdEndDate(e.target.value)}
              />
            </div>

            {(wdStatusFilter || wdMethodFilter || wdSearch || wdStartDate || wdEndDate) && (
              <button
                className="btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => {
                  setWdStatusFilter('');
                  setWdMethodFilter('');
                  setWdSearch('');
                  setWdStartDate('');
                  setWdEndDate('');
                  setWdPage(1);
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Table */}
          {withdrawals.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No withdrawals match the selected criteria.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>Withdrawal ID</th>
                    <th>User</th>
                    <th>Method</th>
                    <th>Payout Amount</th>
                    <th>VEs Deducted</th>
                    <th>Recipient Details</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => {
                    const recipientText =
                      w.payoutDetails?.maskedUpiId ||
                      w.payoutDetails?.maskedEmail ||
                      w.payoutDetails?.upiId ||
                      w.payoutDetails?.email ||
                      'N/A';

                    return (
                      <tr key={w.withdrawalId || w._id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                          {w.withdrawalId}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{w.userId?.name || 'User'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.userId?.email || ''}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {w.method === 'UPI' && '⚡ UPI'}
                          {w.method === 'PAYPAL' && '🅿️ PayPal'}
                          {w.method === 'AMAZON_GIFT_CARD' && '📦 Amazon'}
                          {w.method === 'GOOGLE_PLAY_GIFT_CARD' && '🎮 Play Store'}
                        </td>
                        <td style={{ fontWeight: 700, color: '#10b981' }}>
                          {w.payoutCurrency === 'INR' ? '₹' : '$'}
                          {w.payoutAmount}
                        </td>
                        <td style={{ color: '#c4b5fd', fontWeight: 600 }}>
                          {Number(w.currencyAmount).toLocaleString()} VEs
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                            {recipientText}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-status ${w.status.toLowerCase()}`}>
                            {w.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(w.requestedAt || w.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => openWithdrawalDetailModal(w.withdrawalId)}
                              title="View complete withdrawal details"
                            >
                              <Eye size={13} />
                            </button>

                            {(w.status === 'PENDING' || w.status === 'PROCESSING') && (
                              <>
                                <button
                                  className="btn-success"
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    setApprovingId(w.withdrawalId);
                                    setApprovalNote('Approved via Admin Portal');
                                  }}
                                  disabled={actionLoading}
                                  title="Approve payout"
                                >
                                  <Check size={13} /> Approve
                                </button>
                                <button
                                  className="btn-danger"
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    setRejectingId(w.withdrawalId);
                                    setRejectReason('Invalid beneficiary details');
                                  }}
                                  disabled={actionLoading}
                                  title="Reject and execute automatic refund reversal"
                                >
                                  <X size={13} /> Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="pagination-bar">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Page {wdPage} of {wdTotalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-secondary"
                disabled={wdPage <= 1}
                onClick={() => setWdPage((p) => Math.max(1, p - 1))}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                className="btn-secondary"
                disabled={wdPage >= wdTotalPages}
                onClick={() => setWdPage((p) => p + 1)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: WALLET ADJUSTMENT (DIRECT LEDGER CONTROL) */}
      {/* ======================================================== */}
      {activeTab === 'wallet' && (
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
              <Wallet size={22} color="#8b5cf6" />
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                Administrative Wallet Mutation (Ledger Backed)
              </h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Perform direct, authoritative balance adjustments. Every adjustment strictly writes an immutable ledger entry, records a system audit log, updates balances atomically, and returns verifiable before-and-after balances.
            </p>

            <form onSubmit={handleOpenAdjustmentConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Target User */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Target User</label>
                  <button
                    type="button"
                    onClick={() => setAdjustment({ ...adjustment, userId: 'demo@veloop.test' })}
                    style={{
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      color: '#a5b4fc',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    Use "demo@veloop.test"
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter User Email, User Name, or MongoDB ObjectId"
                  value={adjustment.userId}
                  onChange={(e) => setAdjustment({ ...adjustment, userId: e.target.value })}
                  required
                />
              </div>

              {/* Grid: Type & Currency & Amount */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Adjustment Type</label>
                  <select
                    className="form-input"
                    value={adjustment.type}
                    onChange={(e) => setAdjustment({ ...adjustment, type: e.target.value })}
                  >
                    <option value="credit">CREDIT (Add Funds)</option>
                    <option value="debit">DEBIT (Deduct Funds)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select
                    className="form-input"
                    value={adjustment.currency}
                    onChange={(e) => setAdjustment({ ...adjustment, currency: e.target.value })}
                  >
                    <option value="VEs">VEs (Primary)</option>
                    <option value="SVEs">SVEs</option>
                    <option value="Gems">Gems</option>
                    <option value="Tokens">Tokens</option>
                    <option value="Spins">Spins</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    className="form-input"
                    placeholder="e.g. 500"
                    value={adjustment.amount}
                    onChange={(e) => setAdjustment({ ...adjustment, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Mandatory Reason */}
              <div className="form-group">
                <label className="form-label">
                  Mandatory Reason / Audit Note <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Provide explicit operational justification (e.g. VIP goodwill bonus, correction for failed task reward, fraud mitigation debit)..."
                  value={adjustment.reason}
                  onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '0.85rem' }} disabled={actionLoading}>
                Review & Confirm Adjustment
              </button>
            </form>
          </div>

          {/* Last Result Card */}
          {adjustmentResult && (
            <div className="glass-card" style={{ borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', marginBottom: '0.75rem' }}>
                <CheckCircle size={20} />
                <h4 style={{ fontWeight: 800, margin: 0 }}>Adjustment Executed Successfully</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Balance Before</div>
                  <div style={{ fontWeight: 700 }}>{Number(adjustmentResult.balanceBefore).toLocaleString()} {adjustmentResult.currency}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Adjustment</div>
                  <div style={{ fontWeight: 700, color: adjustmentResult.type === 'CREDIT' ? '#10b981' : '#ef4444' }}>
                    {adjustmentResult.type === 'CREDIT' ? '+' : '-'}{Number(adjustmentResult.amount).toLocaleString()} {adjustmentResult.currency}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Balance After</div>
                  <div style={{ fontWeight: 800, color: '#c4b5fd' }}>{Number(adjustmentResult.balanceAfter).toLocaleString()} {adjustmentResult.currency}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Transaction ID</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{adjustmentResult.transaction?.transactionId || 'N/A'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: SECURITY & AUDIT LOGS */}
      {/* ======================================================== */}
      {activeTab === 'audit' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>System Security & Audit Trail</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Total: {auditTotal} logged events
            </span>
          </div>

          {/* Filter Bar */}
          <div className="admin-filter-bar">
            <select
              className="form-input"
              style={{ width: 'auto', minWidth: '180px' }}
              value={auditActionFilter}
              onChange={(e) => {
                setAuditActionFilter(e.target.value);
                setAuditPage(1);
              }}
            >
              <option value="">All Action Types</option>
              <option value="WITHDRAWAL_CREATED">Withdrawal Created</option>
              <option value="WITHDRAWAL_APPROVED">Withdrawal Approved</option>
              <option value="WITHDRAWAL_REJECTED">Withdrawal Rejected</option>
              <option value="WALLET_CREDIT">Wallet Credit</option>
              <option value="WALLET_DEBIT">Wallet Debit</option>
              <option value="USER_REGISTERED">User Registered</option>
              <option value="USER_LOGIN">User Login</option>
            </select>

            <select
              className="form-input"
              style={{ width: 'auto', minWidth: '160px' }}
              value={auditTypeFilter}
              onChange={(e) => {
                setAuditTypeFilter(e.target.value);
                setAuditPage(1);
              }}
            >
              <option value="">All Targets</option>
              <option value="WITHDRAWAL">Withdrawal</option>
              <option value="WALLET">Wallet</option>
              <option value="USER">User</option>
            </select>
          </div>

          {/* Audit Table */}
          {auditLogs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No audit logs recorded matching this filter.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>Audit ID</th>
                    <th>Action</th>
                    <th>Actor (Admin)</th>
                    <th>Target User</th>
                    <th>Reference</th>
                    <th>Metadata Details</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.auditId || log._id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {log.auditId}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#c4b5fd', fontSize: '0.8rem' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        <div>{log.actorId?.name || 'System / Auto'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.actorId?.email || ''}</div>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        <div>{log.targetUserId?.name || log.targetType || 'N/A'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.targetUserId?.email || ''}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {log.referenceId || 'N/A'}
                      </td>
                      <td style={{ fontSize: '0.75rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.metadata?.reason && (
                          <div style={{ color: '#a5b4fc' }}>Reason: {log.metadata.reason}</div>
                        )}
                        {log.metadata?.reviewNote && (
                          <div style={{ color: '#10b981' }}>Note: {log.metadata.reviewNote}</div>
                        )}
                        {log.metadata?.amount && (
                          <div>Amt: {log.metadata.amount} {log.metadata.currency || ''}</div>
                        )}
                        {log.ip && <div style={{ color: 'var(--text-muted)' }}>IP: {log.ip}</div>}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="pagination-bar">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Page {auditPage} of {auditTotalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-secondary"
                disabled={auditPage <= 1}
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                className="btn-secondary"
                disabled={auditPage >= auditTotalPages}
                onClick={() => setAuditPage((p) => p + 1)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: USER DETAILS & WALLET LEDGER DRAWER */}
      {/* ======================================================== */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} color="#8b5cf6" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  User Wallet & Financial Profile
                </h3>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {userModalLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading user ledger data...
                </div>
              ) : (
                <>
                  {/* User Profile Bar */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{selectedUserDetails?.user?.name || selectedUser.name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedUserDetails?.user?.email || selectedUser.email}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {selectedUser._id}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className={`badge-status ${(selectedUserDetails?.user?.accountStatus || selectedUser.accountStatus).toLowerCase()}`}>
                        {selectedUserDetails?.user?.accountStatus || selectedUser.accountStatus}
                      </span>
                      <button
                        className="btn-primary"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                        onClick={() => initiateUserAdjustment(selectedUser)}
                      >
                        <DollarSign size={14} /> Adjust Balance
                      </button>
                    </div>
                  </div>

                  {/* 5 Currency Balances */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#c4b5fd', fontWeight: 600 }}>VEs Balance</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
                        {Number(selectedUserDetails?.wallet?.ves ?? selectedUser.wallet?.ves ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SVEs</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8' }}>
                        {Number(selectedUserDetails?.wallet?.sves ?? selectedUser.wallet?.sves ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gems</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ec4899' }}>
                        {Number(selectedUserDetails?.wallet?.gems ?? selectedUser.wallet?.gems ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tokens</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f59e0b' }}>
                        {Number(selectedUserDetails?.wallet?.tokens ?? selectedUser.wallet?.tokens ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Spins</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#10b981' }}>
                        {Number(selectedUserDetails?.wallet?.spins ?? selectedUser.wallet?.spins ?? 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Sub-tabs: Transactions vs Withdrawals */}
                  <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    <button
                      className={`admin-tab ${userModalTab === 'wallet' ? 'active' : ''}`}
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      onClick={() => setUserModalTab('wallet')}
                    >
                      <ArrowRightLeft size={14} /> Complete Ledger History
                    </button>
                    <button
                      className={`admin-tab ${userModalTab === 'withdrawals' ? 'active' : ''}`}
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      onClick={() => setUserModalTab('withdrawals')}
                    >
                      <DollarSign size={14} /> Payout & Withdrawal Requests
                    </button>
                  </div>

                  {/* Sub-tab 1: Transactions Table */}
                  {userModalTab === 'wallet' && (
                    <div>
                      {userTransactions.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          No transaction ledger records found for this user.
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table-custom">
                            <thead>
                              <tr>
                                <th>Tx ID</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Balance Shift</th>
                                <th>Source / Reason</th>
                                <th>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {userTransactions.map((tx) => (
                                <tr key={tx.transactionId || tx._id}>
                                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{tx.transactionId}</td>
                                  <td>
                                    <span className={`badge-status ${tx.type === 'CREDIT' ? 'approved' : 'rejected'}`} style={{ fontSize: '0.7rem' }}>
                                      {tx.type}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 700, color: tx.type === 'CREDIT' ? '#10b981' : '#f87171' }}>
                                    {tx.type === 'CREDIT' ? '+' : '-'}{Number(tx.amount).toLocaleString()} {tx.currency}
                                  </td>
                                  <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                    {Number(tx.balanceBefore).toLocaleString()} → {Number(tx.balanceAfter).toLocaleString()}
                                  </td>
                                  <td style={{ fontSize: '0.75rem' }}>{tx.description}</td>
                                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {new Date(tx.createdAt).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Ledger Pagination */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button
                          className="btn-secondary"
                          disabled={userTxPage <= 1}
                          onClick={() => {
                            const prev = Math.max(1, userTxPage - 1);
                            setUserTxPage(prev);
                            fetchUserModalTransactions(selectedUser._id, prev);
                          }}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <span style={{ fontSize: '0.75rem', alignSelf: 'center', color: 'var(--text-muted)' }}>
                          {userTxPage} / {userTxTotalPages}
                        </span>
                        <button
                          className="btn-secondary"
                          disabled={userTxPage >= userTxTotalPages}
                          onClick={() => {
                            const next = userTxPage + 1;
                            setUserTxPage(next);
                            fetchUserModalTransactions(selectedUser._id, next);
                          }}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sub-tab 2: Withdrawals Table */}
                  {userModalTab === 'withdrawals' && (
                    <div>
                      {userWithdrawals.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          No withdrawal requests found for this user.
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table-custom">
                            <thead>
                              <tr>
                                <th>Withdrawal ID</th>
                                <th>Method</th>
                                <th>Amount</th>
                                <th>VEs Deducted</th>
                                <th>Status</th>
                                <th>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {userWithdrawals.map((w) => (
                                <tr key={w.withdrawalId || w._id}>
                                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{w.withdrawalId}</td>
                                  <td style={{ fontWeight: 600 }}>{w.method}</td>
                                  <td style={{ fontWeight: 700, color: '#10b981' }}>
                                    {w.payoutCurrency === 'INR' ? '₹' : '$'}{w.payoutAmount}
                                  </td>
                                  <td style={{ color: '#c4b5fd', fontWeight: 600 }}>
                                    {Number(w.currencyAmount).toLocaleString()} VEs
                                  </td>
                                  <td>
                                    <span className={`badge-status ${w.status.toLowerCase()}`}>
                                      {w.status}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {new Date(w.requestedAt || w.createdAt).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Withdrawals Pagination */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button
                          className="btn-secondary"
                          disabled={userWdPage <= 1}
                          onClick={() => {
                            const prev = Math.max(1, userWdPage - 1);
                            setUserWdPage(prev);
                            fetchUserModalWithdrawals(selectedUser._id, prev);
                          }}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <span style={{ fontSize: '0.75rem', alignSelf: 'center', color: 'var(--text-muted)' }}>
                          {userWdPage} / {userWdTotalPages}
                        </span>
                        <button
                          className="btn-secondary"
                          disabled={userWdPage >= userWdTotalPages}
                          onClick={() => {
                            const next = userWdPage + 1;
                            setUserWdPage(next);
                            fetchUserModalWithdrawals(selectedUser._id, next);
                          }}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <button className="btn-secondary" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: WITHDRAWAL DETAILS & AUDIT TRAIL */}
      {/* ======================================================== */}
      {selectedWithdrawal && (
        <div className="modal-overlay" onClick={() => setSelectedWithdrawal(null)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowRightLeft size={20} color="#8b5cf6" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Withdrawal Request Audit Details
                </h3>
              </div>
              <button onClick={() => setSelectedWithdrawal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Summary Header */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Withdrawal ID</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem' }}>{selectedWithdrawal.withdrawal.withdrawalId}</div>
                  <div style={{ marginTop: '0.25rem' }}>
                    <span className={`badge-status ${selectedWithdrawal.withdrawal.status.toLowerCase()}`}>
                      {selectedWithdrawal.withdrawal.status}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>User / Account</div>
                  <div style={{ fontWeight: 600 }}>{selectedWithdrawal.withdrawal.userId?.name || 'User'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedWithdrawal.withdrawal.userId?.email || 'N/A'}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payout Amount</div>
                  <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.2rem' }}>
                    {selectedWithdrawal.withdrawal.payoutCurrency === 'INR' ? '₹' : '$'}{selectedWithdrawal.withdrawal.payoutAmount}
                  </div>
                  <div style={{ color: '#c4b5fd', fontSize: '0.8rem', fontWeight: 600 }}>
                    {Number(selectedWithdrawal.withdrawal.currencyAmount).toLocaleString()} VEs Deducted
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recipient (Masked)</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {selectedWithdrawal.withdrawal.payoutDetails?.maskedUpiId ||
                      selectedWithdrawal.withdrawal.payoutDetails?.maskedEmail ||
                      selectedWithdrawal.withdrawal.payoutDetails?.upiId ||
                      selectedWithdrawal.withdrawal.payoutDetails?.email ||
                      'N/A'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Method: {selectedWithdrawal.withdrawal.method}
                  </div>
                </div>
              </div>

              {/* Linked Ledger Record */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#c4b5fd', marginBottom: '0.5rem' }}>
                  Linked Transaction Ledger Record
                </h4>
                {selectedWithdrawal.transaction ? (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Transaction ID</div>
                      <div style={{ fontFamily: 'monospace' }}>{selectedWithdrawal.transaction.transactionId}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Balance Before</div>
                      <div>{Number(selectedWithdrawal.transaction.balanceBefore).toLocaleString()} VEs</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Balance After</div>
                      <div>{Number(selectedWithdrawal.transaction.balanceAfter).toLocaleString()} VEs</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Type & Source</div>
                      <div>{selectedWithdrawal.transaction.type} ({selectedWithdrawal.transaction.source})</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No direct ledger record link available.</div>
                )}
              </div>

              {/* Audit Trail Timeline */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ec4899', marginBottom: '0.5rem' }}>
                  Audit Trail & State History
                </h4>
                {!selectedWithdrawal.auditLogs || selectedWithdrawal.auditLogs.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No audit events found for this request.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedWithdrawal.auditLogs.map((log) => (
                      <div key={log.auditId || log._id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                        <div>
                          <span style={{ fontWeight: 700, color: '#c4b5fd' }}>{log.action}</span>
                          <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>
                            by {log.actorId?.name || 'User'} ({log.actorId?.email || 'N/A'})
                          </span>
                          {log.metadata?.reason && (
                            <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '2px' }}>
                              Reason: {log.metadata.reason}
                            </div>
                          )}
                          {log.metadata?.reviewNote && (
                            <div style={{ color: '#10b981', fontSize: '0.75rem', marginTop: '2px' }}>
                              Note: {log.metadata.reviewNote}
                            </div>
                          )}
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <div>
                {(selectedWithdrawal.withdrawal.status === 'PENDING' || selectedWithdrawal.withdrawal.status === 'PROCESSING') && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn-success"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      onClick={() => {
                        setApprovingId(selectedWithdrawal.withdrawal.withdrawalId);
                        setApprovalNote('Approved via Admin Portal');
                      }}
                    >
                      <Check size={14} /> Approve Payout
                    </button>
                    <button
                      className="btn-danger"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      onClick={() => {
                        setRejectingId(selectedWithdrawal.withdrawal.withdrawalId);
                        setRejectReason('Beneficiary account details unverified');
                      }}
                    >
                      <X size={14} /> Reject & Refund
                    </button>
                  </div>
                )}
              </div>

              <button className="btn-secondary" onClick={() => setSelectedWithdrawal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: APPROVE CONFIRMATION */}
      {/* ======================================================== */}
      {approvingId && (
        <div className="modal-overlay" onClick={() => setApprovingId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Confirm Withdrawal Approval
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              You are about to approve withdrawal <strong style={{ fontFamily: 'monospace' }}>{approvingId}</strong>. The payout transaction will be marked APPROVED and preserved in audit records.
            </p>

            <div className="form-group">
              <label className="form-label">Review Note (Optional)</label>
              <textarea
                className="form-input"
                rows={2}
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="btn-secondary" onClick={() => setApprovingId(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button className="btn-success" onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: REJECT & REFUND CONFIRMATION */}
      {/* ======================================================== */}
      {rejectingId && (
        <div className="modal-overlay" onClick={() => setRejectingId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Confirm Rejection & Safe Refund Reversal
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Rejecting withdrawal <strong style={{ fontFamily: 'monospace' }}>{rejectingId}</strong> will immediately execute an atomic ledger refund reversal. The deducted VEs will be safely returned to the user's wallet via a new CREDIT record.
            </p>

            <div className="form-group">
              <label className="form-label">
                Mandatory Rejection Reason <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Specify the clear reason for rejection (e.g. invalid UPI handle, mismatched account name)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="btn-secondary" onClick={() => setRejectingId(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleReject} disabled={actionLoading}>
                {actionLoading ? 'Processing Reversal...' : 'Confirm Rejection & Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: WALLET ADJUSTMENT CONFIRMATION */}
      {/* ======================================================== */}
      {confirmAdjustment && (
        <div className="modal-overlay" onClick={() => setConfirmAdjustment(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Confirm Wallet {confirmAdjustment.type.toUpperCase()} Adjustment
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Please review the financial parameters before committing this modification to the database:
            </p>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target User:</span>
                <span style={{ fontWeight: 600 }}>{confirmAdjustment.userId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Operation:</span>
                <span style={{ fontWeight: 700, color: confirmAdjustment.type === 'credit' ? '#10b981' : '#ef4444' }}>
                  {confirmAdjustment.type.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
                <span style={{ fontWeight: 700, color: '#c4b5fd' }}>
                  {confirmAdjustment.amount} {confirmAdjustment.currency}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reason:</span>
                <span style={{ fontStyle: 'italic', maxWidth: '60%', textAlign: 'right' }}>{confirmAdjustment.reason}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setConfirmAdjustment(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button
                className={confirmAdjustment.type === 'credit' ? 'btn-success' : 'btn-danger'}
                onClick={executeAdjustment}
                disabled={actionLoading}
              >
                {actionLoading ? 'Executing Mutation...' : `Confirm & Commit ${confirmAdjustment.type.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
